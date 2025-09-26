/**
 * Dependency Injection Configuration
 * Central place to wire up all services with their dependencies
 * 
 * This pattern provides:
 * - Clear visibility of all service dependencies
 * - Easy testing by mocking the database
 * - Environment-specific configurations
 * - Service lifecycle management
 * 
 * Use cases:
 * - Production: Real database and services
 * - Testing: Mock database and services
 * - Development: Debug-enabled services
 */
import { getPostService } from "~/services/post/service";
import { getGmailService } from "~/services/gmail/service";

import { db } from "../db";
import { getS3Service } from "~/services/s3/service";

/**
 * Injects services that require authentication
 * These services are available only in protected tRPC procedures
 * 
 * Example usage in tRPC router:
 * .mutation(async ({ ctx }) => {
 *   const { postService } = ctx;
 *   return postService.createPost(input);
 * })
 */
export function injectProtectedServices() {
  const postService = getPostService(db);
  const s3Service = getS3Service();
  const gmailService = getGmailService(db, s3Service);

  return {
    postService,
    gmailService,
  };
}

/**
 * Injects services available to public endpoints
 * Keep sensitive operations in protected services
 * 
 * Use case: Public-facing APIs that don't require auth
 * Example: Blog post viewing, public statistics
 */
export function injectPublicServices() {
  return {};
}
