"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/lib/projects";
import type { ChatMessage, Notice } from "@/lib/storage";

type SpeechState = "idle" | "loading" | "playing";

export function ChatPanel({
  project,
  messages,
  notices,
  sending,
  speechReady,
  onSend,
  onSave,
  savedMessageIds,
}: {
  project: Project;
  messages: ChatMessage[];
  notices: Notice[];
  sending: boolean;
  speechReady: boolean | null;
  onSend: (text: string) => void;
  onSave: (message: ChatMessage) => void;
  savedMessageIds: string[];
}) {
  const [draft, setDraft] = useState("");
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [speechId, setSpeechId] = useState<string | null>(null);
  const [speechNote, setSpeechNote] = useState<{ id: string; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, notices, sending]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function stopSpeech() {
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSpeechState("idle");
    setSpeechId(null);
  }

  async function hear(message: ChatMessage) {
    if (speechState === "loading") return;
    if (speechState === "playing" && speechId === message.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    setSpeechId(message.id);
    setSpeechState("loading");
    setSpeechNote(null);
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content }),
      });
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes("audio")) {
        const data = (await response.json()) as { message?: string };
        setSpeechNote({
          id: message.id,
          text: data.message ?? "Voice didn\u2019t work. Try again.",
        });
        setSpeechState("idle");
        setSpeechId(null);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.autoplay = false;
      audioRef.current = audio;
      audio.onended = () => {
        setSpeechState("idle");
        setSpeechId(null);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      };
      await audio.play();
      setSpeechState("playing");
    } catch {
      setSpeechNote({ id: message.id, text: "Voice didn\u2019t work. Try again." });
      setSpeechState("idle");
      setSpeechId(null);
    }
  }

  function submit(text: string) {
    const next = text.trim();
    if (!next || sending) return;
    setDraft("");
    onSend(next);
  }

  return (
    <section className="flex min-h-[72dvh] flex-col rounded-2xl border border-border bg-card lg:h-[calc(100dvh-5.5rem)] lg:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Ask Scout</h2>
        <p className="text-right text-sm text-muted-foreground" data-testid="voice-status">
          {speechReady === false
            ? "Voice needs a setup key from a parent."
            : speechReady
              ? "Press Hear this on a reply. It will not play by itself."
              : "Checking voice…"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-testid="message-list">
        {messages.length === 0 ? (
          <div className="max-w-[62ch]">
            <p className="text-base leading-relaxed">
              Ask about your project. Scout helps you find facts, write a note, and plan your pictures.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Answers stay on this project. Scout will not browse the web or make up a fake answer.
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-4" aria-live="polite">
          {messages.map((message) => {
            const note = notices.find((item) => item.afterMessageId === message.id);
            const speechLabel =
              speechState === "loading" && speechId === message.id
                ? "Getting the voice…"
                : speechState === "playing" && speechId === message.id
                  ? "Stop"
                  : "Hear this";
            return (
              <div key={message.id} className="flex flex-col gap-2">
                <div
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[min(100%,65ch)] rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
                      : "max-w-[min(100%,65ch)] rounded-2xl bg-muted px-4 py-3"
                  }
                  data-testid={message.role === "assistant" ? "assistant-message" : "user-message"}
                >
                  <p className="text-sm font-medium">
                    {message.role === "user" ? "You" : "Scout"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">
                    {message.content}
                  </p>
                  {message.role === "assistant" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 bg-card px-3 text-base"
                        onClick={() => hear(message)}
                        disabled={speechState === "loading" && speechId !== message.id}
                        data-testid="speech-button"
                        aria-label={speechLabel}
                      >
                        {speechState === "loading" && speechId === message.id ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : speechState === "playing" && speechId === message.id ? (
                          <Square aria-hidden />
                        ) : (
                          <Volume2 aria-hidden />
                        )}
                        {speechLabel}
                      </Button>
                      {message.source !== "guardrail" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 bg-card px-3 text-base"
                          onClick={() => onSave(message)}
                          disabled={savedMessageIds.includes(message.id)}
                        >
                          {savedMessageIds.includes(message.id) ? "Saved" : "Save this"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {speechNote?.id === message.id ? (
                    <p className="mt-2 text-sm text-muted-foreground" data-testid="speech-note">
                      {speechNote.text}
                    </p>
                  ) : null}
                </div>
                {note ? (
                  <p
                    className={
                      note.kind === "error"
                        ? "max-w-[65ch] text-sm text-destructive"
                        : "max-w-[65ch] text-sm text-muted-foreground"
                    }
                    data-testid={note.kind === "setup" ? "setup-notice" : "error-notice"}
                  >
                    {note.text}
                  </p>
                ) : null}
              </div>
            );
          })}
          {sending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="chat-loading">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Scout is thinking…
            </p>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-border px-4 py-3">
        {project.prompts.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {project.prompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="secondary"
                className="h-auto min-h-11 whitespace-normal px-3 py-2 text-left text-base"
                onClick={() => submit(prompt)}
                disabled={sending}
              >
                {prompt}
              </Button>
            ))}
          </div>
        ) : null}
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <label className="sr-only" htmlFor="scout-question">
            Your question
          </label>
          <Textarea
            id="scout-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            maxLength={1500}
            placeholder="Ask a question about your project"
            className="min-h-12 flex-1 text-base md:text-base"
            data-testid="chat-input"
          />
          <Button
            type="submit"
            className="h-11 px-4 text-base"
            disabled={sending || draft.trim().length === 0}
            data-testid="chat-send"
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </form>
      </div>
    </section>
  );
}
