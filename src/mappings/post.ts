import type { Post, PostWithUser } from "~/types/post";
import { Prisma } from "@prisma/client";

import { PrismaUserToUser, UserQuery } from "./user";

export const PostQuery = Prisma.validator<Prisma.PostDefaultArgs>()({});

export const PostWithUserQuery = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    createdBy: UserQuery,
  },
});

export const PrismaPostToPost = (
  post: Prisma.PostGetPayload<typeof PostQuery>
): Post => {
  return {
    id: post.id,
    name: post.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
};

export const PrismaPostWithUserToPostWithUser = (
  post: Prisma.PostGetPayload<typeof PostWithUserQuery>
): PostWithUser => {
  return {
    ...PrismaPostToPost(post),
    createdBy: PrismaUserToUser(post.createdBy),
  };
};
