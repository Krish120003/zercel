import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // try {
  // Log request headers and method for debugging
  console.log("Request headers:", Object.fromEntries(request.headers));
  console.log("Request method:", request.method);
  console.log("Request body:", await request.text());

  //   // Parse JSON with error handling
  //   let data;
  //   try {
  //     data = await request.json();
  //   } catch (e) {
  //     console.error("Failed to parse JSON:", e);
  //     return NextResponse.json(
  //       { error: "Invalid JSON payload" },
  //       { status: 400 },
  //     );
  //   }

  //   console.log("Parsed data:", data);

  //   return NextResponse.json({ message: "Hello, World!" });
  // } catch (error) {
  //   console.error("Request handler error:", error);
  //   return NextResponse.json(
  //     { error: "Internal server error" },
  //     { status: 500 },
  //   );
  // }
  return NextResponse.json({ message: "Hello, World!" });
}
