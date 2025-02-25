import { NextRequest, NextResponse } from "next/server";
import { signIn } from "~/server/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const installation_id = searchParams.get("installation_id");

  if (installation_id) {
    // TODO: Store installation_id in DB (Optional)
    console.log("User installed GitHub App with ID:", installation_id);
    return signIn("github");
  }
  console.log("redirecting to auth");
  return NextResponse.redirect("/api/auth/callback/github");

  // return NextResponse.redirect("/"); // Redirect user back to your app
}
