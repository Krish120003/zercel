import Link from "next/link";
import { FormEvent } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { BuildTriggerForm } from "~/app/_components/build-trigger-form";

// Create a client-side component for the form

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="flex w-full max-w-3xl flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">Trigger New Build</h2>
          <BuildTriggerForm />
        </div>
      </main>
    </HydrateClient>
  );
}
