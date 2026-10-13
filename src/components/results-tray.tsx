"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Note, PictureSlot } from "@/lib/storage";

export function ResultsTray({
  notes,
  pictures,
  hints,
  imageBusy,
  imageNotes,
  onDescribe,
  onGenerate,
  onRemoveNote,
}: {
  notes: Note[];
  pictures: PictureSlot[];
  hints: string[];
  imageBusy: number | null;
  imageNotes: Record<number, { kind: "setup" | "error" | "blocked"; text: string }>;
  onDescribe: (index: number, description: string) => void;
  onGenerate: (index: number) => void;
  onRemoveNote: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-6" data-testid="results-tray">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">What I learned</h2>
        {notes.length === 0 ? (
          <p className="mt-2 max-w-[42ch] text-sm text-muted-foreground" data-testid="notes-empty">
            When Scout says something you want to keep, press Save this on that reply.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <p className="whitespace-pre-wrap text-base leading-relaxed">{note.text}</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 h-11 px-2 text-base"
                  onClick={() => onRemoveNote(note.id)}
                >
                  Remove this note
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Pictures</h2>
        <div className="mt-3 flex flex-col gap-4">
          {pictures.map((picture, index) => {
            const note = imageNotes[index];
            const busy = imageBusy === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-3"
                data-testid="image-slot"
              >
                <p className="text-sm font-medium tabular-nums">Picture {index + 1}</p>
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
                      {busy ? "Making your picture…" : "Empty for now"}
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
                />
                <Button
                  type="button"
                  className="mt-3 h-11 w-full text-base"
                  onClick={() => onGenerate(index)}
                  disabled={busy || imageBusy !== null}
                  data-testid="make-picture"
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden />
                      Making your picture…
                    </>
                  ) : picture.dataUrl ? (
                    "Make this picture again"
                  ) : (
                    "Make this picture"
                  )}
                </Button>
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
    </section>
  );
}
