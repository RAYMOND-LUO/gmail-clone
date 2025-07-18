import Link from "next/link";

import { HelloMessage, LatestPost, Posts } from "~/features/post/post";
import { Await } from "~/features/shared/components/Await";
import { ErrorMessage } from "~/features/shared/components/ErrorMessage";
import { LoadingSpinner } from "~/features/shared/components/LoadingSpinner";
import { auth } from "~/server/auth";
import { trpc } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-400">
          The best way to start a full-stack, typesafe Next.js app
        </p>
      </div>

      {/* Documentation Links */}
      <div className="mx-auto mb-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          className="group flex flex-col gap-4 rounded-xl bg-white/10 p-6 transition-all duration-200 hover:scale-105 hover:bg-white/20"
          href="https://create.t3.gg/en/usage/first-steps"
          target="_blank"
        >
          <h3 className="text-2xl font-bold transition-colors group-hover:text-[hsl(280,100%,70%)]">
            First Steps →
          </h3>
          <div className="text-lg text-gray-300">
            Just the basics - Everything you need to know to set up your
            database and authentication.
          </div>
        </Link>
        <Link
          className="group flex flex-col gap-4 rounded-xl bg-white/10 p-6 transition-all duration-200 hover:scale-105 hover:bg-white/20"
          href="https://create.t3.gg/en/introduction"
          target="_blank"
        >
          <h3 className="text-2xl font-bold transition-colors group-hover:text-[hsl(280,100%,70%)]">
            Documentation →
          </h3>
          <div className="text-lg text-gray-300">
            Learn more about Create T3 App, the libraries it uses, and how to
            deploy it.
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <Await
        prefetch={[
          trpc.post.all.queryOptions(),
          trpc.post.latest.queryOptions(),
          trpc.post.hello.queryOptions({ text: "from tRPC" }),
        ]}
        fallback={<LoadingSpinner />}
        errorComponent={<ErrorMessage />}
      >
        <div className="mx-auto max-w-6xl">
          {/* Posts Section */}
          <div className="mb-12">
            <h2 className="mb-6 text-center text-3xl font-bold">
              Recent Posts
            </h2>
            <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
              <Posts />
            </div>
          </div>

          {/* Create Post Section */}
          {session?.user && (
            <div className="mb-12">
              <h2 className="mb-6 text-center text-3xl font-bold">
                Create a Post
              </h2>
              <div className="flex justify-center rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                <LatestPost />
              </div>
            </div>
          )}

          {/* Status Section */}
          <div className="rounded-xl bg-white/5 p-8 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <HelloMessage />
              </div>

              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  {session ? (
                    <p className="text-xl text-white">
                      Welcome back,{" "}
                      <span className="font-semibold text-[hsl(280,100%,70%)]">
                        {session.user?.name}
                      </span>
                      !
                    </p>
                  ) : (
                    <p className="text-xl text-gray-400">
                      Sign in to create posts and see your content
                    </p>
                  )}
                </div>

                <Link
                  href={session ? "/api/auth/signout" : "/api/auth/signin"}
                  className="rounded-full bg-gradient-to-r from-[hsl(280,100%,70%)] to-[hsl(240,100%,70%)] px-8 py-3 font-semibold text-white no-underline transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  {session ? "Sign out" : "Sign in"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Await>
    </div>
  );
}
