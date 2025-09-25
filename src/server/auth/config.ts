import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://mail.google.com/",
        },
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
    signIn: async ({ user, account }) => {
      // Trigger Gmail sync when user signs in with Google
      if (account?.provider === "google" && user.id) {
        try {
          // Import Gmail service dynamically to avoid circular dependencies
          const { getGmailService } = await import("~/services/gmail/service");
          const { db } = await import("~/server/db");
          
          const gmailService = getGmailService(db);
          
          // Run paginated sync - fetch first page immediately, rest in background
          gmailService.syncUserEmailsWithPagination(user.id, 50, true) // Fetch first 50, continue in background
            .then((result) => {
              console.log(`Initial sync completed for user ${user.id}:`, result);
            })
            .catch((error) => {
              console.error(`Initial sync failed for user ${user.id}:`, error);
            });
        } catch (error) {
          console.error("Failed to trigger Gmail sync on login:", error);
        }
      }
      
      return true; // Allow the sign-in to proceed
    },
  },
} satisfies NextAuthConfig;
