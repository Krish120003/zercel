"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface SubdomainManagerProps {
  site: {
    id: string;
    subdomains: Array<{
      id: string;
      subdomain: string;
      isActive: boolean;
    }>;
  };
}

export function SubdomainManager({ site }: SubdomainManagerProps) {
  const [newSubdomain, setNewSubdomain] = useState("");
  const router = useRouter();

  const addSubdomain = api.sites.addSubdomain.useMutation({
    onSuccess: () => {
      setNewSubdomain("");
      router.refresh();
      toast.success("Subdomain added successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeSubdomain = api.sites.removeSubdomain.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Subdomain removed successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubdomain) return;

    addSubdomain.mutate({
      siteId: site.id,
      subdomain: newSubdomain,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subdomains</CardTitle>
        <CardDescription>Manage your site's subdomains</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddSubdomain} className="mb-4 flex gap-2">
          <Input
            placeholder="Enter subdomain"
            value={newSubdomain}
            onChange={(e) => setNewSubdomain(e.target.value)}
            pattern="[a-z0-9-]+"
            title="Only lowercase letters, numbers, and hyphens are allowed"
          />
          <Button
            type="submit"
            disabled={addSubdomain.isLoading || !newSubdomain}
          >
            Add
          </Button>
        </form>

        <div className="space-y-2">
          {site.subdomains.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No subdomains configured
            </p>
          ) : (
            site.subdomains.map((subdomain) => (
              <div
                key={subdomain.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-2">
                  <code className="bg-muted rounded px-1.5 py-0.5 text-sm">
                    {subdomain.subdomain}
                  </code>
                  {subdomain.isActive && (
                    <Badge variant="outline">Active</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    removeSubdomain.mutate({
                      siteId: site.id,
                      subdomainId: subdomain.id,
                    })
                  }
                  disabled={removeSubdomain.isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
