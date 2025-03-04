"use client";
import React from "react";
import { Button } from "~/components/ui/button";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { SiteListItem } from "~/server/api/routers/sites";

type NonPropLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

function NonPropLink({ onClick, ...props }: NonPropLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return <a {...props} onClick={handleClick} />;
}

interface ProjectItemProps {
  project: SiteListItem;
}

export function ProjectItem({ project }: ProjectItemProps) {
  return (
    <div
      key={project.id}
      className="group grid grid-cols-12 rounded border bg-background p-4 text-card-foreground shadow-sm"
    >
      <div className="col-span-5 flex items-center gap-4">
        <img
          src={`/api/favicon/?data=what&link=https://${project.topSubdomain}.zercel.dev`}
          className="h-8 w-8 rounded"
          alt="Icon"
        />

        <div className="flex h-full flex-col items-start justify-center">
          <h2 className="font-medium">{project.name}</h2>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <a
              className="group/link flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:underline"
              href={`https://${project.topSubdomain}.zercel.dev`}
              target="_blank"
            >
              {project.topSubdomain}.zercel.dev
              {/* <ExternalLink className="w-[1.5ch] opacity-0 group-hover/link:opacity-100" /> */}
            </a>
            {project.subdomainCount > 1 && (
              <span>+ {project.subdomainCount - 1}</span>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-5 flex flex-col items-start justify-center">
        <a
          className="flex items-center gap-2 text-sm text-muted-foreground hover:underline"
          target="_blank"
          href={`https://github.com/${project.repository}`}
        >
          <SiGithub className="w-[1.5ch]" /> {project.repository}
        </a>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="w-[1.5ch]" /> {project.branch}
        </div>
      </div>
      <div className="col-span-2 flex items-center justify-end opacity-100">
        <Button asChild>
          <Link href={`/site/?id=${project.id}`}>Manage</Link>
        </Button>
      </div>
    </div>
  );
}
