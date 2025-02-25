import { Nav, Footer } from "../_components/landing";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import { SubdomainManager } from "./_components/subdomain-manager";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
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
      <main className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-900">
        <Nav />
        <div className="mx-auto w-full max-w-3xl flex-grow px-4 py-8">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-2xl font-bold">{siteData.name}</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Repository:</span>{" "}
                  {siteData.repository}
                </p>
                <p>
                  <span className="font-semibold">Type:</span> {siteData.type}
                </p>
                {siteData.description && (
                  <p>
                    <span className="font-semibold">Description:</span>{" "}
                    {siteData.description}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <SubdomainManager
                siteId={siteData.id}
                subdomains={siteData.subdomains}
              />
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </HydrateClient>
  );
}
