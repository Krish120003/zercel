import { Suspense } from "react";
import { SitesList } from "./_components/sites-list";
import { CreateSiteButton } from "./_components/create-site-button";

export default function SitesPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Your Sites</h1>
        <CreateSiteButton />
      </div>

      <Suspense fallback={<div>Loading sites...</div>}>
        <SitesList />
      </Suspense>
    </div>
  );
}
