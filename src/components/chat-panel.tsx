"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { KidMarkdown } from "@/components/kid-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/lib/projects";
import type { ChatMessage, Notice } from "@/lib/storage";

export function ChatPanel({
  project,
  messages,
  notices,
  sending,
  locked,
  chatAtLimit,
  chatSoftWarn,
  onSend,
  onSave,
  savedMessageIds,
}: {
  project: Project;
  messages: ChatMessage[];
  notices: Notice[];
  sending: boolean;
  locked: boolean;
  chatAtLimit: boolean;
  chatSoftWarn: boolean;
  onSend: (text: string) => void;
  onSave: (message: ChatMessage) => void;
  savedMessageIds: string[];
}) {
  const [draft, setDraft] = useState("");
  const [saveCueId, setSaveCueId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const saveCueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, notices, sending]);

  useEffect(() => {
    return () => {
      if (saveCueTimerRef.current) clearTimeout(saveCueTimerRef.current);
    };
  }, []);

  function handleSave(message: ChatMessage) {
    if (locked) return;
    onSave(message);
    setSaveCueId(message.id);
    if (saveCueTimerRef.current) clearTimeout(saveCueTimerRef.current);
    saveCueTimerRef.current = setTimeout(() => {
      setSaveCueId((current) => (current === message.id ? null : current));
    }, 2800);
  }

  function submit(text: string) {
    const next = text.trim();
    if (locked || chatAtLimit || !next || sending) return;
    setDraft("");
    onSend(next);
  }

  const composerLocked = locked || chatAtLimit;

  return (
    <div className="flex flex-col gap-3">
      <section className="flex h-[min(58dvh,32rem)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Ask Scout</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-testid="message-list">
          {messages.length === 0 ? (
            <div className="max-w-[62ch]">
              <p className="text-base leading-relaxed">
                Ask about your project. Scout helps you find facts, write a note, and plan your
                pictures.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Answers stay on this project. Scout will not browse the web or make up a fake answer.
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-4" aria-live="polite">
            {messages.map((message) => {
              const note = notices.find((item) => item.afterMessageId === message.id);
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
                    <div className="mt-1">
                      <KidMarkdown text={message.content} />
                    </div>
                    {message.role === "assistant" &&
                    message.source !== "guardrail" &&
                    !locked ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 bg-card px-3 text-base"
                          onClick={() => handleSave(message)}
                          data-testid="save-note"
                        >
                          {saveCueId === message.id
                            ? "Pasted into What I learned"
                            : savedMessageIds.includes(message.id)
                              ? "Add again"
                              : "Save this"}
                        </Button>
                      </div>
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
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-testid="chat-loading"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Scout is thinking…
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>
      </section>

      {chatSoftWarn && !composerLocked ? (
        <p
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
          data-testid="chat-soft-warn"
          role="status"
        >
          You&apos;ve done plenty of research. Now it&apos;s time to finish your report —
          add facts to What I learned, finish your pictures, then submit.
        </p>
      ) : null}
      {locked ? (
        <p
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
          data-testid="chat-locked"
        >
          This project is submitted, so chat is locked. Start a new project when you are ready.
        </p>
      ) : chatAtLimit ? (
        <p
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
          data-testid="chat-at-limit"
          role="status"
        >
          That&apos;s enough questions for this project. Use What I learned and your pictures to
          finish, then submit when your explore time is up.
        </p>
      ) : (
        <div
          className="shrink-0 rounded-2xl border border-border bg-card px-4 py-3"
          data-testid="chat-composer"
        >
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
      )}
    </div>
  );
}
