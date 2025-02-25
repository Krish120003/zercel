import Redis from "ioredis";
import { env } from "~/env";

/**
 * Cache the Redis connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL);
if (env.NODE_ENV !== "production") globalForRedis.redis = redis;

export { redis };
