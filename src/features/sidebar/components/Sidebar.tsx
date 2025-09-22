import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";

/**
 * Sidebar Component
 * 
 * This component handles:
 * - Navigation menu items (Inbox, Snoozed, Done, Trash)
 * - User sign out functionality
 * - Gmail branding
 * 
 * Benefits:
 * - Reusable across different layouts
 * - Centralized navigation logic
 * - Easy to extend with new menu items
 */
export function Sidebar() {
  return (
    <div className="w-64 border-r border-gray-200 bg-white">
      <div className="p-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Gmail</h1>
          <Link
            href="/api/auth/signout"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Sign out
          </Link>
        </div>

        <nav className="space-y-1">
          <Button variant="secondary" className="w-full justify-start" size="sm">
            <Image 
              src="/icons/inbox.svg" 
              alt="Inbox" 
              width={20} 
              height={20} 
              className="mr-3"
            />
            Inbox
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Image 
              src="/icons/snoozed.svg" 
              alt="Snoozed" 
              width={20} 
              height={20} 
              className="mr-3"
            />
            Snoozed
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Image 
              src="/icons/done.svg" 
              alt="Done" 
              width={20} 
              height={20} 
              className="mr-3"
            />
            Done
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Image 
              src="/icons/trash.svg" 
              alt="Trash" 
              width={20} 
              height={20} 
              className="mr-3"
            />
            Trash
          </Button>
        </nav>
      </div>
    </div>
  );
}
