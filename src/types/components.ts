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
};

export type EmailListProps = {
  emails?: Email[];
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
