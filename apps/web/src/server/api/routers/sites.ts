import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sites, siteSubdomains, deployments } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "process";
import { Octokit } from "@octokit/rest";
import { requestBuild } from "~/server/lib/build";

const subdomainSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9-]+$/);

const envVarEntry = z.object({
  key: z.string(),
  value: z.string(),
});

export const sitesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(63),
        repository: z.string(), // TODO: We should handle repos that change name
        type: z.enum(["static", "server"]),
        environmentVariables: z.array(envVarEntry),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const accessToken = ctx.session.user.accessToken;

      if (!accessToken) {
        throw new Error(
          "No GitHub access token found. Please reconnect your GitHub account.",
        );
      }

      const octokit = new Octokit({ auth: accessToken });

      // Check if the user owns the repository
      let repoDetails = undefined;
      const [_owner, _repo] = input.repository.split("/");
      const owner = _owner || "";
      const repo = _repo || "";
      try {
        const { data } = await octokit.rest.repos.get({
          owner: owner || "",
          repo: repo || "",
        });

        // if data is null, the user doesn't have access to the repo
        if (!data) {
          throw new Error(
            "Repository not found or you don't have access to it.",
          );
        }

        repoDetails = data;
      } catch (error) {
        console.error(error);
        throw new Error("Repository not found or you don't have access to it.");
      }

      // repoDetails <--- i dont have access to this var cause its undefined, how do I fix?

      const branchName = repoDetails.default_branch; // TODO: GET

      // # get latesst commit of tihs branch
      const branch = await octokit.rest.repos.getBranch({
        owner: owner,
        repo: repo,
        branch: branchName,
      });

      const commitHash = branch.data.commit.sha; // TODO: GET

      // Create an entry in the sites table
      const site = await ctx.db
        .insert(sites)
        .values({
          name: input.name,
          repository: input.repository,
          type: input.type,
          userId,
        })
        .returning();

      // create a subdomain
      const subdomain = await ctx.db
        .insert(siteSubdomains)
        .values({
          siteId: site[0]!.id,
          subdomain: input.name,
        })
        .returning();

      await ctx.redis.set(`sha:${subdomain[0]!.subdomain}`, commitHash);

      // TODO: Create a deployment for the site (DO THIS LATER DONT DO IT RN)

      const deployment = await ctx.db
        .insert(deployments)
        .values({
          siteId: site[0]!.id,
          status: "QUEUED",
          branch: branchName,
          commitHash: commitHash,
          buildLogs: null,
        })
        .returning();

      console.log("Deployment row", deployment);

      await requestBuild(repoDetails.html_url, commitHash);

      return site;
    }),
});
