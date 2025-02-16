import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Added Redis configuration
    REDIS_URL: z.string().url(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_USERNAME: z.string().optional(),
    REDIS_PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    REDIS_HOST: z.string().optional(),
  },

  clientPrefix: "PUBLIC_",

  client: {},

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});
