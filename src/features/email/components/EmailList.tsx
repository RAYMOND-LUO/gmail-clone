"use client";

import type { Email, EmailWithThread } from "~/types/components";
import type { PaginatedEmailResult } from "~/types/gmail";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";

import { Button } from "~/features/shared/components/ui/button";
import { useTRPC } from "~/trpc/react";

import { EmailDetailView } from "./EmailDetailView";
import { EmailTabs } from "./EmailTabs";

/**
 * EmailList Component
 *
 * This component handles:
 * - Displaying list of emails in Gmail table format with pagination
 * - Email interaction states (read/unread, starred)
 * - Email metadata (sender, subject, snippet, time)
 * - Client-side pagination with 50 emails per page
 */
export function EmailList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [paginationInfo, setPaginationInfo] = useState<{
    totalInbox: number;
    currentCount: number;
    backgroundSyncActive: boolean;
  }>({
    totalInbox: 0,
    currentCount: 0,
    backgroundSyncActive: false,
  });
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch paginated emails with proper typing
  const query = useQuery(
    trpc.email.getByUserPaginated.queryOptions(
      { page: currentPage, limit: 50 },
      {
        staleTime: 30000,
        refetchOnWindowFocus: false,
      }
    )
  );

  // Fetch inbox count if we don't have it yet
  const inboxCountQuery = useQuery(trpc.email.getInboxCount.queryOptions());

  // Use a wrapper function to handle type safety
  const getEmailData = (): PaginatedEmailResult | undefined => {
    if (
      query.data &&
      typeof query.data === "object" &&
      "emails" in query.data
    ) {
      return query.data;
    }
    return undefined;
  };

  const emailData = getEmailData();
  const isLoading = query.isLoading ?? false;

  // Extract emails and pagination data with proper typing
  const localEmails: EmailWithThread[] = emailData?.emails ?? [];
  const totalInboxCount =
    paginationInfo.totalInbox > 0
      ? paginationInfo.totalInbox
      : (inboxCountQuery.data ?? 0);
  const totalPages: number = Math.ceil(totalInboxCount / 50);

  // Use tRPC mutation for syncing emails
  const syncEmailsMutation = useMutation(
    trpc.email.syncUserEmails.mutationOptions({
      onSuccess: (data) => {
        // Update pagination info
        if (data.paginationInfo) {
          setPaginationInfo({
            totalInbox: data.paginationInfo.totalInbox,
            currentCount: data.paginationInfo.currentCount,
            backgroundSyncActive: data.paginationInfo.backgroundSyncActive,
          });
        }
        // Invalidate the paginated email queries to refresh data
        void queryClient.invalidateQueries({
          queryKey: trpc.email.getByUserPaginated.queryKey(),
        });
      },
      onError: (error) => {
        console.error("Failed to sync emails:", error);
      },
    })
  );

  // Mark email as read mutation
  const markEmailAsRead = async (emailId: string) => {
    // TODO: Implement mark as read API call
    console.log("Marking email as read:", emailId);
    // For now, we'll just invalidate the queries to refresh the UI
    void queryClient.invalidateQueries({
      queryKey: trpc.email.getByUserPaginated.queryKey(),
    });
  };

  // Periodically check for new emails synced in background
  useEffect(() => {
    if (!paginationInfo.backgroundSyncActive) return;

    const interval = setInterval(() => {
      void queryClient
        .invalidateQueries({
          queryKey: trpc.email.getByUserPaginated.queryKey(),
        })
        .then(() => {
          // After invalidation, the component will re-render with new data
          // from the tRPC query which should automatically fetch updated emails
        })
        .catch((error) => {
          console.error("Failed to refresh emails:", error);
        });
    }, 5000); // Check every 5 seconds

    // Stop polling after 2 minutes or when we reach the total
    const timeout = setTimeout(() => {
      setPaginationInfo((prev) => ({
        ...prev,
        backgroundSyncActive: false,
      }));
    }, 120000); // 2 minutes timeout

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [
    paginationInfo.backgroundSyncActive,
    queryClient,
    trpc.email.getByUserPaginated,
  ]);

  // Pagination navigation functions
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Manual refresh function
  const refreshEmails = async () => {
    await syncEmailsMutation.mutateAsync();
  };

  // Handle email click to show detail view
  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
    // Mark email as read when clicked
    void markEmailAsRead(emailId);
  };

  // Handle back button to return to email list
  const handleBackToList = () => {
    setSelectedEmailId(null);
  };

  // Toggle star status
  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    // TODO: Implement star toggle API call
    console.log(
      `Toggling star for email ${emailId} from ${currentStarred} to ${!currentStarred}`
    );
  };

  // Toggle important status
  const toggleImportant = async (
    emailId: string,
    currentImportant: boolean
  ) => {
    // TODO: Implement important toggle API call
    console.log(
      `Toggling important for email ${emailId} from ${currentImportant} to ${!currentImportant}`
    );
  };

  // Function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
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
      snippet: decodeHtmlEntities(email.snippet ?? ""),
      time,
      unread: !email.thread.isRead,
      starred: email.thread.isStarred,
      important: email.thread.isImportant,
    };
  };

  const emailList: Email[] =
    Array.isArray(localEmails) && localEmails.length > 0
      ? localEmails.map(transformEmail)
      : [];

  // If an email is selected, show the detail view
  if (selectedEmailId) {
    return (
      <EmailDetailView emailId={selectedEmailId} onBack={handleBackToList} />
    );
  }

  return (
    <div className="flex-1 rounded-2xl bg-white">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl bg-white px-4 py-2">
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
              className={`h-4 w-4 ${syncEmailsMutation.isPending ? "animate-spin" : ""}`}
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
          {isLoading && (
            <span className="mr-2 text-neutral-300">Loading...</span>
          )}
          {syncEmailsMutation.isPending && (
            <span className="mr-2 text-neutral-300">Syncing emails...</span>
          )}
          {paginationInfo.backgroundSyncActive && (
            <span className="mr-2 text-neutral-300">
              Background sync in progress...
            </span>
          )}
          {isLoading
            ? ""
            : emailList.length > 0
              ? totalInboxCount > 0
                ? `${(currentPage - 1) * 50 + 1}-${(currentPage - 1) * 50 + emailList.length} of ${totalInboxCount}`
                : `${(currentPage - 1) * 50 + 1}-${(currentPage - 1) * 50 + emailList.length} of ${(currentPage - 1) * 50 + emailList.length}`
              : "No emails"}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || Boolean(isLoading)}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextPage}
            disabled={currentPage === totalPages || Boolean(isLoading)}
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
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="mb-2">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              </div>
              <p className="text-lg font-medium text-neutral-400">
                Loading emails...
              </p>
            </div>
          </div>
        ) : emailList.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">No emails</p>
            </div>
          </div>
        ) : (
          Array.isArray(localEmails) &&
          localEmails.map((emailData: EmailWithThread) => {
            const email = transformEmail(emailData);
            return (
              <div
                key={emailData.id}
                className={`group flex h-[40px] cursor-pointer items-center border border-neutral-100 px-4 py-3 transition-all duration-200 hover:border-neutral-400 hover:shadow-2xl ${
                  email.unread ? "bg-white font-medium" : "bg-[#f2f6fe]"
                }`}
                onClick={() => handleEmailClick(emailData.id)}
              >
                {/* Checkbox */}
                <div className="mr-3 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-blue-600"
                  />
                </div>

                {/* Star */}
                <div className="mr-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      void toggleStar(emailData.id, email.starred ?? false)
                    }
                  >
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

                {/* Important */}
                <div className="mr-3 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      void toggleImportant(
                        emailData.id,
                        email.important ?? false
                      )
                    }
                  >
                    <Image
                      src="/important.png"
                      alt="Important"
                      width={16}
                      height={16}
                      className={`h-4 w-4 ${email.important ? "opacity-100" : "opacity-70"}`}
                    />
                  </Button>
                </div>

                {/* Sender */}
                <div className="mr-4 w-48 min-w-0 flex-shrink-0">
                  <span
                    className={`block truncate text-sm ${email.unread ? "font-bold text-gray-900" : "text-gray-600"}`}
                  >
                    {email.from}
                  </span>
                </div>

                {/* Subject and Snippet */}
                <div className="mr-4 flex min-w-0 flex-1 items-center">
                  {/* subject: do NOT let it shrink */}
                  <span
                    className={`text-sm ${email.unread ? "font-bold text-gray-900" : "text-gray-600"} flex-shrink-0 truncate overflow-hidden text-ellipsis whitespace-nowrap`}
                  >
                    {email.subject}
                  </span>

                  {/* separator */}
                  <span className="flex-shrink-0 px-1 text-gray-400">–</span>

                  {/* snippet: takes remaining space and truncates */}
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${email.unread ? "text-gray-700" : "text-gray-500"}`}
                  >
                    {email.snippet}
                  </span>
                </div>
                {/* Hover Actions */}
                <div className="mx-1 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {/* Mark as Unread */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement mark as unread functionality
                      console.log("Mark as unread:", emailData.id);
                    }}
                    title="Mark as unread"
                  >
                    <svg
                      className="h-4 w-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement delete functionality
                      console.log("Delete email:", emailData.id);
                    }}
                    title="Delete"
                  >
                    <svg
                      className="h-4 w-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </div>
                {/* Time */}
                <div className="flex-shrink-0 text-right">
                  <span
                    className={`text-xs ${email.unread ? "font-semibold text-gray-700" : "text-gray-500"}`}
                  >
                    {email.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
