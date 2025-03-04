"use client";

import React from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { ChevronDown, ExternalLink, Minus, Plus } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { cn } from "~/lib/utils";

interface EnvVar {
  key: string;
  value: string;
}

interface EnvVariablesProps {
  initalEnvVars?: EnvVar[];
  onEnvVarsChange?: (envVars: EnvVar[]) => void;
  mode?: "deploy" | "edit";
}

export default function EnvVariables({
  initalEnvVars,
  onEnvVarsChange,
  mode = "deploy",
}: EnvVariablesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>(initalEnvVars ?? []);
  const [animationRef] = useAutoAnimate();

  // Notify parent component when envVars change
  useEffect(() => {
    if (onEnvVarsChange) {
      onEnvVarsChange(envVars);
    }
  }, [envVars, onEnvVarsChange]);

  const parseEnvContent = useCallback((content: string) => {
    const lines = content.split("\n");
    const newVars: EnvVar[] = [];

    lines.forEach((line) => {
      // Remove leading/trailing whitespace
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return;
      }

      // Find the first = character
      const firstEquals = trimmedLine.indexOf("=");
      if (firstEquals === -1) {
        return;
      }

      const key = trimmedLine.slice(0, firstEquals).trim();
      let value = trimmedLine.slice(firstEquals + 1).trim();

      // Skip if key is empty
      if (!key) {
        return;
      }

      // Handle quoted values
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Skip if value is empty
      if (!value) {
        return;
      }

      newVars.push({ key, value });
    });

    return newVars;
  }, []);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const content = event.clipboardData.getData("text");
      const parsedVars = parseEnvContent(content);

      if (parsedVars.length > 0) {
        // Create a map of existing variables
        const existingVars = new Map(envVars.map((v) => [v.key, v]));

        // Update existing variables and add new ones
        parsedVars.forEach(({ key, value }) => {
          existingVars.set(key, { key, value });
        });

        // Convert map back to array
        setEnvVars(Array.from(existingVars.values()));
        event.preventDefault();
      }
    },
    [envVars, parseEnvContent],
  );

  const addMore = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof EnvVar) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVars = [...envVars];
      newVars[index]![field] = e.target.value;
      setEnvVars(newVars);
    };
  };

  const content = (
    <div className="space-y-4">
      <div
        className="grid grid-cols-[1fr,1fr,auto] items-start gap-4"
        ref={animationRef}
      >
        <div className="text-sm font-medium text-muted-foreground">Key</div>
        <div className="text-sm font-medium text-muted-foreground">Value</div>
        <div className="w-10"></div>
        {envVars.map((envVar, index) => (
          <React.Fragment key={index}>
            <Input
              value={envVar.key}
              onChange={handleChange(index, "key")}
              className="font-mono"
              placeholder={mode === "edit" ? "API_KEY" : ""}
            />
            <Input
              value={envVar.value}
              onChange={handleChange(index, "value")}
              className="font-mono"
              placeholder={mode === "edit" ? "your-api-key" : ""}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeVar(index)}
              className="h-10 w-10 hover:bg-gray-100"
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Remove variable</span>
            </Button>
          </React.Fragment>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addMore}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add More
      </Button>

      <p className="text-sm text-muted-foreground">
        Paste an .env above to import multiple variables at once.
      </p>
    </div>
  );

  return (
    <div
      className={cn("w-full", {
        "rounded-lg border bg-background p-4": mode === "deploy",
      })}
      onPaste={handlePaste}
    >
      {mode === "deploy" ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex w-full items-center text-lg font-medium">
            <ChevronDown
              className={`mr-2 h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
            Environment Variables
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">{content}</CollapsibleContent>
        </Collapsible>
      ) : (
        content
      )}
    </div>
  );
}
