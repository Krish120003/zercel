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
    .output(githubRepoSchema.array())
    .query(async ({ ctx }) => {
      const accessToken = ctx.session.user.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No GitHub access token found. Please reconnect your GitHub account.",
        });
      }

      const octokit = new Octokit({ auth: accessToken });

      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser(
        {
          per_page: 1000,
          sort: "pushed",
        },
      );

      return repos;
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
