import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const githubRepoSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  full_name: z.string(),
  name: z.string(),
  private: z.boolean(),
  owner: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
  }),
  html_url: z.string(),
});

export type GithubRepoData = z.infer<typeof githubRepoSchema>;

export const githubRouter = createTRPCRouter({
  getUserInstallations: protectedProcedure.query(async ({ ctx }) => {
    const accessToken = ctx.session.user.accessToken;
    if (!accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "No GitHub access token found. Please reconnect your GitHub account.",
      });
    }

    const octokit = new Octokit({ auth: accessToken });

    const { data: installations } =
      await octokit.rest.apps.listInstallationsForAuthenticatedUser();

    return installations.installations;
  }),

  getUserRepos: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(100),
      }),
    )
    .output(githubRepoSchema.array())
    .query(async ({ ctx, input }) => {
      const accessToken = ctx.session.user.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No GitHub access token found. Please reconnect your GitHub account.",
        });
      }

      const octokit = new Octokit({ auth: accessToken });

      // get installations
      const { data: installations } =
        await octokit.rest.apps.listInstallationsForAuthenticatedUser();

      if (installations.total_count === 0) {
        return [];
      }

      // Create promises for each installation
      const reposPromises = installations.installations.map(
        async (installation) => {
          const installationOctokit =
            await ctx.githubApp.getInstallationOctokit(installation.id);

          const { data: repos } =
            await installationOctokit.rest.apps.listReposAccessibleToInstallation(
              { per_page: input.limit },
            );

          return repos.repositories || [];
        },
      );

      // Execute all promises in parallel
      const reposArrays = await Promise.all(reposPromises);

      // Flatten the array of arrays into a single array
      const allRepositories = reposArrays.flat();

      allRepositories.sort((a, b) => {
        return (
          new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime()
        );
      });

      return allRepositories;
    }),

  getRepoDetailsByName: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessToken = ctx.session.user.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No GitHub access token found. Please reconnect your GitHub account.",
        });
      }

      const octokit = new Octokit({ auth: accessToken });

      try {
        const { data: repoDetails } = await octokit.rest.repos.get({
          owner: input.owner,
          repo: input.repo,
        });

        const { data: branches } = await octokit.rest.repos.listBranches({
          owner: input.owner,
          repo: input.repo,
          per_page: 100,
        });

        return {
          ...repoDetails,
          branches: branches.map((branch) => branch.name),
        };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Repository ${input.owner}/${input.repo} not found or you don't have access to it.`,
        });
      }
    }),
});
