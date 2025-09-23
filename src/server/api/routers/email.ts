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
});
