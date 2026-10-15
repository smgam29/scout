"use client";

import { useEffect, useState } from "react";
import { Check, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects";
import {
  MIN_EXPLORE_MINUTES,
  progressSteps,
  type ProjectWork,
} from "@/lib/storage";

export function ProjectPanel({
  work,
  celebrate,
  submitting,
  onSubmit,
  actionNotice,
}: {
  work: ProjectWork;
  celebrate: boolean;
  submitting: boolean;
  onSubmit: () => void;
  actionNotice: string | null;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (typeof work.startedAt !== "number") return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [work.startedAt]);

  const progress = progressSteps(work, now ?? work.startedAt);
  const project: Project = work.project;
  const steps =
    progress.briefs.length > 0
      ? progress.briefs.map((status) => ({
          id: status.item.id,
          label: status.item.label,
          done: status.done,
          detail:
            status.item.kind === "pictures"
              ? `${progress.picturesDone}/${progress.picturesTotal}`
              : undefined,
        }))
      : [
          { id: "ask", label: "Ask Scout", done: progress.asked },
          {
            id: "pictures",
            label: `Make ${progress.picturesTotal} pictures`,
            done: progress.picturesReady,
            detail: `${progress.picturesDone}/${progress.picturesTotal}`,
          },
          { id: "note", label: "Write what you learned", done: progress.noted },
        ];

  return (
    <section className="rounded-2xl bg-tide px-5 py-5 text-tide-foreground shadow-[0_16px_32px_-20px_oklch(0.28_0.04_210/0.7)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-tide-muted">
          <Compass className="size-5" aria-hidden />
          <p className="text-sm font-medium">Project brief</p>
        </div>
        {progress.canSubmit ? (
          <Badge className="h-6 bg-primary px-2 text-sm text-primary-foreground">Complete</Badge>
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
      <p
        className="mt-4 text-sm text-tide-muted tabular-nums"
        data-testid="explore-time"
        aria-live="polite"
      >
        {progress.exploreReady
          ? `You explored for ${MIN_EXPLORE_MINUTES} minutes — nice and steady.`
          : `You\u2019ve been exploring for ${progress.exploreMinutes} of ${MIN_EXPLORE_MINUTES} minutes.`}
      </p>
      {celebrate ? (
        <div
          className="mt-4 rounded-xl bg-primary/95 px-4 py-3 text-primary-foreground"
          data-testid="project-celebrate"
          role="status"
        >
          <p className="text-base font-semibold tracking-[-0.02em]">You finished this project!</p>
          <p className="mt-1 text-sm opacity-90">
            {progress.exploreReady
              ? "Submit it to download your PDF. Then Scout will open a new project."
              : `Keep exploring until ${MIN_EXPLORE_MINUTES} minutes are up, then you can submit.`}
          </p>
        </div>
      ) : null}
      <ul className="mt-4 flex flex-col gap-2" data-testid="project-checklist" aria-label="Project brief">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 text-base">
            <span
              className={
                step.done
                  ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/25 text-tide-muted"
              }
              aria-hidden
            >
              {step.done ? <Check className="size-4" strokeWidth={2.5} /> : null}
            </span>
            <span className={step.done ? "font-medium leading-snug" : "leading-snug text-tide-muted"}>
              {step.label}
              {"detail" in step && step.detail ? (
                <span className="ml-2 tabular-nums text-sm opacity-80">{step.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-tide-muted" data-testid="project-progress">
        {progress.summary}
      </p>
      {project.notice ? (
        <p className="mt-3 text-sm text-tide-muted" data-testid="project-notice">
          {project.notice}
        </p>
      ) : null}
      {actionNotice ? (
        <p className="mt-3 text-sm text-tide-muted" data-testid="project-action-notice" role="status">
          {actionNotice}
        </p>
      ) : null}
      <Button
        className="mt-5 h-11 w-full px-4 text-base"
        onClick={onSubmit}
        disabled={!progress.exploreReady || submitting}
        data-testid="submit-project"
      >
        {submitting ? "Making your PDF…" : "Submit project"}
      </Button>
    </section>
  );
}
