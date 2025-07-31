import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { CreatePostInputSchema } from "~/services/post/service";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(CreatePostInputSchema.pick({ name: true }))
    .mutation(async ({ ctx, input }) => {
      return ctx.postService.createPost({
        name: input.name,
        createdById: ctx.session.user.id,
      });
    }),

  latest: protectedProcedure.query(async ({ ctx }) => {
    const post = await ctx.postService.getLatestPost();

    return post;
  }),

  all: protectedProcedure.query(async ({ ctx }) => {
    return ctx.postService.getAllPosts();
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
