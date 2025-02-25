import { NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export async function GET(req: NextRequest) {
  const installUrl = env.GITHUB_APP_URL;

  return NextResponse.redirect(installUrl);
}
