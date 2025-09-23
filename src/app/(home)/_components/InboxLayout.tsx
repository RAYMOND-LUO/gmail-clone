import { Sidebar } from "~/features/sidebar/components/Sidebar";
import { Header } from "~/features/header/components/Header";
import { EmailList } from "~/features/email/components/EmailList";
import type { InboxLayoutProps } from "~/types/components";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";

export async function InboxLayout({ userName, userImage }: InboxLayoutProps) {
  // Create tRPC caller for server-side usage
  const ctx = await createTRPCContext({
    headers: await headers(),
  });
  const caller = createCaller(ctx);
  
  // Fetch emails for the current user
  const emails = await caller.email.getByUser();

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
        <EmailList emails={emails} />
      </div>
    </div>
  );
}
