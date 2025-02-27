"use client";
import { api } from "~/trpc/react";
import { DeploymentItem } from "./deployment-item";
import type { inferRouterOutputs } from "@trpc/server";
import { SitesRouter } from "~/server/api/routers/sites";
import { useRef, useEffect } from "react";

type RouterOutput = inferRouterOutputs<SitesRouter>;

interface DeploymentListProps {
  siteId: string;
  initialSiteData: RouterOutput["get"];
}

export const DeploymentList = ({
  siteId,
  initialSiteData,
}: DeploymentListProps) => {
  const deploymentsRef = useRef(initialSiteData?.deployments ?? []);

  const { data: site } = api.sites.get.useQuery(
    {
      id: siteId,
    },
    {
      refetchInterval: deploymentsRef.current.some(
        (deployment) =>
          deployment.status === "BUILDING" || deployment.status === "QUEUED",
      )
        ? 5000
        : false,
      initialData: initialSiteData,
    },
  );

  useEffect(() => {
    if (site?.deployments) {
      deploymentsRef.current = site.deployments;
    }
  }, [site?.deployments]);

  const deployments = site?.deployments ?? [];

  return (
    <div className="grid gap-3">
      {deployments.map((deployment) => (
        <DeploymentItem key={deployment.id} deployment={deployment} />
      ))}
    </div>
  );
};
