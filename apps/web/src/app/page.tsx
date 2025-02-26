import { api, HydrateClient } from "~/trpc/server";
import { LandingPage, Nav, Footer } from "./_components/landing";
import { auth } from "~/server/auth";
import { RepositoryList } from "./_components/repository-list";

async function Deploy() {
  const repos = await api.github.getUserRepos();

  // TODO: Do a check if this is first deploy

  return (
    <div className="flex flex-col gap-8">
      <div className="container mx-auto flex flex-col gap-4 text-balance px-8 pt-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl">
          Deploy your first project{" "}
          <span className="relative">
            <span className="relative z-10">instantly.</span>
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-violet-600/50 to-cyan-600/50 blur-sm" />
          </span>
        </h1>
        <p className="max-w-2xl opacity-60">
          {`Connect your GitHub repository and we'll automatically build, deploy, and scale your applications in seconds.`}
        </p>
      </div>

      <div className="min-h-[calc(80vh)] w-full border-t-2 bg-neutral-50 p-8 dark:border-t-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto overflow-hidden rounded-2xl border bg-background p-8 dark:border-neutral-800">
          <RepositoryList repos={repos} />
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await auth();

  if (!session || !session.user) {
    return (
      <HydrateClient>
        <LandingPage />
        <Footer />
      </HydrateClient>
    );
  }

  return (
    <HydrateClient>
      <Nav />
      <main className="min-h-screen">
        <Deploy />
      </main>
      <Footer />
    </HydrateClient>
  );
}
