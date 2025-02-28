"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import EnvVariables from "~/components/env-variable";

interface EnvManagerProps {
  siteId: string;
  initialEnvVars?: Array<{
    key: string;
    value: string;
  }>;
}

export function EnvManager({ siteId, initialEnvVars = [] }: EnvManagerProps) {
  const [envVars, setEnvVars] = useState(initialEnvVars);
  const [saveType, setSaveType] = useState<"save" | "build" | null>(null);
  const router = useRouter();

  const editEnvVarsMutation = api.sites.editSiteEnvVars.useMutation({
    onSuccess: () => {
      router.refresh();
      toast.success("Environment variables saved successfully");
      setSaveType(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setSaveType(null);
    },
  });

  const handleEnvVarsChange = useCallback(
    (newVars: Array<{ key: string; value: string }>) => {
      setEnvVars(newVars);
    },
    [],
  );

  const handleSaveChanges = (triggerBuild: boolean) => {
    setSaveType(triggerBuild ? "build" : "save");
    const validEnvVars = envVars.filter(
      (envVar) => envVar.key.trim() && envVar.value.trim(),
    );

    editEnvVarsMutation.mutate({
      siteId,
      environmentVariables: validEnvVars,
      triggerBuild,
    });
  };

  return (
    <div className="w-full space-y-4">
      <EnvVariables
        initalEnvVars={envVars}
        onEnvVarsChange={handleEnvVarsChange}
        mode="edit"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={() => handleSaveChanges(false)}
          disabled={editEnvVarsMutation.isPending}
          size="sm"
          variant={"secondary"}
        >
          {saveType === "save" && editEnvVarsMutation.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>

        <Button
          onClick={() => handleSaveChanges(true)}
          disabled={editEnvVarsMutation.isPending}
          size="sm"
        >
          {saveType === "build" && editEnvVarsMutation.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save & Trigger Build
        </Button>
      </div>
    </div>
  );
}
