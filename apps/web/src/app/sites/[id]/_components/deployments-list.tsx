"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeploymentProps {
  site: {
    id: string;
    activeDeploymentId: string | null;
    deployments: Array<{
      id: string;
      status: "QUEUED" | "BUILDING" | "FAILED" | "SUCCEEDED";
      branch: string;
      commitHash: string | null;
      deploymentUrl: string | null;
      createdAt: Date;
      completedAt: Date | null;
    }>;
  };
}

export function DeploymentsList({ site }: DeploymentProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return "success";
      case "FAILED":
        return "destructive";
      case "BUILDING":
        return "warning";
      default:
        return "secondary";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployments</CardTitle>
        <CardDescription>Recent deployments and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {site.deployments.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No deployments yet
            </p>
          ) : (
            site.deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(deployment.status)}>
                      {deployment.status}
                    </Badge>
                    {site.activeDeploymentId === deployment.id && (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Branch: {deployment.branch}
                    {deployment.commitHash &&
                      ` @ ${deployment.commitHash.slice(0, 7)}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Created: {formatDate(deployment.createdAt)}
                    {deployment.completedAt &&
                      ` • Completed: ${formatDate(deployment.completedAt)}`}
                  </p>
                </div>
                {deployment.deploymentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(deployment.deploymentUrl, "_blank")
                    }
                  >
                    View
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
