import { JobsClient } from "@google-cloud/run";
import { env } from "~/env";

const jobsClient = new JobsClient({
  apiEndpoint: "us-east1-run.googleapis.com", // <- Google whyyyyyyyyyy
});

export async function requestBuild(
  deployment_id: string,
  github_clone_url: string,
  sha?: string,
) {
  // Replace these with your actual values
  const projectId = env.GOOGLE_CLOUD_PROJECT;
  const location = env.BUILDER_JOB_LOCATION;
  const jobName = env.BUILDER_JOB_NAME;

  const envOverrides = [];

  envOverrides.push({ name: "REPO_URL", value: github_clone_url });
  envOverrides.push({
    name: "CALLBACK_URL",
    value: env.BUILDER_CALLBACK_URL + "?deployment_id=" + deployment_id,
  });

  if (sha) {
    envOverrides.push({
      name: "REPO_SHA",
      value: sha,
    });
  }

  console.log("Got overrides");
  console.log(envOverrides);

  try {
    const [execution, operation] = await jobsClient.runJob({
      name: `projects/${projectId}/locations/${location}/jobs/${jobName}`,
      overrides: {
        containerOverrides: [
          {
            env: envOverrides,
          },
        ],
      },
    });

    console.log("Job submitted", operation?.name);
    return operation;
  } catch (error) {
    console.error("Error submitting job:", error);
  }
}

export async function getJobStatus(operationName: string) {
  try {
    const response = await jobsClient.checkRunJobProgress(operationName);
    return response;
  } catch (error) {
    console.error("Error fetching job status:", error);
    throw error;
  }
}
