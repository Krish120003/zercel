// const { CloudTasksClient } = await import("@google-cloud/tasks");
import { CloudTasksClient } from "@google-cloud/tasks";
import { protos } from "@google-cloud/tasks";
import { env } from "~/env";

export type ITask = protos.google.cloud.tasks.v2.ITask;

let tasksClient: InstanceType<typeof CloudTasksClient> | null = null;

export function getCloudTasksClient() {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

export function getQueuePath() {
  return getCloudTasksClient().queuePath(
    env.GOOGLE_CLOUD_PROJECT,
    env.GOOGLE_CLOUD_TASKS_LOCATION,
    env.GOOGLE_CLOUD_TASKS_QUEUE,
  );
}
