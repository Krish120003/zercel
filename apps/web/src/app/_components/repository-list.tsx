"use client";
import { Input } from "~/components/ui/input";
import { GithubRepoData } from "~/server/api/routers/github";
import { Button } from "~/components/ui/button";

import { ArrowRight, Github, Globe, Lock, Search } from "lucide-react";
import { env } from "~/env";
import { useMemo, useState } from "react";

interface RepositoryListProps {
  repos: GithubRepoData[];
}

export function RepositoryList({ repos }: RepositoryListProps) {
  const [search, setSearch] = useState("");

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      return repo.full_name.toLowerCase().includes(search.toLowerCase());
    });
  }, [repos, search]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        Import Repository
      </h2>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-96 divide-y overflow-auto rounded-lg border">
        {filteredRepos.map((repo) => (
          <div key={repo.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <img
                src={repo.owner.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full"
              />
              <div className="flex items-center gap-2">
                {repo.private ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="hidden md:block">{repo.full_name}</span>
                <span className="max-w-[16ch] truncate md:hidden">
                  {repo.name}
                </span>
              </div>
            </div>
            <Button variant="default" size="sm">
              Import
            </Button>
          </div>
        ))}
      </div>

      <div className="w-fit text-muted-foreground">
        Don't see a repository?{" "}
        <Button
          asChild
          variant="link"
          className="inline-flex gap-0 p-0 text-base text-blue-500 underline"
        >
          <a href={env.NEXT_PUBLIC_GITHUB_APP_URL}>
            Reconfigure GitHub
            <ArrowRight className="-rotate-45" />
          </a>
        </Button>
      </div>
    </div>
  );
}
