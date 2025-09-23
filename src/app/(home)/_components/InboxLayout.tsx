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
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header userName={userName} userImage={userImage} />
        <EmailList emails={emails} />
      </div>
    </div>
  );
}
