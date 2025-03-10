"use client";
import React from "react";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  FileTextIcon,
  GitBranch,
  Loader,
  LoaderCircle,
  ServerIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import EnvVariableForm from "~/components/env-variable";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Site name is required"),
  repository: z.string(),
  type: z.enum(["static", "server"]),
});

interface DeployFormProps {
  repoDetails: { full_name: string; default_branch: string; name: string };
}

export default function DeployForm({ repoDetails }: DeployFormProps) {
  const [environmentVariables, setEnvironmentVariables] = useState([
    { key: "", value: "" },
  ]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: repoDetails.name,
      repository: repoDetails.full_name,
      type: "static",
    },
  });

  const router = useRouter();

  const mutation = api.sites.create.useMutation({
    async onSuccess(data) {
      router.push(`/site?id=${data.id}`);
    },
    async onError(err) {
      toast(`Error - ${JSON.stringify(err)}`);
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    mutation.mutate({
      ...values,
      environmentVariables,
    });
    console.log("Form Values:", values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div>
          <h2 className="mb-2 text-xl font-semibold">
            Deploy {repoDetails.name}
          </h2>
          <a
            href={`https://github.com/${repoDetails.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:underline"
          >
            <SiGithub className="h-4 w-4" />
            <span>{repoDetails.full_name}</span>
          </a>
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>{repoDetails.default_branch}</span>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Settings</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter site name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selection between Static or Server */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel>Site Type</FormLabel>
                  <div className="grid w-full grid-cols-2 gap-4">
                    <label
                      className={cn(
                        `col-span-1 flex cursor-pointer flex-col items-center rounded-lg border p-4 transition-all hover:bg-accent`,
                        {
                          "border-primary bg-accent/50":
                            field.value === "static",
                          "border-border": field.value !== "static",
                        },
                      )}
                      htmlFor="static-type"
                    >
                      <div className="mb-2 rounded-full bg-primary/10 p-2">
                        <FileTextIcon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-medium">Static</span>
                      <span className="text-xs text-muted-foreground">
                        HTML/CSS, Vite etc.
                      </span>
                      <input
                        type="radio"
                        id="static-type"
                        value="static"
                        className="sr-only"
                        checked={field.value === "static"}
                        onChange={() => field.onChange("static")}
                      />
                    </label>

                    <label
                      className={cn(
                        `col-span-1 flex cursor-pointer flex-col items-center rounded-lg border p-4 transition-all hover:bg-accent`,
                        {
                          "border-primary bg-accent/50":
                            field.value === "server",
                          "border-border": field.value !== "server",
                        },
                      )}
                      htmlFor="server-type"
                    >
                      <div className="mb-2 rounded-full bg-primary/10 p-2">
                        <ServerIcon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-medium">Server</span>
                      <span className="text-xs text-muted-foreground">
                        Next.js, Vite with SSR
                      </span>
                      <input
                        type="radio"
                        id="server-type"
                        value="server"
                        className="sr-only"
                        checked={field.value === "server"}
                        onChange={() => field.onChange("server")}
                      />
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <EnvVariableForm
                initalEnvVars={environmentVariables}
                // onSubmit={(data) => console.log("Env Variables:", data)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="secondary" asChild>
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit">
            {mutation.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                <span>Deploying</span>
              </>
            ) : (
              "Deploy"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
