"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

import { Button } from "~/features/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/features/shared/components/ui/card";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold text-gray-900">
            Gmail Login
          </CardTitle>
          <p className="text-muted-foreground">Sign in to access your inbox</p>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <Image
              src="/icons/google.svg"
              alt="Google"
              width={20}
              height={20}
              className="mr-3"
            />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
