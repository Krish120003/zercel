import { redirect } from "next/navigation";
import { Nav, Footer } from "../_components/landing";
import { api, HydrateClient } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";

import DeployForm from "./_components/deploy-form";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const searchParamsAwaited = await searchParams;
  const owner = searchParamsAwaited.owner;
  const repo = searchParamsAwaited.repo;

  if (
    !owner ||
    !repo ||
    typeof owner !== "string" ||
    typeof repo !== "string"
  ) {
    return redirect("/404");
  }

  try {
    const repoDetails = await api.github.getRepoDetailsByName({
      owner,
      repo,
    });

    return (
      <HydrateClient>
        <main className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-900">
          <Nav />
          <div className="mx-auto w-full max-w-3xl flex-grow px-4 py-8">
            <div className="w-full rounded-lg border border-border bg-card p-6">
              <DeployForm repoDetails={repoDetails} />
            </div>
          </div>
          <Footer />
        </main>
      </HydrateClient>
    );
  } catch (error) {
    console.log(error);
    return (
      <HydrateClient>
        <Nav />
        <main className="flex min-h-screen flex-col">
          <div className="mx-auto max-w-3xl flex-grow px-4 py-8">
            <h1 className="mb-6 text-2xl font-bold">Deploy Repository</h1>
            <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive">
              <h2 className="text-lg font-medium">
                Error accessing repository
              </h2>
              <p className="mt-2">
                Could not load details for repository: {owner}/{repo}. Please
                make sure the repository exists and you have access to it.
              </p>
            </div>
          </div>
          <Footer />
        </main>
      </HydrateClient>
    );
  }
}
