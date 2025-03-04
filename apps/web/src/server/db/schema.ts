// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  pgTableCreator,
  foreignKey,
} from "drizzle-orm/pg-core";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `web_${name}`);

// ========== NextAuth Schema (DO NOT TOUCH) ====================

export const users = createTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = createTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<string>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    refresh_token_expires_in: integer("refresh_token_expires_in"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = createTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = createTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

// export const authenticators = createTable(
//   "authenticator",
//   {
//     credentialID: text("credentialID").notNull().unique(),
//     userId: text("userId")
//       .notNull()
//       .references(() => users.id, { onDelete: "cascade" }),
//     providerAccountId: text("providerAccountId").notNull(),
//     credentialPublicKey: text("credentialPublicKey").notNull(),
//     counter: integer("counter").notNull(),
//     credentialDeviceType: text("credentialDeviceType").notNull(),
//     credentialBackedUp: boolean("credentialBackedUp").notNull(),
//     transports: text("transports"),
//   },
//   (authenticator) => ({
//     compositePK: primaryKey({
//       columns: [authenticator.userId, authenticator.credentialID],
//     }),
//   }),
// );

// ========== Our Actual Schema ====================

// a table for user sites they want to deploy
export const sites = createTable("site", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Config
  name: text("name").notNull(),
  description: text("description"),
  environmentVariables: text("environment_variables"), // Current/latest environment variables for the site
  repository: text("repository"),
  type: text("type").notNull().$type<"static" | "server">(),

  // Deployment metadata
  activeDeploymentId: text("active_deployment_id"), // to figure out either the sha for static sites or the revision for server sites

  // we can use site id + commit hash for container versioning
  // only remaining thing is we need to keep track of the cloud run service/instance name?
  gcp_cloud_run_service: text("gcp_cloud_run_service"), // For Server Sites

  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sitesRelations = relations(sites, ({ many }) => ({
  subdomains: many(siteSubdomains),
  deployments: many(deployments),
}));

// a table that links a site to its subdomains - directly linked to the site because there will be only one active deployment on these subdomains at a time
export const siteSubdomains = createTable("site_subdomain", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("siteId")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),

  subdomain: text("subdomain").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const siteSubdomainsRelations = relations(siteSubdomains, ({ one }) => ({
  site: one(sites, {
    fields: [siteSubdomains.siteId],
    references: [sites.id],
  }),
}));

// table for deployments
export const deployments = createTable("deployment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("siteId")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  status: text("status")
    .notNull()
    .$type<"QUEUED" | "BUILDING" | "FAILED" | "SUCCEEDED">()
    .default("QUEUED"),

  commitMessage: text("commit_message"),
  commitHash: text("commit_hash"),
  branch: text("branch"),

  buildLogs: text("build_logs"),
  environmentVariables: text("environment_variables"), // Snapshot of environment variables at deployment time

  deploymentUrl: text("deployment_url"), // FIXME: Either use this or remove this?

  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),

  // GCP Build Identifiers
  gcp_job_operation_name: text("gcp_job_operation_name"),
  gcp_job_execution_name: text("gcp_job_execution_name"),

  // For Server Sites - GCP Cloud Run Revision Identifiers
  gcp_cloud_run_revision: text("gcp_cloud_run_revision"),
});

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  site: one(sites, {
    fields: [deployments.siteId],
    references: [sites.id],
  }),
}));
