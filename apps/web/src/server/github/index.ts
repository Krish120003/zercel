import { App } from "octokit";
import { env } from "~/env";

export const githubApp = new App({
  appId: env.GITHUB_ID || "never",
  privateKey: env.GITHUB_PRIVATE_KEY || "never",
});
