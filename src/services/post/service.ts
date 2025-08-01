import type { PrismaClient } from "@prisma/client";
import type { Post, PostWithUser } from "~/types/post";
import { type z } from "zod";

import {
  PostWithUserQuery,
  PrismaPostToPost,
  PrismaPostWithUserToPostWithUser,
} from "~/mappings/post";
import { PostWithUserSchema } from "~/types/post";

/**
 * Input validation schema for creating posts
 * Derives from domain schema to ensure consistency
 * 
 * Use case: Validate input data before processing
 */
export const CreatePostInputSchema = PostWithUserSchema.pick({
  name: true,
  createdBy: true,
});
type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

/**
 * PostService interface defines the contract for post-related operations
 * This abstraction enables:
 * - Easy mocking for tests
 * - Multiple implementations (e.g., different databases)
 * - Clear API documentation
 * 
 * Use case: Define what operations are available for posts
 */
export interface PostService {
  createPost(post: CreatePostInput): Promise<Post>;
  getLatestPost(): Promise<PostWithUser>;
  getPost(id: string): Promise<Post>;
  getAllPosts(): Promise<Post[]>;
}

/**
 * Concrete implementation of PostService using Prisma
 * Demonstrates dependency injection pattern
 * 
 * Benefits:
 * - Database client is injected, not imported
 * - Easy to test with mock database
 * - Can swap database implementations
 * 
 * Use cases:
 * - Production: Inject real PrismaClient
 * - Testing: Inject mock PrismaClient
 * - Different environments can use different configs
 */
export class PostServiceImpl implements PostService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Creates a new post with author relation
   * Shows how to handle relations in Prisma
   */
  async createPost(input: CreatePostInput): Promise<Post> {
    const post = await this.db.post.create({
      data: {
        name: input.name,
        createdBy: { connect: { id: input.createdBy.id } },
      },
    });

    return PrismaPostToPost(post);
  }

  /**
   * Fetches the most recent post with author details
   * Demonstrates using predefined queries and mappings
   */
  async getLatestPost(): Promise<PostWithUser> {
    const post = await this.db.post.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      include: PostWithUserQuery.include,
    });

    return PrismaPostWithUserToPostWithUser(post);
  }

  /**
   * Fetches a single post by ID
   * Shows error handling with findUniqueOrThrow
   */
  async getPost(id: string): Promise<Post> {
    const post = await this.db.post.findUniqueOrThrow({
      where: { id: Number(id) },
    });

    return PrismaPostToPost(post);
  }

  /**
   * Fetches all posts ordered by creation date
   * Demonstrates batch mapping of database results
   */
  async getAllPosts(): Promise<Post[]> {
    const posts = await this.db.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    return posts.map(PrismaPostToPost);
  }
}

/**
 * Factory function for creating PostService instances
 * This is the dependency injection entry point
 * 
 * Use case: 
 * const postService = getPostService(prismaClient);
 * 
 * Testing example:
 * const mockDb = createMockPrismaClient();
 * const testService = getPostService(mockDb);
 */
export const getPostService = (db: PrismaClient): PostService => {
  return new PostServiceImpl(db);
};
