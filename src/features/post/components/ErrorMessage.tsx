"use client";

import type { FallbackProps } from "react-error-boundary";
import React from "react";
import { isTRPCClientError } from "@trpc/client";
import Link from "next/link";

export function ErrorMessage({
  error,
  resetErrorBoundary,
}: FallbackProps): React.ReactElement {
  if (isTRPCClientError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    switch (error.data.code) {
      case "NOT_FOUND":
        return (
          <div
            role="alert"
            className="rounded border border-red-400 bg-red-100 p-4 text-red-700"
          >
            <h2 className="font-bold">Posts Not Found</h2>
            <p>
              The post you are looking for does not exist or you do not have
              permission to view it.
            </p>
            <Link
              href="/"
              className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Home
            </Link>
          </div>
        );
      case "UNAUTHORIZED":
        return (
          <div
            role="alert"
            className="rounded border border-red-400 bg-red-100 p-4 text-red-700"
          >
            <h2 className="font-bold">Unauthorized</h2>
            <p>You do not have permission to view this invoice.</p>
            <Link
              href="/login"
              className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Login to view
            </Link>
          </div>
        );
      case "INTERNAL_SERVER_ERROR":
        return (
          <div
            role="alert"
            className="rounded border border-red-400 bg-red-100 p-4 text-red-700"
          >
            <h2 className="font-bold">Server Error</h2>
            <p>{error.message || "An internal server error occurred."}</p>
            <button
              onClick={resetErrorBoundary}
              className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        );
      default:
        return (
          <div
            role="alert"
            className="rounded border border-red-400 bg-red-100 p-4 text-red-700"
          >
            <h2 className="font-bold">Error Loading Post</h2>
            <p>An unexpected error occurred while trying to load the post.</p>
            <button
              onClick={resetErrorBoundary}
              className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        );
    }
  }

  // Fallback for non-TRPC errors or other unexpected errors
  return (
    <div
      role="alert"
      className="rounded border border-red-400 bg-red-100 p-4 text-red-700"
    >
      <h2 className="font-bold">An Unexpected Error Occurred</h2>
      <p>{error instanceof Error ? error.message : "Something went wrong."}</p>
      <Link
        href="/"
        onClick={resetErrorBoundary}
        className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </Link>
    </div>
  );
}
