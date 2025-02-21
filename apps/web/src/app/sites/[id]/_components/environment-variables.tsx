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
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface EnvironmentVariablesProps {
  site: {
    id: string;
    environmentVariables: string | null;
  };
}

interface EnvVar {
  key: string;
  value: string;
}

export function EnvironmentVariables({ site }: EnvironmentVariablesProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const router = useRouter();

  const currentEnvVars: EnvVar[] = site.environmentVariables
    ? JSON.parse(site.environmentVariables)
    : [];

  const updateSite = api.sites.update.useMutation({
    onSuccess: () => {
      setNewKey("");
      setNewValue("");
      router.refresh();
      toast.success("Environment variables updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddEnvVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newValue) return;

    const updatedEnvVars = [
      ...currentEnvVars,
      { key: newKey, value: newValue },
    ];

    updateSite.mutate({
      id: site.id,
      data: {
        environmentVariables: JSON.stringify(updatedEnvVars),
      },
    });
  };

  const handleRemoveEnvVar = (key: string) => {
    const updatedEnvVars = currentEnvVars.filter((env) => env.key !== key);

    updateSite.mutate({
      id: site.id,
      data: {
        environmentVariables: JSON.stringify(updatedEnvVars),
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Variables</CardTitle>
        <CardDescription>
          Configure environment variables for your site
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddEnvVar} className="mb-4 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="KEY"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
            />
            <Input
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={updateSite.isLoading || !newKey || !newValue}
          >
            Add Variable
          </Button>
        </form>

        <div className="space-y-2">
          {currentEnvVars.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No environment variables configured
            </p>
          ) : (
            currentEnvVars.map((env) => (
              <div
                key={env.key}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="mr-2 grid flex-1 grid-cols-2 gap-4">
                  <code className="bg-muted rounded px-1.5 py-0.5 text-sm">
                    {env.key}
                  </code>
                  <code className="bg-muted truncate rounded px-1.5 py-0.5 text-sm">
                    {env.value}
                  </code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveEnvVar(env.key)}
                  disabled={updateSite.isLoading}
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
