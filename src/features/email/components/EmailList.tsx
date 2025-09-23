import { Button } from "~/components/ui/button";

import { EmailTabs } from "./EmailTabs";

interface Email {
  from: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  starred?: boolean;
}

interface EmailListProps {
  emails?: Email[];
}

/**
 * EmailList Component
 *
 * This component handles:
 * - Displaying list of emails in Gmail table format
 * - Email interaction states (read/unread, starred)
 * - Email metadata (sender, subject, snippet, time)
 */
export function EmailList({ emails = [] }: EmailListProps) {
  // Default sample emails if none provided
  const defaultEmails: Email[] = [
    {
      from: "Symbiotic HQ",
      subject: "HYPERSONIC FESTIVAL: 200 3RD RELEASE TICKETS LEFT!",
      snippet:
        "Don't miss out on the biggest festival of the year! Only 200 tickets remaining for the third release...",
      time: "4:22 PM",
      unread: true,
      starred: false,
    },
    {
      from: "UNSW Sydney",
      subject: "Important: Course Registration Deadline",
      snippet:
        "This is a reminder that course registration closes on Friday. Please ensure you have selected all your subjects...",
      time: "3:15 PM",
      unread: false,
      starred: true,
    },
    {
      from: "GitHub",
      subject: "Your daily digest",
      snippet:
        "Here's what happened in your repositories today. 3 new commits, 2 pull requests merged...",
      time: "2:30 PM",
      unread: false,
      starred: false,
    },
  ];

  const emailList = emails.length > 0 ? emails : defaultEmails;

  return (
    <div className="mr-3 flex-1 overflow-y-auto rounded-2xl bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 sticky top-0 bg-white">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="mr-3 h-4 w-4 flex-shrink-0 rounded text-blue-600"
          />
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
        <div className="mr-4 ml-auto text-sm text-gray-600">1-50 of 8,066</div>
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
      <div className="mr-3 h-full divide-y divide-gray-200 rounded border-t border-r border-neutral-200">
        {emailList.map((email, index) => (
          <div
            key={index}
            className={`flex h-[40px] cursor-pointer items-center px-4 py-3 hover:bg-gray-50 border-b border-neutral-200 ${
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
            <div className="mr-4 w-48 flex-shrink-0">
              <span
                className={`text-sm ${email.unread ? "font-semibold text-gray-900" : "text-gray-700"}`}
              >
                {email.from}
              </span>
            </div>

            {/* Subject and Snippet */}
            <div className="mr-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-sm ${email.unread ? "font-semibold text-gray-900" : "text-gray-700"}`}
                >
                  {email.subject}
                </span>
                <span className="truncate text-sm text-gray-500">
                  - {email.snippet}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="flex-shrink-0 text-right">
              <span className="text-xs text-gray-500">{email.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
