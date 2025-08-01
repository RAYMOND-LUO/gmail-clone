import type { PrismaClient } from "@prisma/client";
import type { Post, PostWithUser } from "~/types/post";
import { type z } from "zod";

import {
  PostWithUserQuery,
  PrismaPostToPost,
  PrismaPostWithUserToPostWithUser,
} from "~/mappings/post";
import { PostWithUserSchema } from "~/types/post";

export const CreatePostInputSchema = PostWithUserSchema.pick({
  name: true,
  createdBy: true,
});
type CreatePostInput = z.infer<typeof CreatePostInputSchema>;
export interface PostService {
  createPost(post: CreatePostInput): Promise<Post>;
  getLatestPost(): Promise<PostWithUser>;
  getPost(id: string): Promise<Post>;
  getAllPosts(): Promise<Post[]>;
}

export class PostServiceImpl implements PostService {
  constructor(private readonly db: PrismaClient) {}

  async createPost(input: CreatePostInput): Promise<Post> {
    const post = await this.db.post.create({
      data: {
        name: input.name,
        createdBy: { connect: { id: input.createdBy.id } },
      },
    });

    return PrismaPostToPost(post);
  }

  async getLatestPost(): Promise<PostWithUser> {
    const post = await this.db.post.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      include: PostWithUserQuery.include,
    });

    return PrismaPostWithUserToPostWithUser(post);
  }

  async getPost(id: string): Promise<Post> {
    const post = await this.db.post.findUniqueOrThrow({
      where: { id: Number(id) },
    });

    return PrismaPostToPost(post);
  }

  async getAllPosts(): Promise<Post[]> {
    const posts = await this.db.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    return posts.map(PrismaPostToPost);
  }
}

export const getPostService = (db: PrismaClient): PostService => {
  return new PostServiceImpl(db);
};
