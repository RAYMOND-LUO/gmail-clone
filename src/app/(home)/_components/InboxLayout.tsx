import { Sidebar } from "~/features/sidebar/components/Sidebar";
import { Header } from "~/features/header/components/Header";
import { EmailList } from "~/features/email/components/EmailList";
import type { InboxLayoutProps } from "~/types/components";

export async function InboxLayout({ userName, userImage }: InboxLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 sticky top-0 self-start h-screen">
        <Sidebar />
      </aside>

      {/* Main column becomes the scroller */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
        {/* Header sticks to top of this scroll container */}
        <div className="sticky top-0 z-20 bg-gray-50">
          <Header userName={userName} userImage={userImage} />
        </div>

        {/* Content scrolls under the sticky header */}
        <EmailList />
      </div>
    </div>
  );
}
