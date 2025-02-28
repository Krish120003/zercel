import { api, HydrateClient } from "~/trpc/server";
import { LandingPage, Nav, Footer } from "./_components/landing";
import { auth } from "~/server/auth";
import { RepositoryList } from "./_components/repository-list";
import { env } from "~/env";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ProjectItem } from "./_components/project-item";

async function Deploy({ first }: { first: boolean }) {
  const repos = await api.github.getUserRepos({ limit: 30 });

  return (
    <div className="flex flex-col gap-8">
      <div className="container mx-auto flex flex-col gap-4 text-balance px-8 pt-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl">
          Deploy your {first ? "first" : ""} project{" "}
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
          <RepositoryList initialRepos={repos} appLink={env.GITHUB_APP_URL} />
        </div>
      </div>
    </div>
  );
}

interface HomeProps {
  newMode?: boolean;
}

async function Home({ newMode = false }: HomeProps) {
  const sites = await api.sites.list();

  if (sites.length == 0 || newMode) {
    return <Deploy first={sites.length === 0} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="px-8">
        <div className="container mx-auto flex items-end justify-between px-8 pt-16">
          <div className="flex flex-col gap-4 text-balance">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl">
              Your Projects
            </h1>
            <p className="max-w-2xl opacity-60">
              View and manage all your deployed applications in one place. Click
              on any project to see detailed information and manage its
              settings.
            </p>
          </div>
          <Button asChild>
            <Link href="/?deploy=true">Deploy New Project</Link>
          </Button>
        </div>
      </div>

      <div className="min-h-[calc(80vh)] w-full border-t-2 bg-neutral-50 p-8 dark:border-t-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto grid gap-4 px-8">
          {sites.map((site) => (
            <ProjectItem project={site} key={site.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsAwaited = await searchParams;
  const newMode = searchParamsAwaited.deploy === "true";

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
        <Home newMode={newMode} />
      </main>
      <Footer />
    </HydrateClient>
  );
}
