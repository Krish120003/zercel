import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sites, siteSubdomains, deployments } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { simpleGit } from "simple-git";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const createSiteSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["static", "server"]),
  repository: z.string().url(),
});

const updateSiteSchema = createSiteSchema.partial();

const subdomainSchema = z.object({
  subdomain: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
});

export const sitesRouter = createTRPCRouter({
  // Create a new site
  create: protectedProcedure
    .input(createSiteSchema)
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db
        .insert(sites)
        .values({
          ...input,
          userId: ctx.session.user.id,
        })
        .returning();
      return site[0];
    }),

  // List all sites for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    console.log("getting site list");
    const res = await ctx.db.query.sites.findMany({
      where: eq(sites.userId, ctx.session.user.id),
      with: {
        subdomains: true,
      },
    });

    console.log(res);
    return res;
  }),

  // Get a single site with all its details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Getting site...");

      const site = await ctx.db.query.sites.findFirst({
        where: and(
          eq(sites.id, input.id),
          eq(sites.userId, ctx.session.user.id),
        ),
        with: {
          subdomains: true,
          deployments: true,
          // activeDeployment: true,
        },
      });

      console.log("Found site", site);

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      return site;
    }),

  // Update site details
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateSiteSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.query.sites.findFirst({
        where: and(
          eq(sites.id, input.id),
          eq(sites.userId, ctx.session.user.id),
        ),
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      const updated = await ctx.db
        .update(sites)
        .set(input.data)
        .where(eq(sites.id, input.id))
        .returning();

      return updated[0];
    }),

  // Add a subdomain
  addSubdomain: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        ...subdomainSchema.shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(
          eq(sites.id, input.siteId),
          eq(sites.userId, ctx.session.user.id),
        ),
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      const subdomain = await ctx.db
        .insert(siteSubdomains)
        .values({
          siteId: input.siteId,
          subdomain: input.subdomain,
        })
        .returning();

      return subdomain[0];
    }),

  // Remove a subdomain
  removeSubdomain: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        subdomainId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(
          eq(sites.id, input.siteId),
          eq(sites.userId, ctx.session.user.id),
        ),
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      await ctx.db
        .delete(siteSubdomains)
        .where(
          and(
            eq(siteSubdomains.id, input.subdomainId),
            eq(siteSubdomains.siteId, input.siteId),
          ),
        );
    }),

  // Create a new deployment
  deploy: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        branch: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify site ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(
          eq(sites.id, input.siteId),
          eq(sites.userId, ctx.session.user.id),
        ),
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      // Create deployment record
      const deployment = await ctx.db
        .insert(deployments)
        .values({
          siteId: input.siteId,
          branch: input.branch || "main",
          environmentVariables: site.environmentVariables,
        })
        .returning();

      // Start deployment process
      const deploymentId = deployment[0].id;
      const workDir = path.join(process.cwd(), "deployments", deploymentId);

      try {
        // Clone repository
        await fs.mkdir(workDir, { recursive: true });
        const git = simpleGit();
        await git.clone(site.repository!, workDir);

        if (input.branch) {
          await git.cwd(workDir).checkout(input.branch);
        }

        // Install dependencies and build
        await execAsync("npm install", { cwd: workDir });
        await execAsync("npm run build", { cwd: workDir });

        // Update deployment status
        await ctx.db
          .update(deployments)
          .set({
            status: "SUCCEEDED",
            completedAt: new Date(),
          })
          .where(eq(deployments.id, deploymentId));

        // Set as active deployment
        await ctx.db
          .update(sites)
          .set({
            activeDeploymentId: deploymentId,
          })
          .where(eq(sites.id, input.siteId));
      } catch (error) {
        // Update deployment status on failure
        await ctx.db
          .update(deployments)
          .set({
            status: "FAILED",
            buildLogs: String(error),
            completedAt: new Date(),
          })
          .where(eq(deployments.id, deploymentId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Deployment failed",
          cause: error,
        });
      }

      return deployment[0];
    }),
});
