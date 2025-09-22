/**
 * Page Orchestration Component
 *
 * This component lives in _components because it handles:
 * - Page structure and layout decisions
 * - Data fetching coordination (what to prefetch)
 * - Loading state management
 * - Error boundary setup
 * - Authentication-based rendering logic
 *
 * Notice: All business logic components (Posts, LatestPost, etc.)
 * are imported from the features folder. This component only
 * orchestrates how they work together.
 *
 * Pattern Benefits:
 * - Clear separation between layout and business logic
 * - Easy to understand page structure at a glance
 * - Reusable feature components across different pages
 * - Centralized data fetching strategy per page
 */
import { auth } from "~/server/auth";
import { LoginPage } from "./LoginPage";
import { InboxLayout } from "./InboxLayout";


export async function HomePageContent() {
  const session = await auth();

  if (!session) {
    return <LoginPage />;
  }

  return (
    <InboxLayout 
      userName={session.user?.name ?? undefined}
      userImage={session.user?.image ?? undefined}
    />
  );
}
