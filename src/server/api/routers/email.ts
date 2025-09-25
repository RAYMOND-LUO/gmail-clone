import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const emailRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.gmailService.getAllEmails();
  }),


  getByUserPaginated: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      return ctx.gmailService.getUserEmailsPaginated(ctx.session.user.id, input.page, input.limit);
    }),

  getEmailById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.gmailService.getEmailById(input.id);
    }),

  getEmailByIdWithHtml: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.gmailService.getEmailByIdWithHtml(ctx.session.user.id, input.id);
    }),

  syncUserEmails: protectedProcedure.mutation(async ({ ctx }) => {
    // Use paginated sync to fetch first page immediately, rest in background
    const syncResult = await ctx.gmailService.syncUserEmailsWithPagination(
      ctx.session.user.id,
      50, // Page size
      true // Continue in background
    );

    // After syncing first page, return the updated paginated emails
    const emails = await ctx.gmailService.getUserEmailsPaginated(ctx.session.user.id, 1, 50);

    return {
      syncResult,
      emails,
      paginationInfo: {
        totalInbox: syncResult.totalInbox,
        currentCount: emails.emails.length,
        pageSize: syncResult.pageSize,
        backgroundSyncActive: syncResult.backgroundTaskStarted,
      },
    };
  }),

  getInboxCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.gmailService.getInboxTotalCount(ctx.session.user.id);
  }),
});
