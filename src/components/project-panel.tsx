"use client";

import { Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects";

type SavedProject = {
  id: string;
  title: string;
  complete: boolean;
};

export function ProjectPanel({
  project,
  remaining,
  complete,
  saved,
  onSelect,
  onNew,
  creating,
}: {
  project: Project;
  remaining: string;
  complete: boolean;
  saved: SavedProject[];
  onSelect: (id: string) => void;
  onNew: () => void;
  creating: boolean;
}) {
  return (
    <section className="rounded-2xl bg-tide px-5 py-5 text-tide-foreground shadow-[0_16px_32px_-20px_oklch(0.28_0.04_210/0.7)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-tide-muted">
          <Compass className="size-5" aria-hidden />
          <p className="text-sm font-medium">Scout</p>
        </div>
        {complete ? (
          <Badge className="h-6 bg-primary px-2 text-sm text-primary-foreground">
            Complete
          </Badge>
        ) : null}
      </div>
      <h2
        className="mt-4 text-3xl font-semibold tracking-[-0.02em]"
        data-testid="project-title"
      >
        {project.title}
      </h2>
      <p className="mt-3 max-w-[42ch] text-lg leading-snug" data-testid="project-task">
        {project.task}
      </p>
      <p className="mt-4 text-sm text-tide-muted" data-testid="project-progress">
        {remaining}
      </p>
      {project.notice ? (
        <p className="mt-3 text-sm text-tide-muted" data-testid="project-notice">
          {project.notice}
        </p>
      ) : null}
      <Button
        className="mt-5 h-11 px-4 text-base"
        onClick={onNew}
        disabled={creating}
        data-testid="new-project"
      >
        {creating ? "Finding a project…" : "New project"}
      </Button>
      {saved.length > 1 ? (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-tide-muted">Saved in this browser</h3>
          <div className="mt-2 flex flex-col gap-2">
            {saved.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={item.id === project.id ? "true" : undefined}
                className="flex min-h-11 items-center justify-between rounded-xl border border-white/20 px-3 py-2 text-left text-base hover:bg-white/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/70 aria-[current=true]:bg-white/15"
              >
                <span>{item.title}</span>
                {item.complete ? <span className="text-sm text-tide-muted">Done</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
