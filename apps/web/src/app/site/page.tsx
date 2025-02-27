import { Nav, Footer } from "../_components/landing";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link"; // Add this import
import { SubdomainManager } from "./_components/subdomain-manager";
import { auth } from "~/server/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { ChevronLeft, GitBranch } from "lucide-react"; // Add this import for the icon
import { Badge } from "~/components/ui/badge"; // Add this import
import { AlertCircle, CheckCircle2, Clock, GitCommit } from "lucide-react"; // Add these imports

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) {
    return redirect("/api/auth/signin");
  }

  const searchParamsAwaited = await searchParams;
  const siteId = searchParamsAwaited.id;

  if (!siteId || typeof siteId !== "string") {
    return redirect("/404");
  }

  const siteData = await api.sites.get({ id: siteId });

  if (!siteData) {
    return redirect("/404");
  }

  const deployments = siteData.deployments;
  deployments.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <HydrateClient>
      <Nav />
      <main className="min-h-screen">
        <div className="flex flex-col gap-8">
          <div className="px-8">
            <div className="container mx-auto px-8 pt-16">
              <Link
                href="/"
                className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to projects
              </Link>
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-4 text-balance">
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl">
                    Manage {siteData.name}
                  </h1>
                  <p className="max-w-2xl opacity-60">
                    Manage your deployment settings, view logs, and configure
                    domains for your application.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-[calc(80vh)] w-full border-t-2 bg-neutral-50 p-8 dark:border-t-neutral-800 dark:bg-neutral-900">
            <div className="container mx-auto px-8">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p>
                        <span className="font-semibold">Repository:</span>{" "}
                        {siteData.repository}
                      </p>
                      <p>
                        <span className="font-semibold">Type:</span>{" "}
                        {siteData.type}
                      </p>
                      {siteData.description && (
                        <p>
                          <span className="font-semibold">Description:</span>{" "}
                          {siteData.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-xl font-medium">Deployments</h3>
                    <div className="grid gap-3">
                      {deployments.map((deployment) => (
                        <DeploymentItem
                          key={deployment.id}
                          deployment={deployment}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Domain Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SubdomainManager
                        siteId={siteData.id}
                        subdomains={siteData.subdomains}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </HydrateClient>
  );
}

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
  branch: string;

  createdAt: string;
  commitHash: string;
}

// First, create a DeploymentItem component for better organization
const DeploymentItem = ({ deployment }: { deployment: Deployment }) => {
  const { color, icon: StatusIcon } = getStatusBadge(deployment.status);
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background p-4 transition-all hover:shadow-md">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-medium">
            Deployment {deployment.id.slice(0, 8)}
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            {new Date(deployment.createdAt).toLocaleString()}
          </div>
          <div className="flex items-center">
            <GitCommit className="mr-2 h-4 w-4" />
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {deployment.commitHash.slice(0, 7)}
            </code>
          </div>
        </div>
        {/* <div className="flex items-center gap-4 text-sm text-muted-foreground">
          
        </div> */}
      </div>
    </div>
  );
};
