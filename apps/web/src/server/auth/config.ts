import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { experimental_taintUniqueValue } from "react";
import { env } from "~/env";

import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
      accessToken?: string;
      githubId?: string;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      authorization: { params: { scope: "repo" } },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session: async ({ session, user, token }) => {
      // Get the user's GitHub account
      const githubAccount = await db.query.accounts.findFirst({
        where: (accounts, { eq, and }) =>
          and(eq(accounts.userId, user.id), eq(accounts.provider, "github")),
      });

      if (githubAccount?.access_token) {
        experimental_taintUniqueValue(
          "Never pass access tokens to the client",
          githubAccount,
          githubAccount.access_token,
        );
      }

      return {
        ...session,
        user: {
          accessToken: githubAccount?.access_token,
          githubId: githubAccount?.providerAccountId,
          ...session.user,
          id: user.id,
        },
      };
    },
  },
} satisfies NextAuthConfig;
