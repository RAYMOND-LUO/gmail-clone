import type { PrismaClient } from "@prisma/client";
import type { Post } from "~/types/post";
import { type z } from "zod";

import { prismaPost, prismaPostToPost } from "~/mappings/post";
import { PostSchema } from "~/types/post";

export const CreatePostInputSchema = PostSchema.pick({
  name: true,
  createdById: true,
});
type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export interface PostService {
  createPost(post: CreatePostInput): Promise<Post>;
  getLatestPost(): Promise<Post>;
  getPost(id: string): Promise<Post>;
  getAllPosts(): Promise<Post[]>;
}

export class PostServiceImpl implements PostService {
  constructor(private readonly db: PrismaClient) {}

  async createPost(input: CreatePostInput): Promise<Post> {
    const post = await this.db.post.create({
      data: {
        name: input.name,
        createdBy: { connect: { id: input.createdById } },
      },
      include: prismaPost.include,
    });

    return prismaPostToPost(post);
  }

  async getLatestPost(): Promise<Post> {
    const post = await this.db.post.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      include: prismaPost.include,
    });

    return prismaPostToPost(post);
  }

  async getPost(id: string): Promise<Post> {
    const post = await this.db.post.findUniqueOrThrow({
      where: { id: Number(id) },
      include: prismaPost.include,
    });

    return prismaPostToPost(post);
  }

  async getAllPosts(): Promise<Post[]> {
    const posts = await this.db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: prismaPost.include,
    });

    return posts.map(prismaPostToPost);
  }
}

export const getPostService = (db: PrismaClient): PostService => {
  return new PostServiceImpl(db);
};
