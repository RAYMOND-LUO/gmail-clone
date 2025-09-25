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
    // Use paginated sync to fetch first page immediately, rest in background
    const syncResult = await ctx.gmailService.syncUserEmailsWithPagination(
      ctx.session.user.id,
      50, // Page size
      true // Continue in background
    );

    // After syncing first page, return the updated list of emails
    const emails = await ctx.gmailService.getUserEmails(ctx.session.user.id);

    return {
      syncResult,
      emails,
      paginationInfo: {
        totalInbox: syncResult.totalInbox,
        currentCount: emails.length,
        pageSize: syncResult.pageSize,
        backgroundSyncActive: syncResult.backgroundTaskStarted,
      },
    };
  }),

  // Legacy sync endpoint for backward compatibility
  syncUserEmailsFull: protectedProcedure.mutation(async ({ ctx }) => {
    // Full sync - for when user wants to force sync everything
    const syncResult = await ctx.gmailService.syncUserEmails(ctx.session.user.id, 20, 100);
    const emails = await ctx.gmailService.getUserEmails(ctx.session.user.id);
    return {
      syncResult,
      emails,
    };
  }),

  getInboxCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.gmailService.getInboxTotalCount(ctx.session.user.id);
  }),
});
