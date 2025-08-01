import { z } from "zod";

import { UserSchema } from "~/types/user";

export const PostSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PostWithUserSchema = PostSchema.extend({
  createdBy: UserSchema,
});

export type Post = z.infer<typeof PostSchema>;
export type PostWithUser = z.infer<typeof PostWithUserSchema>;