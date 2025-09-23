import { db } from "~/server/db";
import { google } from "googleapis";

/**
 * Gmail Sync Service
 * 
 * Handles syncing emails from Gmail API to our database
 * Uses googleapis library for proper token refresh and rate limiting
 * Supports pagination, batched concurrency, and retry logic
 */

export interface GmailSyncResult {
  messages: GmailMessage[];
  nextPageToken?: string;
  totalMessages: number;
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
    }>;
  };
  snippet: string;
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

/**
 * Get authenticated Gmail client for user
 */
async function getGmailClient(userId: string): Promise<{ gmail: GmailClient; oauth2Client: OAuth2Client }> {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account?.access_token || !account?.refresh_token) {
    throw new Error(`No Google tokens found for user ${userId}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
    process.env.AUTH_URL + "/api/auth/callback/google"
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // This will automatically refresh the token if needed
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  return { gmail: gmail as GmailClient, oauth2Client };
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
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
async function fetchMessageIds(
  gmail: GmailClient,
  maxResults = 100,
  pageToken?: string
): Promise<{ messageIds: string[]; nextPageToken?: string }> {
  return retryWithBackoff(async () => {
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
async function fetchMessagesBatch(
  gmail: GmailClient,
  messageIds: string[],
  batchSize = 10
): Promise<GmailMessage[]> {
  const results: GmailMessage[] = [];
  
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    
    const batchPromises = batch.map(messageId =>
      retryWithBackoff(async () => {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full', // Get full message with headers
        });
        return response.data;
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < messageIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Parse email headers into structured data
 */
function parseEmailHeaders(headers: Array<{ name: string; value: string }>) {
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
function extractEmailBody(payload: GmailMessage['payload']): { html?: string; text?: string } {
  let html = '';
  let text = '';

  function extractFromParts(parts: Array<{
    mimeType: string;
    body: { data?: string; attachmentId?: string };
    headers?: Array<{ name: string; value: string }>;
    parts?: Array<{
      mimeType: string;
      body: { data?: string; attachmentId?: string };
      headers?: Array<{ name: string; value: string }>;
    }>;
  }>): { html: string; text: string } {
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
  }

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
export async function syncUserEmails(
  userId: string,
  maxPages = 5,
  messagesPerPage = 100
): Promise<{ synced: number; errors: number; totalPages: number }> {
  console.log(`Starting email sync for user ${userId}`);
  
  try {
    const { gmail } = await getGmailClient(userId);
    let totalSynced = 0;
    let totalErrors = 0;
    let pageCount = 0;
    let nextPageToken: string | undefined;

    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}/${maxPages}`);
      
      // Fetch message IDs for this page
      const { messageIds, nextPageToken: newNextPageToken } = await fetchMessageIds(
        gmail,
        messagesPerPage,
        nextPageToken
      );
      
      nextPageToken = newNextPageToken;
      
      if (messageIds.length === 0) break;
      
      // Fetch full messages in batches
      const messages = await fetchMessagesBatch(gmail, messageIds);
      
      // Process each message
      for (const message of messages) {
        try {
          const headers = parseEmailHeaders(message.payload.headers);
          const body = extractEmailBody(message.payload);
          
          // Find or create thread
          let thread = await db.emailThread.findFirst({
            where: {
              userId,
              gmailThreadId: message.threadId,
            },
          });

          thread ??= await db.emailThread.create({
            data: {
              userId,
              gmailThreadId: message.threadId,
              subject: headers.subject,
              lastMessageAt: new Date(parseInt(message.internalDate)),
              snippet: message.snippet,
            },
          });

          // Create or update message
          await db.emailMessage.upsert({
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
              // TODO: Store HTML content in S3 and save key
              // htmlS3Key: await storeHtmlInS3(body.html),
            },
            update: {
              snippet: message.snippet,
              // Update other fields if needed
            },
          });

          totalSynced++;
        } catch (error) {
          console.error(`Error syncing message ${message.id}:`, error);
          totalErrors++;
        }
      }
      
    } while (nextPageToken && pageCount < maxPages);

    // Update sync state
    await db.gmailSyncState.upsert({
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
        email: 'user@gmail.com', // TODO: Get actual email
        lastFullSync: new Date(),
      },
      update: {
        lastFullSync: new Date(),
      },
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
export async function syncAllUsersEmails(): Promise<{ 
  totalUsers: number; 
  totalSynced: number; 
  totalErrors: number;
  totalPages: number;
}> {
  console.log('Starting full email sync for all users');
  
  const users = await db.user.findMany({
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
      const result = await syncUserEmails(user.id);
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