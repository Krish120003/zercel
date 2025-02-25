import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sites, siteSubdomains, deployments } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "process";
import { Octokit } from "@octokit/rest";

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
      const [owner, repo] = input.repository.split("/");
      try {
        const { data: repoDetails } = await octokit.rest.repos.get({
          owner: owner || "",
          repo: repo || "",
        });

        // if data is null, the user doesn't have access to the repo
        if (!repoDetails) {
          throw new Error(
            "Repository not found or you don't have access to it.",
          );
        }
      } catch (error) {
        console.error(error);
        throw new Error("Repository not found or you don't have access to it.");
      }

      // Create an entry in the sites table
      const site = await ctx.db.insert(sites).values({
        name: input.name,
        repository: input.repository,
        type: input.type,
        userId,
      });

      // TODO: Create a deployment for the site (DO THIS LATER DONT DO IT RN)

      return site;
    }),
});
