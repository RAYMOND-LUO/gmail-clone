// Layout Components
export type InboxLayoutProps = {
  userName?: string;
  userImage?: string;
};

export type HeaderProps = {
  userName?: string;
  userImage?: string;
};

// Email Components
export type Email = {
  from: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  starred?: boolean;
  important?: boolean;
};

export type EmailListProps = {
  emails?: Email[];
};

// Email with Thread type for tRPC queries
export type EmailWithThread = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  from: string | null;
  to: string | null;
  cc: string | null;
  bcc: string | null;
  subject: string | null;
  snippet: string | null;
  threadId: string;
  gmailMessageId: string;
  internalDate: Date;
  rawS3Key: string | null;
  htmlS3Key: string | null;
  textPlain: string | null;
  thread: {
    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;
  };
};

// Paginated email result type for tRPC queries
export type PaginatedEmailResult = {
  emails: EmailWithThread[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Shared Components
export type ReusableErrorBoundaryProps = {
  fallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  children: React.ReactNode;
};

export type AwaitProps<T> = {
  promise: Promise<T>;
  children: (value: T) => React.ReactNode;
  fallback?: React.ReactNode;
};

export type AwaitResultProps<T> = {
  value: T;
  children: (value: T) => React.ReactNode;
};
