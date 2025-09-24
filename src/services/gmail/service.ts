import type { PrismaClient, EmailMessage } from "@prisma/client";
import { google } from "googleapis";

/**
 * Gmail Service Interface
 * 
 * Defines the contract for Gmail-related operations
 * Enables easy mocking for tests and multiple implementations
 */
export interface GmailService {
  syncUserEmails(userId: string, maxPages?: number, messagesPerPage?: number): Promise<SyncResult>;
  syncAllUsersEmails(): Promise<AllUsersSyncResult>;
  getAllEmails(): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean } })[]>;
  getUserEmails(userId: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean } })[]>;
  getEmailById(id: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean } }) | null>;
}

export interface SyncResult {
  synced: number;
  errors: number;
  totalPages: number;
}

export interface AllUsersSyncResult {
  totalUsers: number;
  totalSynced: number;
  totalErrors: number;
  totalPages: number;
}

interface GmailApiError extends Error {
  response?: {
    status?: number;
    headers?: Record<string, string>;
  };
}

interface GmailClient {
  users: {
    messages: {
      list: (params: { userId: string; maxResults: number; pageToken?: string }) => Promise<{
        data: {
          messages?: Array<{ id: string }>;
          nextPageToken?: string;
        };
      }>;
      get: (params: { userId: string; id: string; format: string }) => Promise<{
        data: GmailMessage;
      }>;
    };
  };
}

interface OAuth2Client {
  setCredentials: (credentials: { access_token: string; refresh_token: string }) => void;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
      attachmentId?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: { data?: string; attachmentId?: string };
      headers?: Array<{ name: string; value: string }>;
      parts?: Array<{
        mimeType: string;
        body: { data?: string; attachmentId?: string };
        headers?: Array<{ name: string; value: string }>;
      }>;
    }>;
  };
  snippet: string;
}

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
        
        // Process messages in a transaction for data consistency
        await this.db.$transaction(async (tx) => {
          for (const message of messages) {
            try {
              const headers = this.parseEmailHeaders(message.payload.headers);
              const body = this.extractEmailBody(message.payload);
              
              let thread = await tx.emailThread.findFirst({
                where: {
                  userId,
                  gmailThreadId: message.threadId,
                },
              });

              thread ??= await tx.emailThread.create({
                data: {
                  userId,
                  gmailThreadId: message.threadId,
                  subject: headers.subject,
                  lastMessageAt: new Date(parseInt(message.internalDate)),
                  snippet: message.snippet,
                },
              });

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
        
      } while (nextPageToken && pageCount < maxPages);

      // Update sync state in a separate transaction
      await this.db.$transaction(async (tx) => {
        await tx.gmailSyncState.upsert({
          where: {
            userId_provider_email: {
              userId,
              provider: 'google',
              email: 'user@gmail.com', // TODO: Get actual email from user
            },
          },
          create: {
            userId,
            provider: 'google',
            email: 'user@gmail.com',
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
  async getAllEmails(): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean } })[]> {
    return this.db.emailMessage.findMany({
      include: {
        thread: {
          select: {
            isRead: true,
            isStarred: true,
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
  async getUserEmails(userId: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean } })[]> {
    return this.db.emailMessage.findMany({
      where: {
        userId,
      },
      include: {
        thread: {
          select: {
            isRead: true,
            isStarred: true,
          },
        },
      },
      orderBy: {
        internalDate: 'desc',
      },
    });
  }

  /**
   * Get a specific email by ID
   */
  async getEmailById(id: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean } }) | null> {
    return this.db.emailMessage.findUnique({
      where: {
        id,
      },
      include: {
        thread: {
          select: {
            isRead: true,
            isStarred: true,
          },
        },
      },
    });
  }
}

/**
 * Factory function for creating GmailService instances
 * This is the dependency injection entry point
 */
export const getGmailService = (db: PrismaClient): GmailService => {
  return new GmailServiceImpl(db);
};
