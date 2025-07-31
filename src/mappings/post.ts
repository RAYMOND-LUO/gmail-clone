import type { Post } from "~/types/post";
import { Prisma } from "@prisma/client";

export const prismaPost = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    createdBy: true,
  },
});

export const prismaPostToPost = (
  post: Prisma.PostGetPayload<typeof prismaPost>
): Post => {
  return {
    id: post.id,
    name: post.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    createdById: post.createdBy.id,
  };
};
