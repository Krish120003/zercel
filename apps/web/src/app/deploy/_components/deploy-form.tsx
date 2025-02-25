"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { GitBranch, Loader, LoaderCircle } from "lucide-react";

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
      await router.push(`/site?id=${data.id}`);
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
