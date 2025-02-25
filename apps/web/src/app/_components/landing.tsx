import Link from "next/link";
import { Button } from "~/components/ui/button";
import AuthButton from "./auth-button";
import { auth } from "~/server/auth";
import { ModeToggle } from "~/components/theme-toggle";
import { cn } from "~/lib/utils";

export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="Zercel Logo"
    >
      <rect x="4" y="4" width="16" height="16" />
    </svg>
  );
}

export async function Nav() {
  const session = await auth();

  return (
    <nav className="">
      <div className="mx-auto px-8 pt-2">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-5 w-5 text-foreground" />
              <span
                className={cn("text-lg font-bold text-foreground", {
                  hidden: session !== null,
                })}
              >
                Zercel
              </span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {/* <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Products
              </Link> */}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="link"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Learn More
            </Button>

            <AuthButton loggedIn={session !== null} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function HeroGraphic() {
  return (
    <div className="relative h-[40vh] w-full">
      {/* Rainbow Lines Background */}
      <svg
        viewBox="0 0 1200 400"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="33%" stopColor="#00FF99" />
            <stop offset="66%" stopColor="#FFD600" />
            <stop offset="100%" stopColor="#FF0000" />
          </linearGradient>
        </defs>

        {/* Generate 500 lines with varying angles */}
        {Array.from({ length: 300 }).map((_, i) => (
          <line
            key={i}
            x1="600"
            y1="200"
            x2={600 + Math.cos((i * Math.PI) / 150) * 1000}
            y2={200 + Math.sin((i * Math.PI) / 150) * 1000}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            opacity="1"
          />
        ))}
      </svg>

      {/* Centered Square Logo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-24 w-24 bg-white"></div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <>
      <Nav />
      <main className="relative flex-1 overflow-hidden bg-background pb-32">
        {/* Hero Graphic */}
        <HeroGraphic />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-12 text-center">
            <div className="max-w-4xl space-y-6">
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Your incomplete platform for the web.
              </h1>
              <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
                Zercel provides the developer tools and cloud infrastructure to
                build, scale, and secure more on the web.
              </p>
            </div>

            <div className="flex gap-4">
              <AuthButton
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Ship Now <span aria-hidden="true">→</span>
              </AuthButton>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <p className="text-sm text-muted-foreground">
            2025 Zercel. No rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div>
              A (functional and scaleable) parody by&nbsp;
              <Link href="https://krish.gg" className="hover:text-foreground">
                Krish
              </Link>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
