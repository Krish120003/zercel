import { Worker } from "bullmq";
import { env } from "./env.js";

const worker = new Worker(
  "build-jobs",
  async (job) => {
    try {
      // Log the job details
      console.log("Processing job:", {
        id: job.id,
        name: job.name,
        data: job.data,
        timestamp: new Date().toISOString(),
      });

      // You can perform any job processing here

      // Return a result (optional)
      return { processed: true, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error("Error processing job:", error);
      throw error;
    }
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      username: env.REDIS_USERNAME,
      password: env.REDIS_PASSWORD,
      db: 0, // You can specify the Redis database number here if needed
    },
  }
);

// Listen for worker events
worker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed with error ${err.message}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await worker.close();
});
