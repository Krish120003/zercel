import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    GITHUB_ID: z.string(),
    GITHUB_SECRET: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_APP_URL: z.string().url(),
    GITHUB_WEBHOOK_SECRET: z.string(),

    GOOGLE_CLOUD_PROJECT: z.string(),

    // Added Builder Job details for triggering backend actions
    BUILDER_JOB_LOCATION: z.string(),
    BUILDER_JOB_NAME: z.string(),
    BUILD_BUCKET: z.string(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

    BUILDER_CALLBACK_URL: z
      .string()
      .url()
      .default("https://zercel.dev/api/builder/callback"),

    // NextAuth

    NEXTAUTH_URL: z.string(),
    NEXTAUTH_SECRET: z.string(),

    // Redis

    REDIS_URL: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    // NEXT_PUBLIC_GITHUB_APP_URL: z.string().url(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY,
    GITHUB_APP_URL: process.env.GITHUB_APP_URL,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,

    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    // Removed Cloud Tasks environment variables
    // GOOGLE_CLOUD_TASKS_LOCATION: process.env.GOOGLE_CLOUD_TASKS_LOCATION,
    // GOOGLE_CLOUD_TASKS_QUEUE: process.env.GOOGLE_CLOUD_TASKS_QUEUE,

    BUILDER_JOB_LOCATION: process.env.BUILDER_JOB_LOCATION,
    BUILDER_JOB_NAME: process.env.BUILDER_JOB_NAME,
    BUILD_BUCKET: process.env.BUILD_BUCKET,
    BUILDER_CALLBACK_URL: process.env.BUILDER_CALLBACK_URL,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,

    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    REDIS_URL: process.env.REDIS_URL,

    // === Client ===
    // NEXT_PUBLIC_GITHUB_APP_URL: process.env.NEXT_PUBLIC_GITHUB_APP_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
