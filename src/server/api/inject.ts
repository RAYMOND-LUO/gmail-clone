import { getPostService } from "~/services/post/service";

import { db } from "../db";

export function injectProtectedServices() {
  const postService = getPostService(db);

  return {
    postService,
  };
}

export function injectPublicServices() {
  return {};
}
