import { api, HydrateClient } from "~/trpc/server";
import { BuildTriggerForm } from "~/app/_components/build-trigger-form";

import { LandingPage, Nav } from "./_components/landing";
import { auth } from "~/server/auth";

// Create a client-side component for the form

export default async function Home() {
  const session = await auth();

  if (!session || !session.user) {
    return (
      <HydrateClient>
        <LandingPage />
      </HydrateClient>
    );
  }
  return (
    <HydrateClient>
      <Nav />
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex w-full max-w-3xl flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">Trigger New Build</h2>
          <BuildTriggerForm />
        </div>
      </main>
    </HydrateClient>
  );
}
