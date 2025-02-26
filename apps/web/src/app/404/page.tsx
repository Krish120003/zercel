import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "~/components/ui/button";
import { Footer } from "~/app/_components/landing";

export const metadata: Metadata = {
  title: "Page Not Found | Zercel",
  description: "Sorry, the page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background dark:bg-black">
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="dark:text-foreground-dark mb-4 text-6xl font-bold text-foreground">
          404
        </h1>
        <h2 className="dark:text-foreground-dark mb-6 text-2xl font-semibold text-foreground">
          Page Not Found
        </h2>
        <p className="dark:text-muted-foreground-dark mb-8 max-w-md text-muted-foreground">
          {
            "Sorry, the page you are looking for doesn't exist or has been moved."
          }
        </p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
      <Footer />
    </div>
  );
}
