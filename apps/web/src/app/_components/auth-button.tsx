"use client";

import { signIn, signOut } from "next-auth/react";
import { Button, type ButtonProps } from "~/components/ui/button";
// import { signIn, signOut } from "~/server/auth";

export default function AuthButton({
  children,
  loggedIn,
  ...props
}: {
  children?: React.ReactNode;
  loggedIn?: boolean;
} & ButtonProps) {
  return (
    <Button
      onClick={loggedIn ? () => signOut() : () => signIn("github")}
      {...props}
    >
      {children ?? (loggedIn ? "Sign Out" : "Sign In")}
    </Button>
  );
}
