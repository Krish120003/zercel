// Generated by Cursor (need to reivew for security)

import { env } from "~/env";
import { deployments } from "../db/schema";
import { BatchServiceClient } from "@google-cloud/batch";
import { google } from "@google-cloud/batch/build/protos/protos";

// Define the type for deployment
type Deployment = typeof deployments.$inferSelect;

// Define the interface for environment variable entries
interface EnvVarEntry {
  key: string;
  value: string;
}

type BatchJobResource = google.cloud.batch.v1.IJob;

/**
 * Submits a GCP Batch job to build a Docker container using a VM instance
 * This is used for server-type deployments that need containerization
 *
 * @param deployment The deployment record from the database
 * @param github_clone_url The GitHub repository URL to clone
 * @param sha The commit hash to checkout (optional)
 * @returns A tuple containing [jobName, jobId] or [null, null] if the job submission fails
 */
export async function requestServerBuild(
  deployment: Deployment,
  github_clone_url: string,
  sha?: string,
): Promise<[string | null, string | null]> {
  // Create a client for the Batch service
  const batchClient = new BatchServiceClient();

  // Get configuration from environment variables
  const projectId = env.GOOGLE_CLOUD_PROJECT;
  const location = env.BUILDER_JOB_LOCATION; // Using the same location as the Cloud Run job

  // Parse environment variables from the deployment
  const envVars: Record<string, string> = {};

  try {
    if (deployment.environmentVariables) {
      const userEnvVars = JSON.parse(
        deployment.environmentVariables,
      ) as EnvVarEntry[];
      for (const envVar of userEnvVars) {
        if (envVar.key && envVar.key.trim() !== "") {
          envVars[envVar.key] = envVar.value || "";
        }
      }
    }
  } catch (error) {
    console.error("Error parsing environment variables:", error);
  }

  // Add required environment variables for the build
  envVars.ZERCEL_REPO_URL = github_clone_url;
  envVars.ZERCEL_CALLBACK_URL = `${env.BUILDER_CALLBACK_URL}?deployment_id=${deployment.id}`;
  envVars.ZERCEL_BUILD_TYPE = "server"; // Explicitly set to server type

  if (sha) {
    envVars.ZERCEL_REPO_SHA = sha;
  }

  // Create a unique job name based on the deployment ID
  const jobName = `zercel-build-${deployment.id}`;

  // Define our custom Dockerfile content
  const dockerfileContent = `FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./

# Install dependencies based on lock file
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \\
    elif [ -f package-lock.json ]; then npm ci; \\
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \\
    else npm install; \\
    fi

# Copy source code
COPY . .

# Build the application
RUN if grep -q "\\\"build\\\":" package.json; then \\
      if [ -f yarn.lock ]; then yarn build; \\
      elif [ -f pnpm-lock.yaml ]; then pnpm run build; \\
      else npm run build; \\
      fi; \\
    fi

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app .

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
`;

  // Define the startup script for the VM
  const startupScript = `#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Install necessary packages
apt-get update
apt-get install -y git curl apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Start Docker service
systemctl start docker

# Add docker to $PATH
export PATH=$PATH:/usr/bin

# Set environment variables
${Object.entries(envVars)
  .map(([key, value]) => `export ${key}="${value}"`)
  .join("\n")}

# Function to send callback
send_callback() {
    local exit_code=$?
    local status="success"
    if [ $exit_code -ne 0 ]; then
        status="error"
    fi
    
    if [ ! -z "$ZERCEL_CALLBACK_URL" ]; then
        curl -s --max-time 10 -X POST "$ZERCEL_CALLBACK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"exit_code\":$exit_code}" || {
            echo "Warning: Callback failed to send, but continuing..."
        }
    fi
}

# Set up trap to catch script exit
trap send_callback EXIT

# Send initial callback
if [ ! -z "$ZERCEL_CALLBACK_URL" ]; then
    response=$(curl -s -X POST "$ZERCEL_CALLBACK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"status\":\"started\",\"exit_code\":0}")
    
    if [ $? -eq 0 ]; then
        echo "Initial callback response: $response"
    else
        echo "Warning: Initial callback failed to send"
    fi
}

# Create workspace directory
mkdir -p /workspace
cd /workspace

# Clone the repository
git clone --depth 1 "$ZERCEL_REPO_URL" repo
cd repo

# Checkout specific commit if provided
if [ ! -z "$ZERCEL_REPO_SHA" ]; then
  git checkout $ZERCEL_REPO_SHA
fi

# Create our custom Dockerfile
cat > Dockerfile << 'EOL'
${dockerfileContent}
EOL

# Configure Docker to use gcloud as the credential helper
echo "Configuring Docker authentication for Google Container Registry"
gcloud auth configure-docker gcr.io --quiet

# Build the Docker container
IMAGE_NAME="gcr.io/${projectId}/server-builds/zercel-${deployment.id}:$ZERCEL_REPO_SHA"
docker build -t $IMAGE_NAME .

# Push the container to registry
echo "Pushing container to Google Container Registry"
docker push $IMAGE_NAME

echo "Build and push completed successfully"

`;

  // Define the Batch job using a VM instance
  const job: BatchJobResource = {
    name: `projects/${projectId}/locations/${location}/jobs/${jobName}`,
    taskGroups: [
      {
        taskSpec: {
          runnables: [
            {
              script: {
                text: startupScript,
              },
            },
          ],
          maxRetryCount: 0,
          maxRunDuration: {
            seconds: 3600,
          }, // 1 hour timeout
        },
        taskCount: 1,
      },
    ],
    logsPolicy: {
      destination: "CLOUD_LOGGING",
    },
    allocationPolicy: {
      instances: [
        {
          // Use a predefined instance template or specify machine configuration directly
          policy: {
            provisioningModel: "STANDARD",
            machineType: "e2-medium",
            // Use Debian or Ubuntu image that supports Docker installation
            bootDisk: {
              image: "projects/debian-cloud/global/images/family/debian-11",
              sizeGb: 20,
              type: "pd-standard",
            },
          },
        },
      ],
      serviceAccount: {
        email: `batch-job-sa@vercel-clone-1.iam.gserviceaccount.com`,
        // scopes: [
        //   "https://www.googleapis.com/auth/cloud-platform", // Full access to GCP services
        // ],
      },
    },
  };

  try {
    // Actually submit the job to GCP Batch
    console.log("Submitting batch job to GCP...");

    // Use a different approach to handle the response
    const response = await batchClient.createJob({
      parent: `projects/${projectId}/locations/${location}`,
      jobId: jobName,
      job: job,
    });

    // Extract the job name from the response
    const jobNameFromResponse = response[0]?.name ?? null;
    console.log("Batch job submitted:", jobNameFromResponse);

    // Extract the job ID from the response
    const jobId = jobNameFromResponse?.split("/").pop() ?? null;

    return [jobNameFromResponse, jobId];
  } catch (error) {
    console.error("Error submitting batch job:", error);
    return [null, null];
  }
}

/**
 * Gets the status of a GCP Batch job
 *
 * @param jobName The full name of the job
 * @returns The job status response
 */
export async function getServerBuildStatus(jobName: string) {
  try {
    // Create a client for the Batch service
    const batchClient = new BatchServiceClient();

    // Get the job status
    const [job] = await batchClient.getJob({ name: jobName });
    return job;
  } catch (error) {
    console.error("Error fetching job status:", error);
    throw error;
  }
}

/**
 * Gets the logs for a GCP Batch job
 *
 * @param jobName The full name of the job
 * @returns The job logs
 */
export async function getServerBuildLogs(jobName: string) {
  try {
    // For now, we'll just return a placeholder
    // In a real implementation, you would use the Cloud Logging API to fetch logs
    // based on the job name as a filter
    console.log(`Fetching logs for job: ${jobName}`);

    // Create a client for the Batch service
    const batchClient = new BatchServiceClient();

    // Get the job status to check if it exists
    const [job] = await batchClient.getJob({ name: jobName });

    if (!job) {
      return [{ message: "Job not found" }];
    }

    return [
      {
        message: `Job status: ${job.status?.state ?? "Unknown"}. Detailed logs not yet implemented.`,
      },
    ];
  } catch (error) {
    console.error("Error fetching job logs:", error);
    throw error;
  }
}
