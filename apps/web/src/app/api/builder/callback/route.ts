import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { deployments, sites, siteSubdomains } from "~/server/db/schema";
import { getJobStatus } from "~/server/lib/build";
import { getServerBuildStatus } from "~/server/lib/serverBuild";
import { redis } from "~/server/redis";
import { PoliciesClient } from "@google-cloud/iam";

import { ArtifactRegistryClient } from "@google-cloud/artifact-registry";
import { ServicesClient } from "@google-cloud/run";
import { env } from "~/env";
import { google } from "@google-cloud/run/build/protos/protos";
import { envVarEntry } from "~/server/api/routers/sites";

const bodySchema = z.object({
  status: z.string(),
});

const artifactRegistryClient = new ArtifactRegistryClient({});
const servicesClient = new ServicesClient({});
const policiesClient = new PoliciesClient();

export async function POST(request: NextRequest) {
  // get the deployment_id from search params
  const { searchParams } = new URL(request.url);

  const parsedBody = bodySchema.parse(await request.json());

  const deployment_id = searchParams.get("deployment_id");

  if (!deployment_id) {
    return NextResponse.json(
      { error: "Invalid input", details: "Missing deployment_id" },
      { status: 400 },
    );
  }

  const deployment = await db.query.deployments.findFirst({
    where: eq(deployments.id, deployment_id),
    with: {
      site: true,
    },
  });

  if (!deployment?.gcp_job_operation_name) {
    return NextResponse.json(
      { error: "Deployment not found", details: "Invalid deployment_id" },
      { status: 404 },
    );
  }

  if (deployment.site.type === "server") {
    // await getServerBuildStatus(deployment.gcp_job_operation_name);
    // TODO: handle bulid appropraitely and deploy lol
    // we should have the container image now pushed up so lets check

    console.log("[Deployer] Server deployment detected");
    console.log("[Deployer] Looking for artifact...");
    const artifactRequestName = `projects/${env.GOOGLE_CLOUD_PROJECT}/locations/us/repositories/gcr.io/packages/zercel-${deployment.site.id}/tags/${deployment.id}`;

    const [artifact] = await artifactRegistryClient.getTag({
      name: artifactRequestName,
    });

    if (!artifact) {
      return NextResponse.json(
        { message: "Artifact not found" },
        { status: 404 },
      );
    }
    console.log("[Deployer] Artifact found");

    // do we have a cloud run service to deploy this to?
    const deploymentEnv = [];
    const userEnvVars = envVarEntry
      .array()
      .safeParse(JSON.parse(deployment.environmentVariables ?? "[]"));

    if (userEnvVars.success) {
      for (const envVar of userEnvVars.data) {
        // if name is empty then skip
        if (!envVar.key || envVar.key.trim() === "") {
          continue;
        }
        deploymentEnv.push({
          name: envVar.key,
          value: envVar.value,
        });
      }
    }

    deploymentEnv.push({
      name: "NODE_ENV",
      value: "production",
    });

    // Futureproofing: Maybe we can support version skew protection in the future!
    deploymentEnv.push({
      name: "VERCEL_SKEW_PROTECTION_ENABLED",
      value: "1",
    });

    deploymentEnv.push({
      name: "VERCEL_DEPLOYMENT_ID",
      value: deployment.id,
    });

    if (!deployment.site.gcp_cloud_run_service) {
      // we need to create one!
      console.log("[Deployer] Creating Cloud Run service...");

      try {
        const serviceRequest: google.cloud.run.v2.ICreateServiceRequest = {
          parent: `projects/${env.GOOGLE_CLOUD_PROJECT}/locations/us-central1`,
          service: {
            generation: 2,
            // name: `zercel-${deployment.site.id}`,
            template: {
              containers: [
                {
                  image: `gcr.io/${env.GOOGLE_CLOUD_PROJECT}/zercel-${deployment.site.id}:${deployment.id}`,
                  env: deploymentEnv,
                },
              ],
              revision: `z${deployment.site.id}-${deployment.id.slice(0, 7)}`,
              scaling: {
                maxInstanceCount: 1,
                minInstanceCount: 0,
              },
            },
            traffic: [
              {
                percent: 100,
                // FIXME: This traffic config resets the other tags
                revision: `z${deployment.site.id}-${deployment.id.slice(0, 7)}`,
                tag: `z${deployment.id.slice(0, 7)}`,
                type: "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
              },
            ],
            invokerIamDisabled: false,
            scaling: {},
          },
          serviceId: `z${deployment.site.id}`,
        };

        console.log("Request", serviceRequest);

        const [resp] = await servicesClient.createService(serviceRequest);
        console.log("Service created", resp);

        const [service] = await resp.promise();

        const [policy] = await servicesClient.getIamPolicy({
          resource: `projects/${env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/services/z${deployment.site.id}`,
        });

        await servicesClient.setIamPolicy({
          policy: {
            bindings: [
              {
                role: "roles/run.invoker",
                members: ["allUsers"],
              },
            ],
          },
          resource: `projects/${env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/services/z${deployment.site.id}`,
        });

        // set the deployment.site.gcp_cloud_run_service

        await db
          .update(sites)
          .set({
            gcp_cloud_run_service: `projects/${env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/services/z${deployment.site.id}`,
          })
          .where(eq(sites.id, deployment.site.id));

        let targetUrl = service.urls?.[0];

        if (targetUrl) {
          targetUrl = targetUrl.replace(/\/+$/, "");
          // set the url on the deployment
          await db
            .update(deployments)
            .set({
              gcp_cloud_run_url: targetUrl,
            })
            .where(eq(deployments.id, deployment.id));

          const subdomains = await db.query.siteSubdomains.findMany({
            where: eq(siteSubdomains.siteId, deployment.site.id),
          });

          // we also need to set the url since this is the first
          for (const subdomain of subdomains) {
            if (subdomain?.subdomain) {
              await redis.set(`sha:${subdomain.subdomain}`, `url:${targetUrl}`);
            }
          }
        }
      } catch (err) {
        console.log("Error creating service", err);
        console.log(JSON.stringify(err, null, 2));
      }
    } else {
      console.log("[Deployer] Updating Cloud Run service...");
      // deploy new revision, and redirect traffic to it (TODO: dont always redirect traffic)
      const serviceUpdateRequest: google.cloud.run.v2.IUpdateServiceRequest = {
        service: {
          name: deployment.site.gcp_cloud_run_service,
          generation: 2,
          // name: `zercel-${deployment.site.id}`,
          template: {
            containers: [
              {
                image: `gcr.io/${env.GOOGLE_CLOUD_PROJECT}/zercel-${deployment.site.id}:${deployment.id}`,
                env: deploymentEnv,
              },
            ],
            revision: `z${deployment.site.id}-${deployment.id.slice(0, 7)}`,
            scaling: {
              maxInstanceCount: 1,
              minInstanceCount: 0,
            },
          },
          traffic: [
            {
              percent: 100,
              revision: `z${deployment.site.id}-${deployment.id.slice(0, 7)}`,
              tag: `z${deployment.id.slice(0, 7)}`,
              type: "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            },
          ],
          scaling: {},
        },
      };

      console.log("[Deployer] Update request");

      try {
        await servicesClient.updateService(serviceUpdateRequest);
      } catch (err) {
        console.log("Error creating service", err);
        console.log(JSON.stringify(err, null, 2));
      }
    }

    return NextResponse.json({ message: "POST request received" });

    // console.log("Artifact", artifact);
  } else {
    const job = await getJobStatus(deployment?.gcp_job_operation_name);

    if (parsedBody.status !== "started") {
      // lets wait about 10 seconds before we check the status
      try {
        const res = await job?.promise();
        console.log("[JOB] Job succeded", job.latestResponse.result);
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
            await redis.set(
              `sha:${subdomain.subdomain}`,
              deployment.commitHash,
            );
          }
        }
      } catch (err) {
        console.log("[JOB] Job failed");
        await db
          .update(deployments)
          .set({
            status: "FAILED",
          })
          .where(eq(deployments.id, deployment.id));
      }
    } else {
      await db
        .update(deployments)
        .set({ status: "BUILDING" })
        .where(eq(deployments.id, deployment.id));

      return NextResponse.json({ message: "Job is running" });
    }

    // console.log("Job", job);

    return NextResponse.json({ message: "POST request received" });
  }
}
