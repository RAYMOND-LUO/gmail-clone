import Link from "next/link";

import { HelloMessage, LatestPost, Posts } from "~/features/post/post";
import { Await } from "~/features/shared/components/Await";
import { ErrorMessage } from "~/features/shared/components/ErrorMessage";
import { LoadingSpinner } from "~/features/shared/components/LoadingSpinner";
import { auth } from "~/server/auth";
import { trpc } from "~/trpc/server";

export async function HomePageContent() {
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const session = await auth();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xl text-gray-400">
            Sign in to create posts and see your content
          </p>
        </div>

        <Link
          href={session ? "/api/auth/signout" : "/api/auth/signin"}
          className="rounded-full bg-gradient-to-r from-[hsl(280,100%,70%)] to-[hsl(240,100%,70%)] px-8 py-3 font-semibold text-white no-underline transition-all duration-200 hover:scale-105 hover:shadow-lg"
        >
          {session ? "Sign out" : "Sign in"}
        </Link>
      </div>
    );
  }

  return (
    <>
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
                  <p className="text-xl text-white">
                    Welcome back,{" "}
                    <span className="font-semibold text-[hsl(280,100%,70%)]">
                      {session.user?.name}
                    </span>
                    !
                  </p>
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
    </>
  );
}
