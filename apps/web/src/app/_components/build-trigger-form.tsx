"use client";
import type { FormEvent } from "react";
import { z } from "zod";

export const BuildTriggerForm = () => {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const githubUrl = formData.get("github_repo_url");
    const githubUrlSchema = z
      .string()
      .url()
      .regex(/^https:\/\/github\.com\/.*/);
    const parsedGithubUrl = githubUrlSchema.safeParse(githubUrl);

    if (!parsedGithubUrl.success) {
      alert(
        "Please provide a valid GitHub URL starting with https://github.com/",
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/trigger/build?github_repo_url=${encodeURIComponent(String(parsedGithubUrl.data))}`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        alert("Build triggered successfully");
      } else {
        alert("Error triggering build");
      }
      console.log(await response.json());
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl flex-col gap-4"
    >
      <input
        type="url"
        name="github_repo_url"
        placeholder="https://github.com/username/repo"
        className="w-full rounded-lg p-2 text-black"
        pattern="https://github\.com/.*"
        required
      />
      <button
        type="submit"
        className="rounded bg-purple-500 px-4 py-2 font-bold text-white hover:bg-purple-600"
      >
        Trigger Build
      </button>
    </form>
  );
};
