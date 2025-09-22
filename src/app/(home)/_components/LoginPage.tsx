import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

/**
 * LoginPage Component
 * 
 * This is a page orchestration component that handles:
 * - Page structure and layout for login
 * - Data fetching coordination (auth state)
 * - Loading states management
 * - Error boundaries setup
 * 
 * This component lives in _components because it handles page-level concerns
 * and orchestrates the login experience.
 */
export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold text-gray-900">
            Gmail Clone
          </CardTitle>
          <p className="text-muted-foreground">
            Sign in to access your inbox
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" variant="outline">
            <Link href="/api/auth/signin">
              <Image 
                src="/icons/google.svg" 
                alt="Google" 
                width={20} 
                height={20} 
                className="mr-3"
              />
              Continue with Google
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
