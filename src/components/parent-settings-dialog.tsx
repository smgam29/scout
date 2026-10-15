"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ParentSettingsButton() {
  const [open, setOpen] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setDraft("");
    void (async () => {
      try {
        const response = await fetch("/api/settings");
        const data = (await response.json()) as { hasKey?: boolean };
        if (!cancelled) setHasKey(Boolean(data.hasKey));
      } catch {
        if (!cancelled) setHasKey(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: draft }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        hasKey?: boolean;
        message?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not save the key.");
        return;
      }
      setHasKey(true);
      setDraft("");
    } catch {
      setError("Could not save the key. Check that Scout is running.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", { method: "DELETE" });
      const data = (await response.json()) as {
        ok?: boolean;
        hasKey?: boolean;
        message?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not clear the key.");
        return;
      }
      setHasKey(Boolean(data.hasKey));
      setDraft("");
    } catch {
      setError("Could not clear the key. Check that Scout is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        data-testid="parent-settings"
      >
        <Settings2 className="size-3.5" aria-hidden />
        Parent settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Parent settings</DialogTitle>
            <DialogDescription className="text-base text-foreground/80">
              Only a parent should change this. Scout keeps the OpenRouter key on this Mac and
              never shows it in the browser after you save.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground" data-testid="parent-settings-status">
              {hasKey === null
                ? "Checking…"
                : hasKey
                  ? "Key saved"
                  : "No key yet"}
            </p>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">OpenRouter API key</span>
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-or-…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="h-11 text-base"
                data-testid="parent-settings-key"
              />
            </label>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              onClick={() => void clear()}
              disabled={busy || !hasKey}
            >
              Clear
            </Button>
            <Button
              type="button"
              className="h-11 text-base"
              onClick={() => void save()}
              disabled={busy || !draft.trim()}
              data-testid="parent-settings-save"
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
