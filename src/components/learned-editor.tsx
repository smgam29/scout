"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sanitizeLearnedHtml } from "@/lib/learned-html";
import { cn } from "cn";

const COLORS = [
  { name: "Black", value: "#24343c" },
  { name: "Teal", value: "#1f6b74" },
  { name: "Blue", value: "#2a5f9e" },
  { name: "Green", value: "#2f6b3a" },
  { name: "Orange", value: "#b55a1a" },
  { name: "Red", value: "#a33a32" },
] as const;

export function LearnedEditor({
  html,
  locked,
  onChange,
}: {
  html: string;
  locked: boolean;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if (document.activeElement === node) return;
    if (node.innerHTML !== html) {
      node.innerHTML = html || "";
    }
  }, [html]);

  function runCommand(command: string, value?: string) {
    if (locked) return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function sync() {
    const node = editorRef.current;
    if (!node) return;
    onChange(sanitizeLearnedHtml(node.innerHTML));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border" data-testid="learned-editor">
      {!locked ? (
        <div
          className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-2"
          role="toolbar"
          aria-label="Text style"
        >
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand("bold")}
            aria-label="Bold"
            data-testid="learned-bold"
          >
            <Bold className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand("italic")}
            aria-label="Italic"
            data-testid="learned-italic"
          >
            <Italic className="size-4" aria-hidden />
          </Button>
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              className="size-8 rounded-full border border-border shadow-[inset_0_0_0_1px_oklch(1_0_0/0.35)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ backgroundColor: color.value }}
              aria-label={`Text color ${color.name}`}
              title={color.name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand("foreColor", color.value)}
              data-testid={`learned-color-${color.name.toLowerCase()}`}
            />
          ))}
        </div>
      ) : null}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="What I learned"
        contentEditable={!locked}
        suppressContentEditableWarning
        data-placeholder="Type here, or press Save this on a Scout reply to paste it in."
        className={cn(
          "learned-editor-field min-h-48 px-4 py-3 text-base leading-relaxed outline-none",
          locked ? "cursor-default opacity-90" : "focus-visible:bg-card",
        )}
        data-testid="learned-input"
        onInput={sync}
        onBlur={sync}
      />
    </div>
  );
}
