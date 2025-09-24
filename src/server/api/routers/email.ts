import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const emailRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.gmailService.getAllEmails();
  }),

  getByUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.gmailService.getUserEmails(ctx.session.user.id);
  }),

  getEmailById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.gmailService.getEmailById(input.id);
    }),

  syncUserEmails: protectedProcedure.mutation(async ({ ctx }) => {
    // Sync emails from Gmail API to database
    const syncResult = await ctx.gmailService.syncUserEmails(ctx.session.user.id);

    // After syncing, return the updated list of emails
    const emails = await ctx.gmailService.getUserEmails(ctx.session.user.id);

    return {
      syncResult,
      emails,
    };
  }),
});
