"use client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const createSiteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["static", "server"], {
    required_error: "Please select a site type",
  }),
  repository: z.string().url("Please enter a valid repository URL"),
});

type CreateSiteForm = z.infer<typeof createSiteSchema>;

export function CreateSiteButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<CreateSiteForm>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: {
      type: "static",
    },
  });

  const createSite = api.sites.create.useMutation({
    onSuccess: (site) => {
      setOpen(false);
      form.reset();
      router.refresh();
      toast.success("Site created successfully!");
      router.push(`/sites/${site.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(data: CreateSiteForm) {
    createSite.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Site</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Site</DialogTitle>
          <DialogDescription>
            Add a new site to deploy. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Site" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be used to identify your site.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your site"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of your site.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a site type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="static">Static Site</SelectItem>
                      <SelectItem value="server">Server Site</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose whether this is a static site or requires a server.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repository"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/username/repo"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The GitHub repository URL for your site.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={createSite.isLoading}
            >
              {createSite.isLoading ? "Creating..." : "Create Site"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
