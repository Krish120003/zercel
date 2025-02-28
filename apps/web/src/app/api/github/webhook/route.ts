import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";

import { env } from "~/env";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { deployments, sites } from "~/server/db/schema";
import { requestBuild } from "~/server/lib/build";
import { EventPayloadMap } from "node_modules/@octokit/webhooks/dist-types/generated/webhook-identifiers";

const webhooks = new Webhooks({
  secret: env.GITHUB_WEBHOOK_SECRET || "never",
});

webhooks.on("push", async (event) => {
  console.log("Push event received:", event);

  // event.payload.repository.full_name;
  const data = await db.query.sites.findMany({
    where: eq(sites.repository, event.payload.repository.full_name),
  });

  const pushedBranchName = event.payload.ref.split("/").pop();
  if (event.payload.repository.default_branch === pushedBranchName) {
    // if the pushed branch is the default branch, then we need to create a new deployment for each site
    // that is using this repo
    console.log(
      "Creating new deployment for each site that is using this repo",
    );

    // for each site, create a new deployment
    for (const site of data) {
      console.log("Creating new deployment for site:", site);

      // event.payload.commits
      // get the latest
      const commitMessage =
        event.payload.commits[event.payload.commits.length - 1]!.message ??
        "No message";

      // create a new deployment
      const deployment = await db
        .insert(deployments)
        .values({
          siteId: site.id,
          status: "QUEUED",
          branch: pushedBranchName,
          commitMessage: commitMessage,
          commitHash: event.payload.after,
          buildLogs: null,
        })
        .returning();

      const [execution, operation] = await requestBuild(
        deployment[0]!.id,
        event.payload.repository.html_url,
        event.payload.after,
      );

      // add the execution name to the deployment
      await db
        .update(deployments)
        .set({
          gcp_job_operation_name: operation,
          gcp_job_execution_name: execution,
        })
        .where(eq(deployments.id, deployment[0]!.id));

      console.log(execution, operation);
      console.log("Deployment row", deployment);
    }
  }

  console.log("Sites using this repo:", data);
});

export async function GET(request: Request) {
  console.log("GET Request:", {
    url: request.url,
    headers: Object.fromEntries(request.headers),
  });

  return NextResponse.json({ message: "GET request received" });
}

export async function POST(request: NextRequest) {
  // if x-github-event is 'push', then we need to find all sites that are using this repo and create a new deployment for each of them

  const signature = request.headers.get("x-hub-signature-256");
  const id = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");

  if (!signature || !id || !event) {
    // bad request
    return new Response("Bad Request", { status: 400 });
  }
  if (event !== "push") {
    // not implemented
    return new Response("Not Implemented", { status: 501 });
  }

  const body = await request.text();
  if (!(await webhooks.verify(body, signature))) {
    return new Response("Unauthorized", { status: 401 });
  }

  await webhooks.receive({
    id: id,
    name: event,
    payload: JSON.parse(body) as unknown as EventPayloadMap["push"],
  });

  return new Response("OK", { status: 200 });
}

function handleRepoPush(request: NextRequest) {
  // we need to create a new deployment for each site that is using this repo
}
