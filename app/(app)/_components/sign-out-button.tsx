import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

/**
 * Sign out. A bare `<form action={serverAction}>` so it works without client
 * JavaScript — the whole point of a sign-out is that it must always be reachable.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut aria-hidden />
        Sign out
      </Button>
    </form>
  );
}
