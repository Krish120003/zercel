"use client";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SiteHeaderProps {
  site: {
    id: string;
    name: string;
    type: "static" | "server";
    repository: string;
    activeDeployment: {
      id: string;
      status: string;
    } | null;
  };
}

export function SiteHeader({ site }: SiteHeaderProps) {
  const router = useRouter();
  const deploy = api.sites.deploy.useMutation({
    onSuccess: () => {
      toast.success("Deployment started");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">{site.name}</h1>
          <Badge variant="outline">{site.type}</Badge>
          {site.activeDeployment && <Badge variant="success">Live</Badge>}
        </div>
        <p className="text-muted-foreground mt-2 break-all">
          {site.repository}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/sites")}>
          Back to Sites
        </Button>
        <Button
          onClick={() => deploy.mutate({ siteId: site.id })}
          disabled={deploy.isLoading}
        >
          {deploy.isLoading ? "Deploying..." : "Deploy"}
        </Button>
      </div>
    </div>
  );
}
