import { z } from "zod";
import { NextResponse } from "next/server";
import { JobsClient } from "@google-cloud/run";
import { env } from "~/env";

const jobsClient = new JobsClient();

export async function requestBuild(github_clone_url: string, sha?: string) {
  // Replace these with your actual values
  const projectId = env.GOOGLE_CLOUD_PROJECT;
  const location = env.BUILDER_JOB_LOCATION;
  const jobName = env.BUILDER_JOB_NAME;

  const envOverrides = [];

  envOverrides.push({ name: "REPO_URL", value: github_clone_url });

  if (sha) {
    envOverrides.push({
      name: "REPO_SHA",
      value: sha,
    });
  }

  console.log("Got overrides");
  console.log(envOverrides);

  try {
    const [execution] = await jobsClient.runJob({
      name: `projects/${projectId}/locations/${location}/jobs/${jobName}`,
      overrides: {
        containerOverrides: [
          {
            env: envOverrides,
          },
        ],
      },
    });

    console.log("Job submitted");
    return execution;
  } catch (error) {
    console.error("Error submitting job:", error);
  }
}
