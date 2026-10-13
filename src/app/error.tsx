"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Scout hit a snag.</h1>
      <p className="text-muted-foreground">
        The page didn&apos;t load. Your saved project is still in this browser.
      </p>
      <Button className="h-11 w-fit px-4 text-base" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
