import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import Link from "next/link";

export async function SitesList() {
  const sites = await api.sites.list();

  if (sites.length === 0) {
    return (
      <div className="py-10 text-center">
        <h3 className="mb-2 text-lg font-semibold">No sites yet</h3>
        <p className="text-muted-foreground">
          Create your first site to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sites.map((site) => (
        <Card key={site.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="truncate">{site.name}</CardTitle>
              <Badge variant={site.activeDeployment ? "default" : "secondary"}>
                {site.activeDeployment ? "Live" : "Not Deployed"}
              </Badge>
            </div>
            <CardDescription className="truncate">
              {site.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{site.type}</Badge>
              </div>
              {/* {site.customDomain && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Domain:</span>
                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                    {site.customDomain}
                  </code>
                </div>
              )} */}
              {site.subdomains?.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subdomains:</span>
                  <div className="flex gap-1">
                    {site.subdomains.map((subdomain) => (
                      <code
                        key={subdomain.id}
                        className="bg-muted rounded px-1 py-0.5 text-xs"
                      >
                        {subdomain.subdomain}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4">
                <Link href={`/sites/${site.id}`} className="w-full">
                  <Button className="w-full">Manage Site</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
