import { Nav, Footer } from "../_components/landing";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link"; // Add this import
import { SubdomainManager } from "./_components/subdomain-manager";
import { auth } from "~/server/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { ChevronLeft, ExternalLink } from "lucide-react"; // Add this import for the icon
import { DeploymentItem } from "./_components/deployment-item";
import { DeploymentList } from "./_components/deployment-list";
import { SiGithub } from "@icons-pack/react-simple-icons";

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

  return (
    <HydrateClient>
      <Nav />
      <main className="min-h-screen">
        <div className="flex flex-col gap-8">
          <div className="px-8">
            <div className="container mx-auto px-8 pt-12">
              <Link
                href="/"
                className="mb-5 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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
                    <CardContent className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <a
                          className="flex items-center gap-2 hover:underline"
                          href={`https://github.com/${siteData.repository}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <SiGithub className="h-4 w-4" />
                          {siteData.repository}
                        </a>
                        <p>
                          <span className="font-semibold">Type:</span>{" "}
                          {siteData.type}
                        </p>
                      </div>
                      <div>
                        {siteData.subdomains &&
                        siteData.subdomains.length > 0 ? (
                          <div className="flex flex-col justify-end gap-1">
                            {siteData.subdomains
                              .slice(0, 4)
                              .map((subdomain, index) => (
                                <a
                                  key={index}
                                  href={`https://${subdomain.subdomain}.zercel.dev`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex cursor-pointer items-center justify-end gap-2 rounded-md text-muted-foreground hover:underline"
                                >
                                  {subdomain.subdomain}
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No domains configured
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-xl font-medium">Deployments</h3>
                    <DeploymentList
                      siteId={siteId}
                      initialSiteData={siteData}
                    />
                  </div>
                  <div>Environtment Variables are not currently supported.</div>
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
