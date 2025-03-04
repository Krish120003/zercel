import { Hono } from "hono";
import { join } from "path";
import { serve } from "@hono/node-server";
import { promises as fs } from "fs";
import { lookup } from "mime-types";
import { Redis } from "ioredis";
import type { StatusCode } from "hono/utils/http-status";

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

  // the sha value might have a prefix of `url:`, which means this is actually a server app
  // and we need to proxy the request to the server url
  if (sha.startsWith("url:")) {
    const targetUrl = sha.slice(4);
    const url = new URL(c.req.url);

    // Fix the URL construction to avoid double slashes
    let pathWithSearch = url.pathname + url.search;

    // Ensure target URL doesn't end with slash if pathname starts with one
    const normalizedTargetUrl = targetUrl.endsWith("/")
      ? targetUrl.slice(0, -1)
      : targetUrl;

    const fullTargetUrl = `${normalizedTargetUrl}${pathWithSearch}`;

    console.log(`[PROXY] Request: ${c.req.method} ${c.req.url}`);
    console.log(`[PROXY] Subdomain: ${subdomain}`);
    console.log(`[PROXY] Target SHA value: ${sha}`);
    console.log(`[PROXY] URL parts:`, {
      targetUrl,
      normalizedTargetUrl,
      pathname: url.pathname,
      search: url.search,
    });
    console.log(`[PROXY] Forwarding to: ${fullTargetUrl}`);
    console.log(`[PROXY] Headers:`, JSON.stringify(c.req.header(), null, 2));

    try {
      console.log(
        `[PROXY] Sending ${c.req.method} request to ${fullTargetUrl}`
      );
      const response = await fetch(fullTargetUrl, {
        method: c.req.method,
        headers: c.req.header(),
        body:
          c.req.method !== "GET" && c.req.method !== "HEAD"
            ? await c.req.blob()
            : undefined,
      });

      console.log(`[PROXY] Response received: HTTP ${response.status}`);
      console.log(
        `[PROXY] Response headers:`,
        JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)
      );

      // Copy all headers from the proxied response
      for (const [key, value] of response.headers.entries()) {
        c.header(key, value);
        console.log(`[PROXY] Setting header: ${key}: ${value}`);
      }

      c.status(response.status as StatusCode);
      const responseBody = await response.arrayBuffer();
      console.log(
        `[PROXY] Response body size: ${responseBody.byteLength} bytes`
      );
      // Return the response with the same status code
      return c.body(responseBody);
    } catch (error) {
      console.error(`[PROXY] Error connecting to ${fullTargetUrl}:`, error);
      return c.text("Error connecting to target server", 502);
    }
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
