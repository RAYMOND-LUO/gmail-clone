import Link from "next/link";

import { Button } from "~/components/ui/button";

/**
 * Sidebar Component
 * 
 * This component handles:
 * - Compose button
 * - Navigation menu items (Inbox, Starred, Snoozed, etc.)
 * - User sign out functionality
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
        {/* Gmail Logo and Menu */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          <div className="text-2xl font-bold text-red-500">Gmail</div>
        </div>

        {/* Compose Button */}
        <Button className="w-full justify-start mb-6 bg-blue-600 hover:bg-blue-700 text-white">
          <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Compose
        </Button>

        {/* Navigation */}
        <nav className="space-y-1">
          <Button variant="secondary" className="w-full justify-start" size="sm">
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Inbox
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Starred
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Snoozed
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Sent
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Drafts
          </Button>
        </nav>

        {/* Sign out link */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <Link
            href="/api/auth/signout"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}
