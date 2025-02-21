"use client";

import { signIn, signOut } from "next-auth/react";
import { Button } from "~/components/ui/button";
// import { signIn, signOut } from "~/server/auth";

export default function AuthButton({
  children,
  loggedIn,
}: {
  children?: React.ReactNode;
  loggedIn?: boolean;
}) {
  return (
    <Button onClick={loggedIn ? () => signOut() : () => signIn("github")}>
      {loggedIn ? "Sign Out" : "Sign In"}
    </Button>
  );
}
