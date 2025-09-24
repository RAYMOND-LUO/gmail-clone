"use client";

import { useEffect, useState } from "react";
import type { EmailMessage } from "@prisma/client";
import type { Email } from "~/types/components";

import { Button } from "~/components/ui/button";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EmailTabs } from "./EmailTabs";

type EmailWithThread = EmailMessage & {
  thread: {
    isRead: boolean;
    isStarred: boolean;
  };
};

/**
 * EmailList Component
 *
 * This component handles:
 * - Displaying list of emails in Gmail table format
 * - Email interaction states (read/unread, starred)
 * - Email metadata (sender, subject, snippet, time)
 */
export function EmailList({ emails = [] }: { emails?: EmailWithThread[] }) {
  const [localEmails, setLocalEmails] = useState<EmailWithThread[]>(emails);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Update local emails when props change
  useEffect(() => {
    setLocalEmails(emails);
  }, [emails]);

  // Use tRPC mutation for syncing emails
  const syncEmailsMutation = useMutation(
    trpc.email.syncUserEmails.mutationOptions({
      onSuccess: (data) => {
        // Update local state with the new emails
        if (data.emails) {
          setLocalEmails(data.emails);
        }
        // Invalidate the email queries to refresh data elsewhere
        void queryClient.invalidateQueries({
          queryKey: trpc.email.getByUser.queryKey(),
        });
      },
      onError: (error) => {
        console.error('Failed to sync emails:', error);
      }
    })
  );

  // Manual refresh function
  const refreshEmails = async () => {
    await syncEmailsMutation.mutateAsync();
  };

  // Transform EmailMessage to Email format
  const transformEmail = (email: EmailWithThread): Email => {
    const time = new Date(email.internalDate).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Extract sender name from email address
    const extractSenderName = (from: string | null): string => {
      if (!from) return "Unknown Sender";

      // If it's in format "Name <email@domain.com>", extract the name
      const nameRegex = /^(.+?)\s*<.+>$/;
      const nameMatch = nameRegex.exec(from);
      if (nameMatch) {
        return (
          nameMatch[1]?.trim().replace(/^["']|["']$/g, "") ?? "Unknown Sender"
        ); // Strip quotes
      }

      // If it's just an email, extract the part before @
      if (from.includes("@")) {
        const username = from.split("@")[0];
        return username?.replace(/^["']|["']$/g, "") ?? "Unknown Sender"; // Strip quotes
      }

      return from.replace(/^["']|["']$/g, ""); // Strip quotes from any other format
    };

    return {
      from: extractSenderName(email.from),
      subject: email.subject ?? "No Subject",
      snippet: email.snippet ?? "",
      time,
      unread: !email.thread.isRead,
      starred: email.thread.isStarred,
    };
  };

  const emailList =
    localEmails.length > 0 ? localEmails.map(transformEmail) : [];

  return (
    <div className="flex-1 rounded-2xl bg-white">
      {/* Toolbar */}
      <div className="sticky rounded-2xl top-0 z-10 flex items-center justify-between bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="mr-3 h-4 w-4 flex-shrink-0 rounded text-blue-600"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={refreshEmails}
            disabled={syncEmailsMutation.isPending}
          >
            <svg
              className={`h-4 w-4 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </Button>
        </div>
        <div className="mr-4 ml-auto text-sm text-gray-600">
          {syncEmailsMutation.isPending && <span className="mr-2 text-blue-500">Syncing emails...</span>}
          {emailList.length > 0
            ? `1-${emailList.length} of ${emailList.length}`
            : "No emails"}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Email Tabs */}
      <EmailTabs />

      {/* Email List */}
      <div className="flex-1 divide-y divide-gray-200 border-t border-neutral-200">
        {emailList.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">No emails found</p>
              <p className="text-sm">Click the refresh button to sync your emails</p>
            </div>
          </div>
        ) : (
          emailList.map((email, index) => (
          <div
            key={index}
            className={`flex h-[40px] cursor-pointer items-center border-b border-neutral-200 px-4 py-3 hover:bg-gray-50 ${
              email.unread ? "bg-blue-50" : ""
            }`}
          >
            {/* Checkbox */}
            <div className="mr-3 flex-shrink-0">
              <input
                type="checkbox"
                className="h-4 w-4 rounded text-blue-600"
              />
            </div>

            {/* Star */}
            <div className="mr-3 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <svg
                  className={`h-4 w-4 ${email.starred ? "fill-current text-yellow-400" : "text-gray-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </Button>
            </div>

            {/* Sender */}
            <div className="mr-4 w-48 min-w-0 flex-shrink-0">
              <span
                className={`block truncate text-sm ${email.unread ? "font-semibold text-gray-900" : "text-gray-700"}`}
              >
                {email.from}
              </span>
            </div>

            {/* Subject and Snippet */}
            <div className="mr-4 flex min-w-0 flex-1 items-center">
              {/* subject: do NOT let it shrink */}
              <span
                className={`text-sm ${email.unread ? "font-semibold text-gray-900" : "text-gray-700"} flex-shrink-0 truncate whitespace-nowrap overflow-hidden text-ellipsis`}
              >
                {email.subject}
              </span>

              {/* separator */}
              <span className="flex-shrink-0 px-1 text-gray-400">–</span>

              {/* snippet: takes remaining space and truncates */}
              <span className="min-w-0 flex-1 truncate text-sm text-gray-500">
                {email.snippet}
              </span>
            </div>

            {/* Time */}
            <div className="flex-shrink-0 text-right">
              <span className="text-xs text-gray-500">{email.time}</span>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}
