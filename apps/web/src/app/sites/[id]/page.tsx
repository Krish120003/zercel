import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { SiteHeader } from "./_components/site-header";
import { DeploymentsList } from "./_components/deployments-list";
import { SubdomainManager } from "./_components/subdomain-manager";
import { EnvironmentVariables } from "./_components/environment-variables";

interface SitePageProps {
  params: {
    id: string;
  };
}

export default async function SitePage({ params }: SitePageProps) {
  const site = await api.sites.get({ id: (await params).id });

  console.log("TRPC RETURNED", site);

  if (!site) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <SiteHeader site={site} />

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <DeploymentsList site={site} />
          <EnvironmentVariables site={site} />
        </div>
        <div>
          <SubdomainManager site={site} />
        </div>
      </div>
    </div>
  );
}
