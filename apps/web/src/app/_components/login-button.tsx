"use client";
import { signIn } from "next-auth/react";
import { Button } from "~/components/ui/button";

export default function LoginButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Button onClick={() => signIn()}>{children}</Button>;
}
