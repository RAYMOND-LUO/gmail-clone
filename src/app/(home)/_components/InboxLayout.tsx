import { Sidebar } from "~/features/sidebar/components/Sidebar";
import { Header } from "~/features/header/components/Header";
import { EmailList } from "~/features/email/components/EmailList";

interface InboxLayoutProps {
  userName?: string;
  userImage?: string;
}

/**
 * InboxLayout Component
 * 
 * This is a page orchestration component that handles:
 * - Page structure and layout for the inbox
 * - Data fetching coordination (user data, emails)
 * - Loading states management
 * - Error boundaries setup
 * 
 * This component lives in _components because it handles page-level concerns
 * and orchestrates the complete inbox experience by combining feature components.
 */
export function InboxLayout({ userName, userImage }: InboxLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-1 flex-col">
        <Header userName={userName} userImage={userImage} />
        <EmailList />
      </div>
    </div>
  );
}
