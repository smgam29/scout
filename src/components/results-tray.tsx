"use client";

import { Loader2 } from "lucide-react";

import { LearnedEditor } from "@/components/learned-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLearnedReady } from "@/lib/learned-html";
import {
  MAX_IMAGE_GENERATIONS,
  pictureTriesLeft,
  type ImageStyle,
  type PictureSlot,
} from "@/lib/storage";

export function ResultsTray({
  learnedHtml,
  pictures,
  hints,
  locked,
  imageBusy,
  imageNotes,
  notesHighlight,
  onDescribe,
  onStyleChange,
  onGenerate,
  onLearnedChange,
}: {
  learnedHtml: string;
  pictures: PictureSlot[];
  hints: string[];
  locked: boolean;
  imageBusy: number | null;
  imageNotes: Record<number, { kind: "setup" | "error" | "blocked"; text: string }>;
  notesHighlight: boolean;
  onDescribe: (index: number, description: string) => void;
  onStyleChange: (index: number, style: ImageStyle) => void;
  onGenerate: (index: number) => void;
  onLearnedChange: (html: string) => void;
}) {
  const learnedReady = isLearnedReady(learnedHtml);

  return (
    <section className="flex w-full flex-col gap-4" data-testid="results-tray">
      <div className="rounded-2xl border border-border bg-card px-4 py-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Pictures</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pictures.map((picture, index) => {
            const note = imageNotes[index];
            const busy = imageBusy === index;
            const triesLeft = pictureTriesLeft(picture);
            const outOfTries = triesLeft <= 0;
            return (
              <div
                key={index}
                className="flex min-w-0 flex-col rounded-2xl border border-border bg-muted/20 p-3"
                data-testid="image-slot"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium tabular-nums">Picture {index + 1}</p>
                  <p className="text-sm text-muted-foreground tabular-nums" data-testid="image-tries">
                    {outOfTries
                      ? "No tries left"
                      : `${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left`}
                  </p>
                </div>
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted">
                  {picture.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={picture.dataUrl}
                      alt={picture.description || `Picture ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center px-4 text-center text-sm text-muted-foreground">
                      {busy
                        ? "Making your picture…"
                        : "Write what to show, then make this picture."}
                    </div>
                  )}
                </div>
                <label className="mt-3 block text-sm" htmlFor={`picture-${index}`}>
                  What should this picture show?
                </label>
                <Input
                  id={`picture-${index}`}
                  value={picture.description}
                  onChange={(event) => onDescribe(index, event.target.value)}
                  maxLength={300}
                  placeholder={hints[index] || "A clear thing you learned"}
                  className="mt-1 h-11 text-base md:text-base"
                  data-testid="image-description"
                  disabled={locked}
                  readOnly={locked}
                />
                <div
                  className="mt-3 grid grid-cols-2 gap-2"
                  role="group"
                  aria-label={`Picture ${index + 1} style`}
                >
                  {(
                    [
                      { id: "cartoon", label: "Cartoon" },
                      { id: "photo", label: "Photo" },
                    ] as const
                  ).map((option) => {
                    const active = (picture.style ?? "cartoon") === option.id;
                    return (
                      <Button
                        key={option.id}
                        type="button"
                        variant={active ? "default" : "outline"}
                        className="h-11 text-base"
                        disabled={locked || busy || imageBusy !== null || outOfTries}
                        aria-pressed={active}
                        data-testid={`image-style-${option.id}`}
                        onClick={() => onStyleChange(index, option.id)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                {!locked ? (
                  <Button
                    type="button"
                    className="mt-3 h-11 w-full text-base"
                    onClick={() => onGenerate(index)}
                    disabled={busy || imageBusy !== null || outOfTries}
                    data-testid="make-picture"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden />
                        Making your picture…
                      </>
                    ) : outOfTries ? (
                      "No more tries"
                    ) : picture.dataUrl ? (
                      "Make this picture again"
                    ) : (
                      "Make this picture"
                    )}
                  </Button>
                ) : null}
                {outOfTries && !note ? (
                  <p className="mt-2 text-sm text-muted-foreground" data-testid="image-tries-done">
                    You used all {MAX_IMAGE_GENERATIONS} tries for this picture. Keep this one.
                  </p>
                ) : null}
                {note ? (
                  <p
                    className={
                      note.kind === "error"
                        ? "mt-2 text-sm text-destructive"
                        : "mt-2 text-sm text-muted-foreground"
                    }
                    data-testid="image-note"
                  >
                    {note.text}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div
        id="what-i-learned"
        className={
          notesHighlight
            ? "notes-highlight rounded-2xl border border-border bg-card px-4 py-4"
            : "rounded-2xl border border-border bg-card px-4 py-4"
        }
      >
        <h2 className="text-lg font-semibold tracking-[-0.02em]">What I learned</h2>
        <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
          {locked
            ? "This page is locked because the project was submitted."
            : "Write your project here. Type your own words, paste a picture, or press Save this on a Scout reply. You can edit, bold, italic, change colors, and drag a picture’s corner to resize it."}
        </p>
        <div className="mt-3">
          <LearnedEditor html={learnedHtml} locked={locked} onChange={onLearnedChange} />
        </div>
        {!locked ? (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="learned-status">
            {learnedReady
              ? "Nice — your write-up is ready for the PDF."
              : "Add a little more in the box above."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
