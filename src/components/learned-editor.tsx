"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Bold, Italic } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clampLearnedImageWidthPercent,
  compressLearnedImage,
  countLearnedImages,
  LEARNED_IMAGE_DEFAULT_WIDTH_PERCENT,
  LEARNED_IMAGE_MAX_COUNT,
  learnedImageStyle,
  sanitizeLearnedHtml,
} from "@/lib/learned-html";
import { cn } from "cn";

const COLORS = [
  { name: "Black", value: "#24343c" },
  { name: "Teal", value: "#1f6b74" },
  { name: "Blue", value: "#2a5f9e" },
  { name: "Green", value: "#2f6b3a" },
  { name: "Orange", value: "#b55a1a" },
  { name: "Red", value: "#a33a32" },
] as const;

type Overlay = { left: number; top: number; width: number; height: number };

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const resizingRef = useRef(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [imageNote, setImageNote] = useState<string | null>(null);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if (document.activeElement === node) return;
    if (resizingRef.current) return;
    if (node.innerHTML !== html) {
      const prevSrc = selectedImgRef.current?.getAttribute("src");
      node.innerHTML = html || "";
      if (prevSrc) {
        const next = [...node.querySelectorAll("img")].find(
          (img) => img.getAttribute("src") === prevSrc,
        );
        if (next) {
          selectedImgRef.current = next;
          updateOverlay(next);
          return;
        }
      }
      clearSelection();
    }
  }, [html]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!resizingRef.current) return;
      const img = selectedImgRef.current;
      const editor = editorRef.current;
      if (!img || !editor) return;
      const editorRect = editor.getBoundingClientRect();
      const paddingLeft = Number.parseFloat(getComputedStyle(editor).paddingLeft) || 0;
      const paddingRight = Number.parseFloat(getComputedStyle(editor).paddingRight) || 0;
      const contentWidth = Math.max(1, editorRect.width - paddingLeft - paddingRight);
      const imgLeft = img.getBoundingClientRect().left;
      const widthPx = Math.max(1, event.clientX - imgLeft);
      const percent = clampLearnedImageWidthPercent((widthPx / contentWidth) * 100);
      img.setAttribute("style", learnedImageStyle(percent));
      updateOverlay(img);
    }

    function onPointerUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      sync();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  function clearSelection() {
    selectedImgRef.current = null;
    setOverlay(null);
  }

  function updateOverlay(img: HTMLImageElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    setOverlay({
      left: imgRect.left - wrapRect.left,
      top: imgRect.top - wrapRect.top,
      width: imgRect.width,
      height: imgRect.height,
    });
  }

  function selectImage(img: HTMLImageElement) {
    if (locked) return;
    selectedImgRef.current = img;
    updateOverlay(img);
  }

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

  function insertImageAtCaret(dataUrl: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "";
    img.setAttribute("style", learnedImageStyle(LEARNED_IMAGE_DEFAULT_WIDTH_PERCENT));

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editor.appendChild(img);
      }
    } else {
      editor.appendChild(img);
    }
    sync();
    selectImage(img);
  }

  async function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (locked) return;
    const items = event.clipboardData?.items;
    if (!items?.length) return;

    let imageItem: DataTransferItem | null = null;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        imageItem = item;
        break;
      }
    }
    if (!imageItem) return;

    event.preventDefault();
    setImageNote(null);

    const currentCount = countLearnedImages(editorRef.current?.innerHTML ?? "");
    if (currentCount >= LEARNED_IMAGE_MAX_COUNT) {
      setImageNote(
        `You can paste up to ${LEARNED_IMAGE_MAX_COUNT} pictures here. Remove one to add another.`,
      );
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      setImageNote("That picture didn’t paste. Try copying it again.");
      return;
    }

    try {
      const dataUrl = await compressLearnedImage(file);
      insertImageAtCaret(dataUrl);
    } catch {
      setImageNote("That picture didn’t paste. Try a smaller photo.");
    }
  }

  function onEditorClick(event: MouseEvent<HTMLDivElement>) {
    if (locked) return;
    const target = event.target;
    if (target instanceof HTMLImageElement && editorRef.current?.contains(target)) {
      event.preventDefault();
      selectImage(target);
      return;
    }
    clearSelection();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (locked) return;
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const img = selectedImgRef.current;
    if (!img || !editorRef.current?.contains(img)) return;
    event.preventDefault();
    img.remove();
    clearSelection();
    sync();
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (locked || !selectedImgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    resizingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
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
      <div ref={wrapRef} className="relative">
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="What I learned"
          contentEditable={!locked}
          suppressContentEditableWarning
          data-placeholder="Type here, paste a picture, or press Save this on a Scout reply."
          className={cn(
            "learned-editor-field min-h-48 px-4 py-3 text-base leading-relaxed outline-none",
            locked ? "cursor-default opacity-90" : "focus-visible:bg-card",
          )}
          data-testid="learned-input"
          onInput={() => {
            setImageNote(null);
            sync();
          }}
          onBlur={sync}
          onPaste={onPaste}
          onClick={onEditorClick}
          onKeyDown={onKeyDown}
        />
        {!locked && overlay ? (
          <>
            <div
              className="learned-img-outline"
              style={{
                left: overlay.left,
                top: overlay.top,
                width: overlay.width,
                height: overlay.height,
              }}
              aria-hidden
            />
            <button
              type="button"
              className="learned-img-handle"
              style={{
                left: overlay.left + overlay.width,
                top: overlay.top + overlay.height,
              }}
              aria-label="Resize picture"
              data-testid="learned-img-resize"
              onPointerDown={startResize}
            />
          </>
        ) : null}
      </div>
      {imageNote ? (
        <p
          className="border-t border-border px-4 py-2 text-sm text-muted-foreground"
          data-testid="learned-image-note"
        >
          {imageNote}
        </p>
      ) : null}
    </div>
  );
}
