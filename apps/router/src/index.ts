import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { join } from "path";
import { serve } from "@hono/node-server";
import { promises as fs } from "fs";
import { lookup } from "mime-types";

const app = new Hono();

app.use("*", async (c, next) => {
  const host = c.req.header("host");
  const subdomain = host?.split(".")[0];

  if (!subdomain) {
    return c.text("Invalid subdomain", 404);
  }

  // Get the path or default to index.html
  const path = c.req.path === "/" ? "index.html" : c.req.path.slice(1);
  const filePath = join("/data", subdomain, path);

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
