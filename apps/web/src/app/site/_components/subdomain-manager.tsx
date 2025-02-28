"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";

interface SubdomainListItemProps {
  subdomain: {
    id: string;
    subdomain: string;
    isActive: boolean;
  };
  siteId: string;
}

function SubdomainListItem({ subdomain, siteId }: SubdomainListItemProps) {
  const router = useRouter();

  const removeSubdomainMutation = api.sites.removeSubdomain.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Subdomain removed successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRemoveSubdomain = () => {
    removeSubdomainMutation.mutate({
      siteId,
      subdomain: subdomain.subdomain,
    });
  };

  return (
    <div
      key={subdomain.id}
      className="flex items-center justify-between rounded-lg border p-3"
    >
      <div>
        <p className="font-medium">{subdomain.subdomain}</p>
        <p className="text-sm text-muted-foreground">
          {subdomain.isActive ? "Active" : "Inactive"}
        </p>
      </div>
      <Button
        variant="destructive"
        size="icon"
        className="bg-red-700 hover:bg-red-600 dark:bg-red-800"
        onClick={handleRemoveSubdomain}
        disabled={removeSubdomainMutation.isPending}
      >
        {removeSubdomainMutation.isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

interface SubdomainManagerProps {
  siteId: string;
  subdomains: Array<{
    id: string;
    subdomain: string;
    isActive: boolean;
  }>;
}

export function SubdomainManager({
  siteId,
  subdomains,
}: SubdomainManagerProps) {
  const [newSubdomain, setNewSubdomain] = useState("");
  const router = useRouter();
  const [animationParentRef] = useAutoAnimate();

  const addSubdomainMutation = api.sites.addSubdomain.useMutation({
    onSuccess: () => {
      setNewSubdomain("");
      router.refresh();
      toast.success("Subdomain added successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubdomain) return;

    addSubdomainMutation.mutate({
      siteId,
      subdomain: newSubdomain,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Subdomains</h3>

      <form onSubmit={handleAddSubdomain} className="flex gap-2">
        <Input
          value={newSubdomain}
          onChange={(e) => setNewSubdomain(e.target.value.toLowerCase())}
          placeholder="Enter subdomain"
          pattern="[a-z0-9-]+"
          title="Only lowercase letters, numbers, and hyphens are allowed"
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={addSubdomainMutation.isPending || !newSubdomain}
        >
          {addSubdomainMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="ml-2">Add</span>
        </Button>
      </form>

      <div className="space-y-2" ref={animationParentRef}>
        {subdomains.map((subdomain) => (
          <SubdomainListItem
            key={subdomain.id}
            subdomain={subdomain}
            siteId={siteId}
          />
        ))}
      </div>
    </div>
  );
}
