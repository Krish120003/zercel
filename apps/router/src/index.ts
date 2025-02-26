import { Hono } from "hono";
import { join } from "path";
import { serve } from "@hono/node-server";
import { promises as fs } from "fs";
import { lookup } from "mime-types";
import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "";

const client = new Redis(REDIS_URL);
const app = new Hono();

// Cache interface
interface CacheEntry {
  value: string | null;
  timestamp: number;
}

const shaCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3000; // 3 seconds in milliseconds

async function getSha(subdomain: string): Promise<string | null> {
  const now = Date.now();
  const cached = shaCache.get(subdomain);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const sha = await client.get(`sha:${subdomain}`);
  // Cache both successful and unsuccessful results
  shaCache.set(subdomain, { value: sha || null, timestamp: now });

  return sha;
}

app.use("*", async (c, next) => {
  const host = c.req.header("host");
  let subdomain = host?.split(".")[0];

  if (!subdomain) {
    return c.text("Invalid subdomain", 404);
  }

  const sha = await getSha(subdomain);

  if (!sha) {
    return c.text("Not found", 404);
  }

  // Get the path or default to index.html
  const path = c.req.path === "/" ? "index.html" : c.req.path.slice(1);
  const filePath = join("/data", sha, path);

  // Serve static files from the mounted volume
  try {
    const data = await fs.readFile(filePath);
    const mimeType = lookup(filePath) || "application/octet-stream";
    c.header("Content-Type", mimeType);
    return c.body(data);
  } catch (error) {
    console.error(error);
    return c.text("File not found", 404);
  }
});

serve(
  {
    fetch: app.fetch,
    port: 8080,
  },
  (info) => {
    console.log(`Server is running on http://${info.address}:${info.port}`);
  }
);

export default app;
