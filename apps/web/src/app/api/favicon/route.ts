import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  console.log(searchParams);
  const link = searchParams.get("link");
  const placeholderUrl = new URL(
    "/placeholder_favicon.png",
    req.nextUrl.origin,
  ).toString();

  if (!link) {
    console.log("No link provided, redirecting to placeholder favicon", link);
    return NextResponse.redirect(placeholderUrl);
  }

  try {
    const url = new URL(link);
    const origin = url.origin;

    const faviconPaths = [
      `/favicon.ico`,
      `/favicon.png`,
      `/apple-touch-icon.png`,
      `/apple-touch-icon-precomposed.png`,
    ];

    console.log("Fetching", link);
    const htmlResponse = await fetch(link);
    const html = await htmlResponse.text();

    const faviconRegex =
      /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i;
    const faviconMatch = faviconRegex.exec(html);

    console.log("faviconMatch", faviconMatch);

    if (faviconMatch?.[1]) {
      const faviconUrl = new URL(faviconMatch[1], origin).toString();
      const response = await fetch(faviconUrl);
      if (response.ok) {
        return new NextResponse(response.body, {
          headers: {
            "content-type":
              response.headers.get("content-type") ?? "image/x-icon",
            "cache-control": "public, max-age=86400",
          },
        });
      }
    }

    for (const path of faviconPaths) {
      const faviconUrl = `${origin}${path}`;
      const response = await fetch(faviconUrl);
      if (response.ok) {
        return new NextResponse(response.body, {
          headers: {
            "content-type":
              response.headers.get("content-type") ?? "image/x-icon",
            "cache-control": "public, max-age=86400",
          },
        });
      }
    }

    return NextResponse.redirect(placeholderUrl);
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return NextResponse.redirect(placeholderUrl);
  }
}

export { GET };
