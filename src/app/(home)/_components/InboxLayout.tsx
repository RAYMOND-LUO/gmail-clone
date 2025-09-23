import { Sidebar } from "~/features/sidebar/components/Sidebar";
import { Header } from "~/features/header/components/Header";
import { EmailList } from "~/features/email/components/EmailList";
import type { InboxLayoutProps } from "~/types/components";

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
