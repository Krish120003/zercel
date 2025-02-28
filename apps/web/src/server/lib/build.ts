import { JobsClient, ExecutionsClient } from "@google-cloud/run";
import { Logging } from "@google-cloud/logging";
import { env } from "~/env";
import { deployments } from "../db/schema";
import { envVarEntry } from "../api/routers/sites";

const jobsClient = new JobsClient({
  apiEndpoint: "us-east1-run.googleapis.com", // <- Google whyyyyyyyyyy
});

const executionsClient = new ExecutionsClient();

const logging = new Logging();
type Deployment = typeof deployments.$inferSelect;

export async function requestBuild(
  deployment: Deployment,
  github_clone_url: string,
  sha?: string,
) {
  // Replace these with your actual values
  const projectId = env.GOOGLE_CLOUD_PROJECT;
  const location = env.BUILDER_JOB_LOCATION;
  const jobName = env.BUILDER_JOB_NAME;

  const envOverrides = [];

  console.log(deployment.environmentVariables);

  const userEnvVars = envVarEntry
    .array()
    .safeParse(JSON.parse(deployment.environmentVariables ?? "[]"));

  console.log("User Env vars", userEnvVars.success, userEnvVars.error);

  if (userEnvVars.success) {
    for (const envVar of userEnvVars.data) {
      envOverrides.push({
        name: envVar.key,
        value: envVar.value,
      });
    }
  }

  envOverrides.push({ name: "ZERCEL_REPO_URL", value: github_clone_url });
  envOverrides.push({
    name: "ZERCEL_CALLBACK_URL",
    value: env.BUILDER_CALLBACK_URL + "?deployment_id=" + deployment.id,
  });

  if (sha) {
    envOverrides.push({
      name: "ZERCEL_REPO_SHA",
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
    return [execution.metadata?.name, operation?.name];
  } catch (error) {
    console.error("Error submitting job:", error);
  }
  return [null, null];
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

export async function getJobLogs(exeutionName: string) {
  const execution = await executionsClient.getExecution({
    name: exeutionName,
  });

  const filterName = execution[0].name?.split("/").pop();

  const entries = await logging.getEntries({
    filter: `${filterName}`,
  });

  return entries;
}
