import type { EmailMessage } from "@prisma/client";

/**
 * Gmail Service Interface
 * 
 * Defines the contract for Gmail-related operations
 * Enables easy mocking for tests and multiple implementations
 */
export interface GmailService {
  syncUserEmails(userId: string, maxPages?: number, messagesPerPage?: number): Promise<SyncResult>;
  syncUserEmailsWithPagination(userId: string, pageSize?: number, continueInBackground?: boolean): Promise<PaginatedSyncResult>;
  syncAllUsersEmails(): Promise<AllUsersSyncResult>;
  syncUserEmailsDelta(userId: string, maxMessages?: number): Promise<SyncResult>;
  syncUserEmailsByHistory(userId: string, startHistoryId: string): Promise<SyncResult>;
  getAllEmails(): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } })[]>;
  getUserEmails(userId: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } })[]>;
  getUserEmailsPaginated(userId: string, page: number, limit: number): Promise<PaginatedEmailResult>;
  getEmailById(id: string): Promise<(EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } }) | null>;
  getInboxTotalCount(userId: string): Promise<number>;
}

export interface SyncResult {
  synced: number;
  errors: number;
  totalPages: number;
}

export interface PaginatedSyncResult {
  synced: number;
  errors: number;
  totalInbox: number;
  pageSize: number;
  backgroundTaskStarted: boolean;
}

export interface AllUsersSyncResult {
  totalUsers: number;
  totalSynced: number;
  totalErrors: number;
  totalPages: number;
}

export interface PaginatedEmailResult {
  emails: (EmailMessage & { thread: { isRead: boolean; isStarred: boolean; isImportant: boolean } })[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GmailApiError extends Error {
  response?: {
    status?: number;
    headers?: Record<string, string>;
  };
}

export interface GmailClient {
  users: {
    messages: {
      list: (params: { userId: string; maxResults: number; pageToken?: string; labelIds?: string[] }) => Promise<{
        data: {
          messages?: Array<{ id: string }>;
          nextPageToken?: string;
          resultSizeEstimate?: number;
        };
      }>;
      get: (params: { userId: string; id: string; format: string }) => Promise<{
        data: GmailMessage;
      }>;
    };
    labels: {
      get: (params: { userId: string; id: string }) => Promise<{
        data: {
          id: string;
          name: string;
          messagesTotal?: number;
          messagesUnread?: number;
          threadsTotal?: number;
          threadsUnread?: number;
        };
      }>;
    };
    history: {
      list: (params: { userId: string; startHistoryId: string; historyTypes?: string[] }) => Promise<{
        data: {
          history?: Array<{
            id: string;
            messages?: Array<{ id: string }>;
            messagesAdded?: Array<{ message: { id: string } }>;
            messagesDeleted?: Array<{ message: { id: string } }>;
            labelsAdded?: Array<{ message: { id: string } }>;
            labelsRemoved?: Array<{ message: { id: string } }>;
          }>;
          nextPageToken?: string;
        };
      }>;
    };
  };
}

export interface OAuth2Client {
  setCredentials: (credentials: { access_token: string; refresh_token: string }) => void;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  labelIds?: string[];  // Added labelIds to check for UNREAD, STARRED, etc.
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
