"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";

import { Button } from "~/components/ui/button";

export function Sidebar() {
  return (
    <div className="w-[256px] flex flex-shrink-0 bg-[#f8fafe]">
      <div className="p-4">
        {/* Gmail Logo and Menu */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
            </svg>
          </Button>
          <Image src="/gmail_logo.png" alt="Gmail logo" width={109} height={40} />
        </div>

        {/* Compose Button */}
        <Button
          className="flex items-center justify-start mb-6 w-[142px] h-[56px] bg-[#c2e7ff] text-black cursor-pointer hover:bg-[#9ecdec] hover:text-black"
        >
          <svg className="mr-2 ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Compose
        </Button>

        {/* Navigation */}
        <nav className="space-y-1">
          <Button variant="secondary" className="w-full justify-start bg-[#d4e3fd] hover:bg-[#cbe4f5]" size="sm">
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
            <Image 
              src="/important.png" 
              alt="Important" 
              width={16}
              height={16}
              className="ml-[-2px] mr-3 h-4 w-4" 
            />
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
        <div className="flex w-full mt-8 pt-4 border-t border-gray-200">
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="ghost"
            className="text-md mx-auto bg-white text-gray-600 hover:text-gray-800"
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
