"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorMessage as PostErrorMessage } from "~/features/post/components/ErrorMessage";

export default function PostErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary FallbackComponent={PostErrorMessage} onReset={reset}>
      {children}
    </ErrorBoundary>
  );
}
