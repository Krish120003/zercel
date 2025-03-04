"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GitBranch,
  GitCommit,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

// Add this helper function before the component
const getStatusBadge = (status: string) => {
  const statusMap = {
    SUCCEEDED: {
      color: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      icon: CheckCircle2,
    },
    FAILED: {
      color: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      icon: AlertCircle,
    },
    BUILDING: {
      color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      icon: Clock,
    },
    QUEUED: {
      color: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
      icon: Clock,
    },
  };

  const defaultStatus = {
    color: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
    icon: Clock,
  };

  return statusMap[status as keyof typeof statusMap] || defaultStatus;
};

// Add this interface above the DeploymentItem component
interface Deployment {
  id: string;
  status: "SUCCEEDED" | "FAILED" | "BUILDING" | "QUEUED";
  branch: string | null;
  createdAt: Date;
  commitHash: string | null;
  commitMessage: string | null;
}

// First, create a DeploymentItem component for better organization
export const DeploymentItem = ({ deployment }: { deployment: Deployment }) => {
  const { color, icon: StatusIcon } = getStatusBadge(deployment.status);

  const [animationRef] = useAutoAnimate({
    duration: 1,
  });

  const [isShowingLogs, setIsShowingLogs] = useState<boolean>(false);
  const isRefetchingLogs = deployment.status !== "SUCCEEDED";

  const { data, isLoading } = api.sites.getDeploymentLogs.useQuery(
    {
      deploymentId: deployment.id,
    },
    {
      enabled: isShowingLogs,
      // Add refetch interval if status is not SUCCEEDED
      refetchInterval: isRefetchingLogs ? 15000 : false,
    },
  );

  return (
    <div
      ref={animationRef}
      className="group rounded-lg border bg-background p-4 transition-all hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h3 className="font-mono font-medium">
                {deployment.id.slice(0, 8)}
              </h3>
              <a
                // href={deployment.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center text-sm text-muted-foreground hover:underline"
              >
                <GitBranch className="mr-2 h-4 w-4" />
                <span>{deployment.branch}</span>
              </a>
              <Badge className={`${color} flex items-center gap-1 capitalize`}>
                <StatusIcon className="h-3 w-3" />
                {deployment.status.toLowerCase()}
              </Badge>
            </div>
            <div>
              {deployment.commitMessage ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {deployment.commitMessage}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No commit message
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              {new Date(deployment.createdAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <GitCommit className="mr-2 h-4 w-4" />
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {deployment.commitHash?.slice(0, 7)}
              </code>
            </div>
          </div>
        </div>

        <Button onClick={() => setIsShowingLogs((prev) => !prev)}>Logs</Button>
      </div>

      {isShowingLogs && (
        <>
          <ol className="grid w-full py-4 font-mono text-sm">
            {isLoading ? (
              // Add loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <li
                  key={index}
                  className="grid w-full grid-cols-12 gap-2 px-4 py-1"
                >
                  <div className="col-span-3">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="col-span-9">
                    <Skeleton className="h-4 w-full" />
                  </div>
                </li>
              ))
            ) : data?.length === 0 ? (
              <li className="px-4 text-muted-foreground">
                No logs available for this deployment.
              </li>
            ) : (
              data?.map((log, index) => (
                <li
                  key={index}
                  className={cn(
                    "grid w-full cursor-pointer grid-cols-12 px-4",
                    {
                      "bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-500":
                        log.message.toLowerCase().trim().startsWith("error"),
                    },
                  )}
                >
                  <div className="col-span-3">{log.timestamp}</div>
                  <div className="col-span-9 whitespace-pre-wrap break-words">
                    {log.message}
                  </div>
                </li>
              ))
            )}
          </ol>
        </>
      )}
    </div>
  );
};
