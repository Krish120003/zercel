import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import LoginButton from "./login-button";

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

export function Nav() {
  return (
    <nav className="border-b border-gray-800 bg-black">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-5 w-5 text-white" />
              <span className="text-lg font-bold text-white">Zercel</span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {/* <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Products
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Solutions
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Resources
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Docs
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Pricing
              </Link> */}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="link"
              className="text-sm text-gray-400 hover:text-white"
            >
              Learn More
            </Button>

            <LoginButton>Log In</LoginButton>
          </div>
        </div>
      </div>
    </nav>
  );
}

function HeroGraphic() {
  return (
    <div className="relative mt-16 h-[40vh] w-full">
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
      <main className="relative flex-1 overflow-hidden bg-black pb-32">
        <div className="container mx-auto px-4 py-24">
          <div className="flex flex-col items-center gap-12 text-center">
            <div className="max-w-4xl space-y-6">
              <h1 className="text-balance text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
                Your incomplete platform for the web.
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-gray-400 md:text-xl">
                Zercel provides the developer tools and cloud infrastructure to
                build, scale, and secure more shitposts on the web.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
              >
                Ship Now <span aria-hidden="true">→</span>
              </Button>
            </div>

            {/* Hero Graphic */}
            <HeroGraphic />
          </div>
        </div>
        <div className="absolute bottom-0 w-full">
          <Footer />
        </div>
      </main>
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <p className="text-sm text-gray-500">
            2025 Zercel. No rights reserved.
          </p>
          <div className="flex text-sm text-gray-500">
            A (functional and scaleable) parody by&nbsp;
            <Link href="https://krish.gg" className="">
              Krish
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
