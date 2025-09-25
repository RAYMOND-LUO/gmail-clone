import type { PrismaClient, EmailMessage } from "@prisma/client";
import { google } from "googleapis";
import type { 
  GmailService, 
  SyncResult, 
  PaginatedSyncResult, 
  AllUsersSyncResult, 
  PaginatedEmailResult, 
  GmailApiError,
  GmailClient,
  OAuth2Client,
  GmailMessage
} from "~/types/gmail";


/**
 * Gmail Service Implementation
 * 
 * Handles Gmail API operations with proper dependency injection
 * Uses googleapis library for token refresh and rate limiting
 */
export class GmailServiceImpl implements GmailService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Get authenticated Gmail client for user
   */
  private async getGmailClient(userId: string): Promise<{ gmail: GmailClient; oauth2Client: OAuth2Client }> {
    const account = await this.db.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    if (!account?.access_token) {
      throw new Error(`No Google access token found for user ${userId}. Please re-authenticate.`);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.AUTH_GOOGLE_ID,
      process.env.AUTH_GOOGLE_SECRET,
      process.env.AUTH_URL + "/api/auth/callback/google"
    );

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token ?? undefined,
    });

    // Persist refreshed tokens when googleapis auto-refreshes
    oauth2Client.on("tokens", (tokens) => {
      this.db.account.update({
        where: { 
          provider_providerAccountId: { 
            provider: "google", 
            providerAccountId: account.providerAccountId 
          } 
        },
        data: {
          access_token: tokens.access_token ?? account.access_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
          refresh_token: tokens.refresh_token ?? account.refresh_token,
          scope: tokens.scope ?? account.scope,
        },
      }).catch(console.error);
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    return { gmail: gmail as GmailClient, oauth2Client };
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        if (attempt === maxRetries) throw error;
        
        const gmailError = error as GmailApiError;
        const isRateLimit = gmailError?.response?.status === 429;
        const isServerError = (gmailError?.response?.status ?? 0) >= 500;
        
        if (!isRateLimit && !isServerError) throw error;
        
        const retryAfter = gmailError?.response?.headers?.['retry-after'];
        const delay = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : baseDelay * Math.pow(2, attempt);
        
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Fetch message IDs with pagination
   */
  private async fetchMessageIds(
    gmail: GmailClient,
    maxResults = 100,
    pageToken?: string
  ): Promise<{ messageIds: string[]; nextPageToken?: string }> {
    return this.retryWithBackoff(async () => {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
      });

      return {
        messageIds: response.data.messages?.map((m) => m.id) ?? [],
        nextPageToken: response.data.nextPageToken,
      };
    });
  }

  /**
   * Fetch multiple messages in batches
   */
  private async fetchMessagesBatch(
    gmail: GmailClient,
    messageIds: string[],
    batchSize = 10
  ): Promise<GmailMessage[]> {
    const results: GmailMessage[] = [];
    
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(messageId =>
        this.retryWithBackoff(async () => {
          const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
          });
          return response.data;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Parse email headers into structured data
   */
  private parseEmailHeaders(headers: Array<{ name: string; value: string }>) {
    const headerMap = new Map(headers.map(h => [h.name.toLowerCase(), h.value]));
    
    return {
      from: headerMap.get('from') ?? '',
      to: headerMap.get('to') ?? '',
      cc: headerMap.get('cc') ?? '',
      bcc: headerMap.get('bcc') ?? '',
      subject: headerMap.get('subject') ?? '',
      date: headerMap.get('date') ?? '',
    };
  }

  /**
   * Extract email body content from Gmail message
   */
  private extractEmailBody(payload: GmailMessage['payload']): { html?: string; text?: string } {
    let html = '';
    let text = '';

    const extractFromParts = (parts: Array<{
      mimeType: string;
      body: { data?: string; attachmentId?: string };
      headers?: Array<{ name: string; value: string }>;
      parts?: Array<{
        mimeType: string;
        body: { data?: string; attachmentId?: string };
        headers?: Array<{ name: string; value: string }>;
      }>;
    }>): { html: string; text: string } => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          html = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          text = Buffer.from(part.body.data, 'base64').toString();
        }
        
        if (part.parts) {
          const nested = extractFromParts(part.parts);
          html = html || nested.html;
          text = text || nested.text;
        }
      }
      return { html, text };
    };

    if (payload.parts) {
      return extractFromParts(payload.parts);
    }

    if (payload.body?.data) {
      if (payload.headers?.some((h) => h.name.toLowerCase() === 'content-type' && h.value.includes('html'))) {
        html = Buffer.from(payload.body.data, 'base64').toString();
      } else {
        text = Buffer.from(payload.body.data, 'base64').toString();
      }
    }

    return { html, text };
  }

  /**
   * Sync emails for a specific user with pagination
   */
  async syncUserEmails(
    userId: string,
    maxPages = 5,
    messagesPerPage = 100
  ): Promise<SyncResult> {
    console.log(`Starting email sync for user ${userId}`);

    try {
      const { gmail } = await this.getGmailClient(userId);
      let totalSynced = 0;
      let totalErrors = 0;
      let pageCount = 0;
      let nextPageToken: string | undefined;
      const allMessages: GmailMessage[] = [];

      // Step 1: Fetch all messages from Gmail API (outside transaction)
      do {
        pageCount++;
        console.log(`Fetching page ${pageCount}/${maxPages}`);

        const { messageIds, nextPageToken: newNextPageToken } = await this.fetchMessageIds(
          gmail,
          messagesPerPage,
          nextPageToken
        );

        nextPageToken = newNextPageToken;

        if (messageIds.length === 0) break;

        const messages = await this.fetchMessagesBatch(gmail, messageIds);
        allMessages.push(...messages);

      } while (nextPageToken && pageCount < maxPages);

      console.log(`Fetched ${allMessages.length} messages from Gmail, now processing...`);

      // Step 2: Process messages in smaller batches with separate transactions
      const BATCH_SIZE = 10; // Process 10 messages per transaction to avoid timeout

      for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
        const messageBatch = allMessages.slice(i, Math.min(i + BATCH_SIZE, allMessages.length));

        // Use a shorter transaction for each batch
        await this.db.$transaction(
          async (tx) => {
            for (const message of messageBatch) {
              try {
                const headers = this.parseEmailHeaders(message.payload.headers);
                const body = this.extractEmailBody(message.payload);

                // Check if message is unread or starred based on Gmail labels
                const isUnread = message.labelIds?.includes('UNREAD') ?? false;
                const isStarred = message.labelIds?.includes('STARRED') ?? false;

                let thread = await tx.emailThread.findFirst({
                  where: {
                    userId,
                    gmailThreadId: message.threadId,
                  },
                });

                if (thread) {
                  // Update existing thread's read/starred status
                  thread = await tx.emailThread.update({
                    where: { id: thread.id },
                    data: {
                      isRead: !isUnread,  // If UNREAD label is present, isRead should be false
                      isStarred: isStarred,
                      lastMessageAt: new Date(parseInt(message.internalDate)),
                      snippet: message.snippet,
                    },
                  });
                } else {
                  // Create new thread with read/starred status
                  thread = await tx.emailThread.create({
                    data: {
                      userId,
                      gmailThreadId: message.threadId,
                      subject: headers.subject,
                      lastMessageAt: new Date(parseInt(message.internalDate)),
                      snippet: message.snippet,
                      isRead: !isUnread,  // If UNREAD label is present, isRead should be false
                      isStarred: isStarred,
                    },
                  });
                }

                await tx.emailMessage.upsert({
                  where: {
                    userId_gmailMessageId: {
                      userId,
                      gmailMessageId: message.id,
                    },
                  },
                  create: {
                    userId,
                    threadId: thread.id,
                    gmailMessageId: message.id,
                    internalDate: new Date(parseInt(message.internalDate)),
                    from: headers.from,
                    to: headers.to,
                    cc: headers.cc,
                    bcc: headers.bcc,
                    subject: headers.subject,
                    snippet: message.snippet,
                    textPlain: body.text,
                  },
                  update: {
                    snippet: message.snippet,
                    // Also update read/starred status on existing messages
                    thread: {
                      update: {
                        isRead: !isUnread,
                        isStarred: isStarred,
                      }
                    }
                  },
                });

                totalSynced++;
              } catch (error) {
                console.error(`Error syncing message ${message.id}:`, error);
                totalErrors++;
              }
            }
          },
          {
            maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
            timeout: 30000, // Maximum time for the transaction to complete (30 seconds)
          }
        );

        console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allMessages.length / BATCH_SIZE)}`);
      }

      // Get the user's Gmail address from their Account
      const account = await this.db.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
        select: { email: true },
      });

      const gmailAddress = account?.email ?? 'unknown@gmail.com';

      // Update sync state in a separate transaction
      await this.db.$transaction(async (tx) => {
        await tx.gmailSyncState.upsert({
          where: {
            userId_provider_email: {
              userId,
              provider: 'google',
              email: gmailAddress,
            },
          },
          create: {
            userId,
            provider: 'google',
            email: gmailAddress,
            lastFullSync: new Date(),
          },
          update: {
            lastFullSync: new Date(),
          },
        });
      });

      console.log(`Sync completed: ${totalSynced} synced, ${totalErrors} errors, ${pageCount} pages`);
      return { synced: totalSynced, errors: totalErrors, totalPages: pageCount };
    } catch (error) {
      console.error(`Gmail sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delta sync for a specific user (for push notifications)
   * Only syncs recent emails since last sync
   */
  async syncUserEmailsDelta(userId: string, maxMessages = 50): Promise<SyncResult> {
    console.log(`Starting delta email sync for user ${userId}`);
    
    try {
      const { gmail } = await this.getGmailClient(userId);
      let totalSynced = 0;
      let totalErrors = 0;

      // Get recent messages (last 50 by default)
      const { messageIds } = await this.fetchMessageIds(gmail, maxMessages);
      
      if (messageIds.length === 0) {
        console.log(`No new messages for user ${userId}`);
        return { synced: 0, errors: 0, totalPages: 0 };
      }
      
      console.log(`Found ${messageIds.length} recent messages for delta sync`);
      
      const messages = await this.fetchMessagesBatch(gmail, messageIds);
      
      // Process messages in a transaction for data consistency
      await this.db.$transaction(async (tx) => {
        for (const message of messages) {
          try {
            const headers = this.parseEmailHeaders(message.payload.headers);
            const body = this.extractEmailBody(message.payload);

            // Check if message is unread or starred based on Gmail labels
            const isUnread = message.labelIds?.includes('UNREAD') ?? false;
            const isStarred = message.labelIds?.includes('STARRED') ?? false;

            let thread = await tx.emailThread.findFirst({
              where: {
                userId,
                gmailThreadId: message.threadId,
              },
            });

            if (thread) {
              // Update existing thread's read/starred status
              thread = await tx.emailThread.update({
                where: { id: thread.id },
                data: {
                  isRead: !isUnread,
                  isStarred: isStarred,
                  lastMessageAt: new Date(parseInt(message.internalDate)),
                  snippet: message.snippet,
                },
              });
            } else {
              // Create new thread with read/starred status
              thread = await tx.emailThread.create({
                data: {
                  userId,
                  gmailThreadId: message.threadId,
                  subject: headers.subject,
                  lastMessageAt: new Date(parseInt(message.internalDate)),
                  snippet: message.snippet,
                  isRead: !isUnread,
                  isStarred: isStarred,
                },
              });
            }

            await tx.emailMessage.upsert({
              where: {
                userId_gmailMessageId: {
                  userId,
                  gmailMessageId: message.id,
                },
              },
              create: {
                userId,
                threadId: thread.id,
                gmailMessageId: message.id,
                internalDate: new Date(parseInt(message.internalDate)),
                from: headers.from,
                to: headers.to,
                cc: headers.cc,
                bcc: headers.bcc,
                subject: headers.subject,
                snippet: message.snippet,
                textPlain: body.text,
              },
              update: {
                snippet: message.snippet,
              },
            });

            totalSynced++;
          } catch (error) {
            console.error(`Error syncing message ${message.id}:`, error);
            totalErrors++;
          }
        }
      });

      // Get the user's Gmail address from their Account
      const account = await this.db.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
        select: { email: true },
      });

      const gmailAddress = account?.email ?? 'unknown@gmail.com';

      // Update delta sync timestamp
      await this.db.$transaction(async (tx) => {
        await tx.gmailSyncState.upsert({
          where: {
            userId_provider_email: {
              userId,
              provider: 'google',
              email: gmailAddress,
            },
          },
          create: {
            userId,
            provider: 'google',
            email: gmailAddress,
            lastDeltaSync: new Date(),
          },
          update: {
            lastDeltaSync: new Date(),
          },
        });
      });

      console.log(`Delta sync completed: ${totalSynced} synced, ${totalErrors} errors`);
      return { synced: totalSynced, errors: totalErrors, totalPages: 1 };
    } catch (error) {
      console.error(`Gmail delta sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sync emails using Gmail history API (true delta sync)
   * This is the proper way to handle push notifications
   */
  async syncUserEmailsByHistory(userId: string, startHistoryId: string): Promise<SyncResult> {
    console.log(`Starting history-based sync for user ${userId} from historyId: ${startHistoryId}`);
    
    try {
      const { gmail } = await this.getGmailClient(userId);
      let totalSynced = 0;
      let totalErrors = 0;

      // Get history changes since the last known historyId
      const historyResponse = await this.retryWithBackoff(async () => {
        return await gmail.users.history.list({
          userId: 'me',
          startHistoryId,
          historyTypes: ['messageAdded'], // Only get new messages, not label changes
        });
      });

      const history = historyResponse.data.history ?? [];
      console.log(`Found ${history.length} history records since ${startHistoryId}`);

      if (history.length === 0) {
        console.log(`No new messages since historyId: ${startHistoryId}`);
        return { synced: 0, errors: 0, totalPages: 0 };
      }

      // Extract all message IDs from history
      const messageIds: string[] = [];
      for (const historyRecord of history) {
        if (historyRecord.messagesAdded) {
          for (const messageAdded of historyRecord.messagesAdded) {
            if (messageAdded.message?.id) {
              messageIds.push(messageAdded.message.id);
            }
          }
        }
        // Also check for messages in the main messages array
        if (historyRecord.messages) {
          for (const message of historyRecord.messages) {
            if (message.id && !messageIds.includes(message.id)) {
              messageIds.push(message.id);
            }
          }
        }
      }

      if (messageIds.length === 0) {
        console.log(`No new message IDs found in history`);
        return { synced: 0, errors: 0, totalPages: 0 };
      }

      console.log(`Found ${messageIds.length} new messages to sync`);
      
      // Fetch and process the new messages
      const messages = await this.fetchMessagesBatch(gmail, messageIds);
      
      // Process messages in a transaction for data consistency
      await this.db.$transaction(async (tx) => {
        for (const message of messages) {
          try {
            const headers = this.parseEmailHeaders(message.payload.headers);
            const body = this.extractEmailBody(message.payload);

            // Check if message is unread or starred based on Gmail labels
            const isUnread = message.labelIds?.includes('UNREAD') ?? false;
            const isStarred = message.labelIds?.includes('STARRED') ?? false;

            let thread = await tx.emailThread.findFirst({
              where: {
                userId,
                gmailThreadId: message.threadId,
              },
            });

            if (thread) {
              // Update existing thread's read/starred status
              thread = await tx.emailThread.update({
                where: { id: thread.id },
                data: {
                  isRead: !isUnread,
                  isStarred: isStarred,
                  lastMessageAt: new Date(parseInt(message.internalDate)),
                  snippet: message.snippet,
                },
              });
            } else {
              // Create new thread with read/starred status
              thread = await tx.emailThread.create({
                data: {
                  userId,
                  gmailThreadId: message.threadId,
                  subject: headers.subject,
                  lastMessageAt: new Date(parseInt(message.internalDate)),
                  snippet: message.snippet,
                  isRead: !isUnread,
                  isStarred: isStarred,
                },
              });
            }

            await tx.emailMessage.upsert({
              where: {
                userId_gmailMessageId: {
                  userId,
                  gmailMessageId: message.id,
                },
              },
              create: {
                userId,
                threadId: thread.id,
                gmailMessageId: message.id,
                internalDate: new Date(parseInt(message.internalDate)),
                from: headers.from,
                to: headers.to,
                cc: headers.cc,
                bcc: headers.bcc,
                subject: headers.subject,
                snippet: message.snippet,
                textPlain: body.text,
              },
              update: {
                snippet: message.snippet,
              },
            });

            totalSynced++;
          } catch (error) {
            console.error(`Error syncing message ${message.id}:`, error);
            totalErrors++;
          }
        }
      });

      // Get the user's Gmail address from their Account
      const account = await this.db.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
        select: { email: true },
      });

      const gmailAddress = account?.email ?? 'unknown@gmail.com';

      // Update sync state with the new historyId
      await this.db.$transaction(async (tx) => {
        await tx.gmailSyncState.upsert({
          where: {
            userId_provider_email: {
              userId,
              provider: 'google',
              email: gmailAddress,
            },
          },
          create: {
            userId,
            provider: 'google',
            email: gmailAddress,
            historyId: startHistoryId, // Store the latest historyId
            lastDeltaSync: new Date(),
          },
          update: {
            historyId: startHistoryId, // Update with the latest historyId
            lastDeltaSync: new Date(),
          },
        });
      });

      console.log(`History sync completed: ${totalSynced} synced, ${totalErrors} errors`);
      return { synced: totalSynced, errors: totalErrors, totalPages: 1 };
    } catch (error) {
      console.error(`Gmail history sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sync emails for all users with Gmail connected
   */
  async syncAllUsersEmails(): Promise<AllUsersSyncResult> {
    console.log('Starting full email sync for all users');
    
    const users = await this.db.user.findMany({
      where: {
        accounts: {
          some: {
            provider: 'google',
          },
        },
      },
    });

    let totalSynced = 0;
    let totalErrors = 0;
    let totalPages = 0;

    for (const user of users) {
      try {
        const result = await this.syncUserEmails(user.id);
        totalSynced += result.synced;
        totalErrors += result.errors;
        totalPages += result.totalPages;
      } catch (error) {
        console.error(`Failed to sync emails for user ${user.id}:`, error);
        totalErrors++;
      }
    }

    console.log(`Full sync completed: ${users.length} users, ${totalSynced} emails synced, ${totalErrors} errors, ${totalPages} pages`);
    return {
      totalUsers: users.length,
      totalSynced,
      totalErrors,
      totalPages,
    };
  }

  /**
   * Get all emails from database
   */
  async getAllEmails(): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } })[]> {
    return this.db.emailMessage.findMany({
      include: {
        thread: {
          select: {
            isRead: true,
            isStarred: true,
            isImportant: true,
          },
        },
      },
      orderBy: {
        internalDate: 'desc',
      },
    });
  }

  /**
   * Get emails for a specific user
   */
  async getUserEmails(userId: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } })[]> {
    return this.db.emailMessage.findMany({
      where: {
        userId,
      },
      include: {
        thread: {
          select: {
            isRead: true,
            isStarred: true,
            isImportant: true,
          },
        },
      },
      orderBy: {
        internalDate: 'desc',
      },
    });
  }

  /**
   * Get emails for a specific user with pagination
   */
  async getUserEmailsPaginated(userId: string, page: number, limit: number): Promise<PaginatedEmailResult> {
    const skip = (page - 1) * limit;

    const [emails, totalCount] = await Promise.all([
      this.db.emailMessage.findMany({
        where: {
          userId,
        },
        include: {
          thread: {
            select: {
              isRead: true,
              isStarred: true,
              isImportant: true,
            },
          },
        },
        orderBy: {
          internalDate: 'desc',
        },
        skip,
        take: limit,
      }),
      this.db.emailMessage.count({
        where: {
          userId,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      emails,
      totalCount,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a specific email by ID
   */
  async getEmailById(id: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } }) | null> {
    return this.db.emailMessage.findUnique({
      where: {
        id,
      },
      include: {
        thread: {
          select: {
            isRead: true,
            isStarred: true,
            isImportant: true,
          },
        },
      },
    });
  }

  /**
   * Get total count of messages in user's inbox
   */
  async getInboxTotalCount(userId: string): Promise<number> {
    console.log(`Getting total inbox count for user ${userId}`);

    try {
      const { gmail } = await this.getGmailClient(userId);

      // Use Gmail labels API to get exact inbox count
      const response = await this.retryWithBackoff(async () => {
        return await gmail.users.labels.get({
          userId: 'me',
          id: 'INBOX',
        });
      });

      // Return the total message count in inbox
      return response.data.messagesTotal ?? 0;
    } catch (error) {
      console.error(`Failed to get inbox count for user ${userId}:`, error);
      // Fallback to a list request with minimal data
      try {
        const { gmail } = await this.getGmailClient(userId);
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 1,
          labelIds: ['INBOX'],
        });
        return response.data.resultSizeEstimate ?? 0;
      } catch (fallbackError) {
        console.error(`Fallback also failed:`, fallbackError);
        return 0;
      }
    }
  }

  /**
   * Sync emails with pagination - fetches first page immediately, rest in background
   */
  async syncUserEmailsWithPagination(
    userId: string,
    pageSize = 50,
    continueInBackground = true
  ): Promise<PaginatedSyncResult> {
    console.log(`Starting paginated email sync for user ${userId}`);

    try {
      const { gmail } = await this.getGmailClient(userId);

      // Get total inbox count first
      const totalInbox = await this.getInboxTotalCount(userId);
      console.log(`Total emails in inbox: ${totalInbox}`);

      let totalSynced = 0;
      let totalErrors = 0;
      let backgroundTaskStarted = false;

      // Step 1: Fetch first page of messages
      console.log(`Fetching first ${pageSize} messages`);
      const { messageIds, nextPageToken } = await this.fetchMessageIds(
        gmail,
        pageSize
      );

      if (messageIds.length === 0) {
        console.log('No messages found in inbox');
        return {
          synced: 0,
          errors: 0,
          totalInbox,
          pageSize,
          backgroundTaskStarted: false,
        };
      }

      // Fetch and process first page of messages
      const firstPageMessages = await this.fetchMessagesBatch(gmail, messageIds);
      console.log(`Fetched ${firstPageMessages.length} messages for first page`);

      // Process first page in a transaction
      await this.db.$transaction(
        async (tx) => {
          for (const message of firstPageMessages) {
            try {
              const headers = this.parseEmailHeaders(message.payload.headers);
              const body = this.extractEmailBody(message.payload);
              const isUnread = message.labelIds?.includes('UNREAD') ?? false;
              const isStarred = message.labelIds?.includes('STARRED') ?? false;
              const isImportant = message.labelIds?.includes('IMPORTANT') ?? false;

              let thread = await tx.emailThread.findFirst({
                where: {
                  userId,
                  gmailThreadId: message.threadId,
                },
              });

              if (thread) {
                thread = await tx.emailThread.update({
                  where: { id: thread.id },
                  data: {
                    isRead: !isUnread,
                    isStarred,
                    isImportant,
                    lastMessageAt: new Date(parseInt(message.internalDate)),
                    snippet: message.snippet,
                  },
                });
              } else {
                thread = await tx.emailThread.create({
                  data: {
                    userId,
                    gmailThreadId: message.threadId,
                    subject: headers.subject,
                    lastMessageAt: new Date(parseInt(message.internalDate)),
                    snippet: message.snippet,
                    isRead: !isUnread,
                    isStarred,
                    isImportant,
                  },
                });
              }

              await tx.emailMessage.upsert({
                where: {
                  userId_gmailMessageId: {
                    userId,
                    gmailMessageId: message.id,
                  },
                },
                create: {
                  userId,
                  threadId: thread.id,
                  gmailMessageId: message.id,
                  internalDate: new Date(parseInt(message.internalDate)),
                  from: headers.from,
                  to: headers.to,
                  cc: headers.cc,
                  bcc: headers.bcc,
                  subject: headers.subject,
                  snippet: message.snippet,
                  textPlain: body.text,
                },
                update: {
                  snippet: message.snippet,
                  thread: {
                    update: {
                      isRead: !isUnread,
                      isStarred,
                      isImportant,
                    },
                  },
                },
              });

              totalSynced++;
            } catch (error) {
              console.error(`Error syncing message ${message.id}:`, error);
              totalErrors++;
            }
          }
        },
        {
          maxWait: 10000,
          timeout: 30000,
        }
      );

      console.log(`First page synced: ${totalSynced} messages`);

      // Step 2: Continue fetching remaining messages in background if requested
      if (continueInBackground && nextPageToken) {
        backgroundTaskStarted = true;
        console.log('Starting background sync for remaining messages...');

        // Start background sync (non-blocking)
        this.syncRemainingPagesInBackground(userId, gmail, nextPageToken, pageSize).catch((error) => {
          console.error('Background sync failed:', error);
        });
      }

      return {
        synced: totalSynced,
        errors: totalErrors,
        totalInbox,
        pageSize,
        backgroundTaskStarted,
      };
    } catch (error) {
      console.error(`Paginated sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sync remaining pages in background (async, non-blocking)
   */
  private async syncRemainingPagesInBackground(
    userId: string,
    gmail: GmailClient,
    startingPageToken: string,
    messagesPerPage: number
  ): Promise<void> {
    let nextPageToken: string | undefined = startingPageToken;
    let pageCount = 1; // Already fetched first page
    const MAX_PAGES = 20; // Limit to prevent infinite loops
    const BATCH_SIZE = 10; // Process messages in batches

    try {
      while (nextPageToken && pageCount < MAX_PAGES) {
        pageCount++;
        console.log(`[Background] Fetching page ${pageCount}`);

        const { messageIds, nextPageToken: newNextPageToken } = await this.fetchMessageIds(
          gmail,
          messagesPerPage,
          nextPageToken
        );

        nextPageToken = newNextPageToken;

        if (messageIds.length === 0) break;

        // Fetch messages for this page
        const messages = await this.fetchMessagesBatch(gmail, messageIds);
        console.log(`[Background] Processing ${messages.length} messages from page ${pageCount}`);

        // Process in smaller batches to avoid long transactions
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
          const messageBatch = messages.slice(i, Math.min(i + BATCH_SIZE, messages.length));

          await this.db.$transaction(
            async (tx) => {
              for (const message of messageBatch) {
                try {
                  const headers = this.parseEmailHeaders(message.payload.headers);
                  const body = this.extractEmailBody(message.payload);
                  const isUnread = message.labelIds?.includes('UNREAD') ?? false;
                  const isStarred = message.labelIds?.includes('STARRED') ?? false;
                  const isImportant = message.labelIds?.includes('IMPORTANT') ?? false;

                  let thread = await tx.emailThread.findFirst({
                    where: {
                      userId,
                      gmailThreadId: message.threadId,
                    },
                  });

                  if (thread) {
                    thread = await tx.emailThread.update({
                      where: { id: thread.id },
                      data: {
                        isRead: !isUnread,
                        isStarred,
                        isImportant,
                        lastMessageAt: new Date(parseInt(message.internalDate)),
                        snippet: message.snippet,
                      },
                    });
                  } else {
                    thread = await tx.emailThread.create({
                      data: {
                        userId,
                        gmailThreadId: message.threadId,
                        subject: headers.subject,
                        lastMessageAt: new Date(parseInt(message.internalDate)),
                        snippet: message.snippet,
                        isRead: !isUnread,
                        isStarred,
                        isImportant,
                      },
                    });
                  }

                  await tx.emailMessage.upsert({
                    where: {
                      userId_gmailMessageId: {
                        userId,
                        gmailMessageId: message.id,
                      },
                    },
                    create: {
                      userId,
                      threadId: thread.id,
                      gmailMessageId: message.id,
                      internalDate: new Date(parseInt(message.internalDate)),
                      from: headers.from,
                      to: headers.to,
                      cc: headers.cc,
                      bcc: headers.bcc,
                      subject: headers.subject,
                      snippet: message.snippet,
                      textPlain: body.text,
                    },
                    update: {
                      snippet: message.snippet,
                      thread: {
                        update: {
                          isRead: !isUnread,
                          isStarred,
                          isImportant,
                        },
                      },
                    },
                  });
                } catch (error) {
                  console.error(`[Background] Error syncing message ${message.id}:`, error);
                }
              }
            },
            {
              maxWait: 10000,
              timeout: 30000,
            }
          );
        }

        // Small delay between pages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update sync state
      const account = await this.db.account.findFirst({
        where: { userId, provider: 'google' },
        select: { email: true },
      });

      const gmailAddress = account?.email ?? 'unknown@gmail.com';

      await this.db.$transaction(async (tx) => {
        await tx.gmailSyncState.upsert({
          where: {
            userId_provider_email: {
              userId,
              provider: 'google',
              email: gmailAddress,
            },
          },
          create: {
            userId,
            provider: 'google',
            email: gmailAddress,
            lastFullSync: new Date(),
          },
          update: {
            lastFullSync: new Date(),
          },
        });
      });

      console.log(`[Background] Sync completed for user ${userId}, processed ${pageCount} pages`);
    } catch (error) {
      console.error(`[Background] Sync error for user ${userId}:`, error);
    }
  }
}

/**
 * Factory function for creating GmailService instances
 * This is the dependency injection entry point
 */
export const getGmailService = (db: PrismaClient): GmailService => {
  return new GmailServiceImpl(db);
};
