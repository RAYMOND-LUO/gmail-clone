import { z } from "zod";

export const PostSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdById: z.string(),
});

export type Post = z.infer<typeof PostSchema>;
