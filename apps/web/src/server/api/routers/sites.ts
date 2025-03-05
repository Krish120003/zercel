import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sites, siteSubdomains, deployments } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { env } from "process";
import { Octokit } from "@octokit/rest";
import { getJobLogs, requestBuild } from "~/server/lib/build";
import {
  getServerBuildLogs,
  getServerBuildStatus,
  requestServerBuild,
} from "~/server/lib/serverBuild";
import { TRPCError } from "@trpc/server";

const subdomainSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9-]+$/);

export const envVarEntry = z.object({
  key: z.string(),
  value: z.string(),
});

const siteListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  repository: z.string(),
  // type: z.enum(["static", "server"]),

  branch: z.string(),
  subdomainCount: z.number(),
  topSubdomain: z.string(),
});

export type SiteListItem = z.infer<typeof siteListItemSchema>;

const logSchema = z
  .object({
    timestamp: z.string(),
    message: z.string(),
  })
  .array();

export type Logs = z.infer<typeof logSchema>;

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

      if (input.type === "server") {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      }

      const octokit = new Octokit({ auth: accessToken });

      // Check if the user owns the repository
      let repoDetails = undefined;
      const [_owner, _repo] = input.repository.split("/");
      const owner = _owner ?? "";
      const repo = _repo ?? "";
      try {
        const { data } = await octokit.rest.repos.get({
          owner: owner,
          repo: repo,
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
          environmentVariables: JSON.stringify(input.environmentVariables),
        })
        .returning();

      // create a subdomain
      const subdomain = await ctx.db
        .insert(siteSubdomains)
        .values({
          siteId: site[0]!.id,
          subdomain: input.name.toLowerCase() + "-" + site[0]!.id.slice(0, 7),
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
          environmentVariables: site[0]!.environmentVariables,
        })
        .returning();

      console.log("Deployment row", deployment);

      // Choose the appropriate build function based on site type
      let execution, operation;
      if (site[0]!.type === "server") {
        // For server sites, use the server build process
        [execution, operation] = await requestServerBuild(
          site[0]!,
          deployment[0]!,
          repoDetails.html_url,
          commitHash,
        );
      } else {
        // For static sites, use the original build process
        [execution, operation] = await requestBuild(
          deployment[0]!,
          repoDetails.html_url,
          commitHash,
        );
      }

      await ctx.db
        .update(deployments)
        .set({
          gcp_job_operation_name: operation,
          gcp_job_execution_name: execution,
        })
        .where(eq(deployments.id, deployment[0]!.id));

      // link active deployment to site
      await ctx.db
        .update(sites)
        .set({
          activeDeploymentId: deployment[0]!.id,
        })
        .where(eq(sites.id, site[0]!.id))
        .execute();

      return site[0]!;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.id)),
        with: {
          subdomains: true,
          deployments: true,
        },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found.",
        });
      }

      await Promise.all(
        site?.deployments.map(async (deployment) => {
          // if status is queued or building
          if (
            deployment.status === "QUEUED" ||
            deployment.status === "BUILDING"
          ) {
            // get the status of the build
            if (site!.type === "server" && deployment.gcp_job_execution_name) {
              const status = await getServerBuildStatus(
                deployment.gcp_job_execution_name,
              );

              if (status.status?.state === "SUCCEEDED") {
                // update the deployment status
                await ctx.db
                  .update(deployments)
                  .set({
                    status: "SUCCEEDED",
                  })
                  .where(eq(deployments.id, deployment.id))
                  .execute();
              } else if (
                status.status?.state === "FAILED" ||
                status.status?.state === "CANCELLED"
              ) {
                // update the deployment status
                await ctx.db
                  .update(deployments)
                  .set({
                    status: "FAILED",
                  })
                  .where(eq(deployments.id, deployment.id))
                  .execute();
              } else if (status.status?.state === "RUNNING") {
                // update the deployment status
                await ctx.db
                  .update(deployments)
                  .set({
                    status: "BUILDING",
                  })
                  .where(eq(deployments.id, deployment.id))
                  .execute();
              }
            } else {
              // TOOD: handle static site builds status
            }
          }
        }),
      );

      // refresh the site object
      site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.id)),
        with: {
          subdomains: true,
          deployments: true,
        },
      });

      site?.deployments.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return site;
    }),

  list: protectedProcedure
    .output(siteListItemSchema.array())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const userSites = await ctx.db.query.sites.findMany({
        where: eq(sites.userId, userId),
        with: {
          subdomains: true,
          deployments: true,
        },
      });

      const data = userSites.map((site) => {
        const topSubdomain = site.subdomains[0]?.subdomain ?? "";
        const subdomainCount = site.subdomains.length;
        return {
          id: site.id,
          name: site.name,
          repository: site.repository ?? "",
          branch: site.deployments[0]?.branch ?? "",
          topSubdomain,
          subdomainCount,
        };
      });

      return data;
    }),

  getDeploymentLogs: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
      }),
    )
    .output(logSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // get user's sites
      const userSites = await ctx.db.query.sites.findMany({
        where: and(eq(sites.userId, userId)),
        with: {
          deployments: true,
        },
      });

      // FIXME: there is probably a better way to do this?
      const userDeployments = userSites.flatMap((site) => site.deployments);

      // get the deployment
      const deployment = userDeployments.find(
        (deployment) => deployment.id === input.deploymentId,
      );

      if (
        !deployment?.gcp_job_execution_name ||
        !deployment?.gcp_job_operation_name
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found.",
        });
      }

      const isDeploymentDone =
        deployment.status !== "QUEUED" && deployment.status !== "BUILDING";

      if (isDeploymentDone && deployment.buildLogs) {
        console.log("Serving logs from cache for deployment", deployment.id);
        return logSchema.parse(JSON.parse(deployment.buildLogs));
      }

      // we need to get this deployment's site
      const site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.id, deployment.siteId), eq(sites.userId, userId)),
      });

      let logs;
      if (site?.type === "server") {
        [logs] = await getServerBuildLogs(deployment.gcp_job_operation_name);
      } else {
        [logs] = await getJobLogs(deployment.gcp_job_execution_name);
      }
      // we need to fetch them from the GCP logs

      const dataUnsorted: {
        timestamp: Date;
        message: string;
      }[] = [];

      logs.forEach((log) => {
        const safeParseMessage = z.string().safeParse(log.data);
        if (
          safeParseMessage.success &&
          !safeParseMessage.data.includes("GCS")
        ) {
          let parsedTimestamp: Date | null = null;
          if (log.metadata.timestamp?.valueOf()) {
            const temp = log.metadata.timestamp;

            if (typeof temp === "string") {
              parsedTimestamp = new Date(temp);
            } else if (typeof temp === "object") {
              // check if its a date object
              if (temp instanceof Date) {
                parsedTimestamp = temp;
              } else if (temp instanceof Object && temp.nanos) {
                parsedTimestamp = new Date(temp.nanos);
              }
            } else if (typeof temp === "number") {
              parsedTimestamp = new Date(temp);
            }

            if (parsedTimestamp) {
              dataUnsorted.push({
                timestamp: parsedTimestamp,
                message: safeParseMessage.data,
              });
            }
          }
        }
      });

      dataUnsorted.sort((a, b) => {
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      const dataSorted: Logs = dataUnsorted.map((log) => {
        return {
          timestamp: log.timestamp.toISOString(),
          message: log.message,
        };
      });

      // cache them if isDeploymentDone
      if (isDeploymentDone) {
        await ctx.db
          .update(deployments)
          .set({
            buildLogs: JSON.stringify(dataSorted),
          })
          .where(eq(deployments.id, input.deploymentId));
      }

      return dataSorted;
    }),

  addSubdomain: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        subdomain: subdomainSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.siteId)),
      });

      if (!site) {
        throw new Error("Site not found or you don't have access to it.");
      }

      // Check if subdomain already exists
      const existingSubdomain = await ctx.db.query.siteSubdomains.findFirst({
        where: eq(siteSubdomains.subdomain, input.subdomain),
      });

      if (existingSubdomain) {
        throw new Error("Subdomain already exists.");
      }

      // Create new subdomain
      const subdomain = await ctx.db
        .insert(siteSubdomains)
        .values({
          siteId: input.siteId,
          subdomain: input.subdomain,
        })
        .returning();

      // setup redis to point to the commit hash of the active deployment
      // site.activeDeploymentId

      if (site.activeDeploymentId) {
        const activeDeployment = await ctx.db.query.deployments.findFirst({
          where: eq(deployments.id, site.activeDeploymentId),
        });

        if (activeDeployment) {
          await ctx.redis.set(
            `sha:${subdomain[0]!.subdomain}`,
            activeDeployment.commitHash!,
          );
        }
      }

      return subdomain[0]!;
    }),

  removeSubdomain: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        subdomain: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.siteId)),
      });

      if (!site) {
        throw new Error("Site not found or you don't have access to it.");
      }

      // Delete subdomain
      const deletedSubdomain = await ctx.db
        .delete(siteSubdomains)
        .where(
          and(
            eq(siteSubdomains.siteId, input.siteId),
            eq(siteSubdomains.subdomain, input.subdomain),
          ),
        )
        .returning();

      if (!deletedSubdomain.length) {
        throw new Error("Subdomain not found.");
      }

      // Remove from Redis if exists
      await ctx.redis.del(`sha:${input.subdomain}`);

      return deletedSubdomain[0]!;
    }),

  getSiteEnvVars: protectedProcedure
    .input(z.object({ siteId: z.string() }))
    .output(envVarEntry.array())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.siteId)),
      });

      if (!site) {
        throw new Error("Site not found or you don't have access to it.");
      }

      return envVarEntry
        .array()
        .parse(JSON.parse(site.environmentVariables ?? "[]"));
    }),

  editSiteEnvVars: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        triggerBuild: z.boolean().default(false),
        environmentVariables: z.array(envVarEntry),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.siteId)),
      });

      if (!site) {
        throw new Error("Site not found or you don't have access to it.");
      }

      const siteUpdated = await ctx.db
        .update(sites)
        .set({
          environmentVariables: JSON.stringify(input.environmentVariables),
        })
        .where(eq(sites.id, input.siteId))
        .returning();

      if (input.triggerBuild) {
        let repoDetails = undefined;
        const [_owner, _repo] = siteUpdated[0]!.repository!.split("/");
        const owner = _owner ?? "";
        const repo = _repo ?? "";
        try {
          const octokit = new Octokit({ auth: ctx.session.user.accessToken });
          const { data } = await octokit.rest.repos.get({
            owner: owner,
            repo: repo,
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
          throw new Error(
            "Repository not found or you don't have access to it.",
          );
        }

        const branchName = repoDetails.default_branch; // TODO: GET

        // get the branch and commit hash of the active deployment
        const activeDeployment = await ctx.db.query.deployments.findFirst({
          where: and(
            eq(deployments.siteId, siteUpdated[0]!.id),
            eq(deployments.branch, branchName),
          ),
          orderBy: [desc(deployments.createdAt)],
        });

        // get repo url

        // create a new deployment
        const deployment = await ctx.db
          .insert(deployments)
          .values({
            siteId: site.id,
            status: "QUEUED",

            branch: activeDeployment?.branch ?? "",
            commitMessage: activeDeployment?.commitMessage ?? "",
            commitHash: activeDeployment?.commitHash ?? "",

            buildLogs: null,
            environmentVariables: JSON.stringify(input.environmentVariables),
          })
          .returning();

        // Choose the appropriate build function based on site type
        let execution, operation;
        if (site.type === "server") {
          // For server sites, use the server build process
          [execution, operation] = await requestServerBuild(
            site,
            deployment[0]!,
            `https://github.com/${site.repository}`,
            activeDeployment?.commitHash ?? "",
          );
        } else {
          // For static sites, use the original build process
          [execution, operation] = await requestBuild(
            deployment[0]!,
            `https://github.com/${site.repository}`,
            activeDeployment?.commitHash ?? "",
          );
        }

        // add the execution name to the deployment
        await ctx.db
          .update(deployments)
          .set({
            gcp_job_operation_name: operation,
            gcp_job_execution_name: execution,
          })
          .where(eq(deployments.id, deployment[0]!.id));
      }
    }),
});

export type SitesRouter = typeof sitesRouter;
