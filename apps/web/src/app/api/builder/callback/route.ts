import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { deployments, sites, siteSubdomains } from "~/server/db/schema";
import { getJobStatus } from "~/server/lib/build";
import { redis } from "~/server/redis";

const bodySchema = z.object({
  status: z.string(),
});

export async function POST(request: NextRequest) {
  // get the deployment_id from search params
  const { searchParams } = new URL(request.url);
  console.log("Search params", searchParams);

  //   get the body

  const parsedBody = bodySchema.parse(await request.json());
  console.log("Parsed body", parsedBody);

  const deployment_id = searchParams.get("deployment_id");
  console.log("Deployment ID", deployment_id);

  if (!deployment_id) {
    return NextResponse.json(
      { error: "Invalid input", details: "Missing deployment_id" },
      { status: 400 },
    );
  }

  const deployment = await db.query.deployments.findFirst({
    where: eq(deployments.id, deployment_id),
  });

  console.log("Deployment", deployment);

  if (!deployment?.gcp_job_operation_name) {
    return NextResponse.json(
      { error: "Deployment not found", details: "Invalid deployment_id" },
      { status: 404 },
    );
  }

  const job = await getJobStatus(deployment?.gcp_job_operation_name);

  if (parsedBody.status !== "started") {
    // lets wait about 10 seconds before we check the status
    await job?.promise();
  }

  if (!job?.done) {
    // todo: mark as building
    await db
      .update(deployments)
      .set({ status: "BUILDING" })
      .where(eq(deployments.id, deployment.id));

    return NextResponse.json({ message: "Job is running" });
  }

  if (job?.done) {
    console.log("Job is done", job.latestResponse.result);

    if (job.latestResponse.result === "error") {
      await db
        .update(deployments)
        .set({
          status: "FAILED",
        })
        .where(eq(deployments.id, deployment.id));
    } else if (job.latestResponse.result === "response") {
      const updatedDeployment = await db
        .update(deployments)
        .set({
          status: "SUCCEEDED",
        })
        .where(eq(deployments.id, deployment.id))
        .returning();

      console.log("Updated deployment", updatedDeployment);

      // set this as active deployment
      await db
        .update(sites)
        .set({
          activeDeploymentId: deployment.id,
        })
        .where(eq(sites.id, deployment.siteId));

      // get subdomains for this site and set them all to the new commit hash
      const subdomains = await db.query.siteSubdomains.findMany({
        where: eq(siteSubdomains.siteId, deployment.siteId),
      });

      for (const subdomain of subdomains) {
        if (deployment.commitHash && subdomain?.subdomain) {
          await redis.set(`sha:${subdomain.subdomain}`, deployment.commitHash);
        }
      }
    }
  }

  // console.log("Job is done?", job.latestResponse);
  // job.result
  // await db
  //   .update(deployments)
  //   .set({
  //     status: "READY",
  //     buildLogs: job.response?.buildLogs,
  //   })
  //   .where(eq(deployments.id, deployment_id));

  return NextResponse.json({ message: "POST request received" });
}
