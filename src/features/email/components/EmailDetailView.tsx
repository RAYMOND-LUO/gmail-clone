"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "~/features/shared/components/ui/button";
import { useTRPC } from "~/trpc/react";
import type { EmailWithHtml } from "~/types/gmail";

interface EmailDetailViewProps {
  emailId: string;
  onBack: () => void;
}

/**
 * EmailDetailView Component
 *
 * This component handles:
 * - Displaying full email content with HTML rendering
 * - Email metadata (sender, subject, date, etc.)
 * - Back navigation to email list
 * - Safe HTML rendering with proper sanitization
 */
export function EmailDetailView({ emailId, onBack }: EmailDetailViewProps) {
  const trpc = useTRPC();

  // Fetch email with HTML content
  const emailQuery = useQuery(
    trpc.email.getEmailByIdWithHtml.queryOptions(
      { id: emailId },
      {
        staleTime: 30000,
        refetchOnWindowFocus: false,
      }
    )
  );

  const emailData: EmailWithHtml | null | undefined = emailQuery.data;
  const isLoading = emailQuery.isLoading;
  const error = emailQuery.error;

  // Function to safely render HTML content
  const renderHtmlContent = (html: string): string => {
    // Basic HTML sanitization - in production, use a proper sanitization library
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

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

  if (isLoading) {
    return (
      <div className="flex-1 rounded-2xl bg-white">
        <div className="flex h-32 items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="mb-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            </div>
            <p className="text-lg font-medium text-neutral-400">Loading email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !emailData) {
    return (
      <div className="flex-1 rounded-2xl bg-white">
        <div className="flex h-32 items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600">
              {error ? "Failed to load email" : "Email not found"}
            </p>
            <Button onClick={onBack} className="mt-4">
              Back to Inbox
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { email, html, textContent } = emailData;

  return (
    <div className="flex-1 rounded-2xl bg-white">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
        >
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
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Email Header */}
        <div className="p-6">
          <div className="mb-4">
            <h1 className="font-semibold text-gray-900 mb-4 ml-12 text-2xl">
              {email.subject ?? "No Subject"}
            </h1>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Profile Picture Placeholder */}
                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium text-md">
                  {extractSenderName(email.from).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-lg">
                    {extractSenderName(email.from)}
                  </div>
                  {email.from && email.from.includes("<") && (() => {
                    const match = /<(.+)>/.exec(email.from);
                    return match ? (
                      <div className="text-sm text-gray-500">
                        {match[1]}
                      </div>
                    ) : null;
                  })()}
                  {email.to && (
                    <div className="text-xs text-gray-500 mt-1">
                      to {email.to}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                <div>{formatDate(email.internalDate)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="p-6">
          {html ? (
            <div
              className="pl-12 prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-900 prose-blockquote:text-gray-700 prose-blockquote:border-l-gray-300 prose-code:text-gray-900 prose-pre:bg-gray-50 prose-pre:text-gray-900"
              style={{
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%'
              }}
              dangerouslySetInnerHTML={{
                __html: renderHtmlContent(html),
              }}
            />
          ) : textContent ? (
            <div className="ml-12 whitespace-pre-wrap text-gray-900 break-words">
              {textContent}
            </div>
          ) : (
            <div className="text-gray-500 italic">
              No content available for this email.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
