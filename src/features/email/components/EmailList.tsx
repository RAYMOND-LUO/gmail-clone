import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";

interface Email {
  from: string;
  subject: string;
  time: string;
  unread: boolean;
}

interface EmailListProps {
  emails?: Email[];
}

/**
 * EmailList Component
 * 
 * This component handles:
 * - Displaying list of emails
 * - Email interaction states (read/unread)
 * - Email metadata (sender, subject, time)
 * 
 * Benefits:
 * - Reusable across different views
 * - Centralized email display logic
 * - Easy to extend with new email features
 */
export function EmailList({ emails = [] }: EmailListProps) {
  // Default sample emails if none provided
  const defaultEmails: Email[] = [
    {
      from: "GitHub",
      subject: "Your daily digest",
      time: "2:30 PM",
      unread: true,
    },
    {
      from: "LinkedIn",
      subject: "New job opportunities",
      time: "1:15 PM",
      unread: true,
    },
    {
      from: "Netflix",
      subject: "New shows added this week",
      time: "12:45 PM",
      unread: false,
    },
    {
      from: "Stripe",
      subject: "Payment received",
      time: "11:20 AM",
      unread: false,
    },
    {
      from: "Twitter",
      subject: "Security alert",
      time: "10:30 AM",
      unread: true,
    },
  ];

  const emailList = emails.length > 0 ? emails : defaultEmails;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2 p-4">
        {emailList.map((email, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              email.unread ? "bg-blue-50/50 border-l-4 border-l-blue-500" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-muted">
                    {email.from.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        email.unread ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {email.from}
                    </p>
                    {email.unread && (
                      <Badge variant="secondary" className="h-2 w-2 p-0 bg-blue-500" />
                    )}
                  </div>
                  <p
                    className={`truncate text-sm ${
                      email.unread ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {email.subject}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">{email.time}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
