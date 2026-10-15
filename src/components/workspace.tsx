"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Compass } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { ProjectPanel } from "@/components/project-panel";
import { ResultsTray } from "@/components/results-tray";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { briefStatuses, coachLinesForGaps } from "@/lib/brief";
import {
  appendLearnedHtml,
  replyToLearnedHtml,
  sanitizeLearnedHtml,
} from "@/lib/learned-html";
import { downloadProjectPdf } from "@/lib/project-pdf";
import { instanceFromStarter, nextStarter, type Project } from "@/lib/projects";
import {
  canSubmitProject,
  emptyWork,
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  isChatAtLimit,
  isChatSoftWarn,
  isExploreReady,
  isProjectComplete,
  MAX_CHAT_MESSAGES,
  MAX_IMAGE_GENERATIONS,
  MIN_EXPLORE_MINUTES,
  pictureTriesLeft,
  subscribeWorkspace,
  updateWorkspace,
  type ChatMessage,
  type Notice,
  type ProjectWork,
} from "@/lib/storage";

type ImageNote = { kind: "setup" | "error" | "blocked"; text: string };

export function Workspace() {
  const saved = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot,
  );
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageBusy, setImageBusy] = useState<number | null>(null);
  const [imageNotes, setImageNotes] = useState<Record<number, ImageNote>>({});
  const [notesHighlight, setNotesHighlight] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const wasCompleteRef = useRef(false);
  const progressReadyRef = useRef(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!saved) return;
    const active = saved.projects[saved.activeId];
    if (!active) return;
    const complete = isProjectComplete(active);
    if (!progressReadyRef.current) {
      wasCompleteRef.current = complete;
      progressReadyRef.current = true;
      return;
    }
    if (complete && !wasCompleteRef.current) {
      setCelebrate(true);
    }
    if (!complete) {
      setCelebrate(false);
    }
    wasCompleteRef.current = complete;
  }, [saved]);

  if (!saved) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p className="flex items-center gap-2 text-base text-muted-foreground">
          <Compass className="size-5" aria-hidden />
          Opening your project…
        </p>
      </main>
    );
  }

  const work = saved.projects[saved.activeId];
  if (!work) return null;

  function patchProject(projectId: string, recipe: (work: ProjectWork) => ProjectWork) {
    const result = updateWorkspace((current) => {
      const active = current.projects[projectId];
      if (!active) return current;
      const next = recipe(active);
      return {
        ...current,
        projects: { [projectId]: next },
        activeId: projectId,
      };
    });
    if (result.droppedPictures) {
      setStorageWarning(
        "This browser ran out of room for the picture files. They stay on the page until you refresh.",
      );
    }
  }

  function showOnly(next: ProjectWork) {
    setImageNotes({});
    setCelebrate(false);
    wasCompleteRef.current = false;
    progressReadyRef.current = true;
    const result = updateWorkspace(() => ({
      activeId: next.project.id,
      projects: { [next.project.id]: next },
    }));
    if (result.droppedPictures) {
      setStorageWarning(
        "This browser ran out of room for the picture files. They stay on the page until you refresh.",
      );
    }
  }

  async function openFreshProject(previousTitle: string) {
    try {
      const response = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTitle: previousTitle }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        project?: Project;
        message?: string;
      };
      if (data.ok && data.project) {
        showOnly(emptyWork(data.project));
        return;
      }
      showOnly(
        emptyWork(
          instanceFromStarter(
            nextStarter(previousTitle),
            data.message || "Here is a new starter project.",
          ),
        ),
      );
    } catch {
      showOnly(
        emptyWork(
          instanceFromStarter(
            nextStarter(previousTitle),
            "Here is a new starter project.",
          ),
        ),
      );
    }
  }

  function requestSubmit() {
    setActionNotice(null);
    if (!isExploreReady(work)) {
      setActionNotice(
        `Keep exploring until ${MIN_EXPLORE_MINUTES} minutes are up, then you can submit.`,
      );
      return;
    }
    const gaps = coachLinesForGaps(work);
    if (gaps.length > 0) {
      const coaches: ChatMessage[] = gaps.slice(0, 4).map((line) => ({
        id: crypto.randomUUID(),
        role: "assistant",
        content: line,
        source: "guardrail",
      }));
      patchProject(work.project.id, (current) => ({
        ...current,
        messages: [...current.messages, ...coaches].slice(-MAX_CHAT_MESSAGES),
      }));
      const needsWrite = briefStatuses(work).some(
        (status) => !status.done && status.item.kind === "write",
      );
      if (needsWrite) flashNotes();
      document
        .querySelector('[data-testid="message-list"]')
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setActionNotice("Scout checked your brief — finish the missing steps, then submit again.");
      return;
    }
    setConfirmSubmit(true);
  }

  async function confirmAndSubmit() {
    if (!canSubmitProject(work)) return;
    setSubmitting(true);
    setActionNotice(null);
    const previousTitle = work.project.title;
    try {
      await downloadProjectPdf(work);
      setConfirmSubmit(false);
      setCelebrate(false);
      await openFreshProject(previousTitle);
      setActionNotice("PDF downloaded. Here is your next project.");
    } catch {
      setActionNotice("Couldn\u2019t make the PDF. Try again in a moment.");
      setConfirmSubmit(false);
    } finally {
      setSubmitting(false);
    }
  }

  function flashNotes() {
    const target = document.getElementById("what-i-learned");
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setNotesHighlight(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setNotesHighlight(false), 1600);
  }

  async function send(text: string) {
    if (isChatAtLimit(work)) return;
    const projectId = work.project.id;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const history = [...work.messages, userMessage];
    patchProject(projectId, (current) => {
      if (current.messages.length >= MAX_CHAT_MESSAGES) return current;
      return { ...current, messages: [...current.messages, userMessage] };
    });
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          project: {
            title: work.project.title,
            task: work.project.task,
            imageCount: work.project.imageCount,
            briefs: (work.project.briefs ?? []).map((item) => ({
              kind: item.kind,
              label: item.label,
            })),
          },
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        reply?: string;
        source?: "model" | "guardrail";
        error?: string;
        message?: string;
      };
      if (data.ok && data.reply) {
        const assistant: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          source: data.source,
        };
        patchProject(projectId, (current) =>
          current.messages.some((message) => message.id === assistant.id)
            ? current
            : { ...current, messages: [...current.messages, assistant] },
        );
        return;
      }
      const notice: Notice = {
        id: crypto.randomUUID(),
        afterMessageId: userMessage.id,
        kind: data.error === "missing_key" ? "setup" : "error",
        text: data.message || "That didn\u2019t go through. Try again.",
      };
      patchProject(projectId, (current) => ({
        ...current,
        notices: current.notices.some((item) => item.id === notice.id)
          ? current.notices
          : [...current.notices, notice],
      }));
    } catch {
      const notice: Notice = {
        id: crypto.randomUUID(),
        afterMessageId: userMessage.id,
        kind: "error",
        text: "That didn\u2019t go through. Check the connection and try again.",
      };
      patchProject(projectId, (current) => ({
        ...current,
        notices: [...current.notices, notice],
      }));
    } finally {
      setSending(false);
    }
  }

  function saveNote(message: ChatMessage) {
    const chunk = replyToLearnedHtml(message.content);
    if (!chunk) return;
    patchProject(work.project.id, (current) => {
      const alreadySaved = current.notes.some((note) => note.messageId === message.id);
      return {
        ...current,
        learnedHtml: appendLearnedHtml(current.learnedHtml, chunk),
        notes: alreadySaved
          ? current.notes
          : [
              ...current.notes,
              {
                id: crypto.randomUUID(),
                messageId: message.id,
                text: message.content,
                savedAt: Date.now(),
              },
            ],
      };
    });
    flashNotes();
  }

  async function makePicture(index: number) {
    const projectId = work.project.id;
    const slot = work.pictures[index];
    const description = slot?.description.trim() ?? "";
    const style = slot?.style === "photo" ? "photo" : "cartoon";
    const projectTitle = work.project.title;
    if (!description) {
      setImageNotes((current) => ({
        ...current,
        [index]: {
          kind: "error",
          text: "Write what the picture should show.",
        },
      }));
      return;
    }
    if (!slot || pictureTriesLeft(slot) <= 0) {
      setImageNotes((current) => ({
        ...current,
        [index]: {
          kind: "error",
          text: `You already made this picture ${MAX_IMAGE_GENERATIONS} times. Keep this one.`,
        },
      }));
      return;
    }
    // Count the attempt before calling the API so cost is capped even if it fails.
    patchProject(projectId, (current) => ({
      ...current,
      pictures: current.pictures.map((picture, pictureIndex) =>
        pictureIndex === index
          ? {
              ...picture,
              generations: Math.min(
                MAX_IMAGE_GENERATIONS,
                (picture.generations || 0) + 1,
              ),
            }
          : picture,
      ),
    }));
    setImageBusy(index);
    setImageNotes((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, projectTitle, style }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        dataUrl?: string;
        error?: string;
        message?: string;
      };
      if (data.ok && data.dataUrl) {
        patchProject(projectId, (current) => ({
          ...current,
          pictures: current.pictures.map((picture, pictureIndex) =>
            pictureIndex === index
              ? { ...picture, description, dataUrl: data.dataUrl!, style }
              : picture,
          ),
        }));
        return;
      }
      setImageNotes((current) => ({
        ...current,
        [index]: {
          kind:
            data.error === "missing_key"
              ? "setup"
              : data.error === "blocked"
                ? "blocked"
                : "error",
          text: data.message || "That picture didn\u2019t work. Try again.",
        },
      }));
    } catch {
      setImageNotes((current) => ({
        ...current,
        [index]: {
          kind: "error",
          text: "That picture didn\u2019t work. Check the connection and try again.",
        },
      }));
    } finally {
      setImageBusy(null);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 lg:px-6">
        <Compass className="size-7 text-tide" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Scout</h1>
        <p className="text-sm text-muted-foreground">
          Ask Scout, make 2 pictures, write what you learned.
        </p>
      </header>
      {storageWarning ? (
        <p className="px-4 pb-2 text-sm text-muted-foreground lg:px-6">{storageWarning}</p>
      ) : null}
      <main className="grid grid-cols-1 gap-4 px-4 pb-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-5 lg:px-6">
        <div className="lg:sticky lg:top-4">
          <ProjectPanel
            work={work}
            celebrate={celebrate}
            submitting={submitting}
            onSubmit={requestSubmit}
            actionNotice={actionNotice}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ChatPanel
            project={work.project}
            messages={work.messages}
            notices={work.notices}
            sending={sending}
            locked={false}
            chatAtLimit={isChatAtLimit(work)}
            chatSoftWarn={isChatSoftWarn(work)}
            onSend={send}
            onSave={saveNote}
            savedMessageIds={work.notes.map((note) => note.messageId)}
          />
          <ResultsTray
            learnedHtml={work.learnedHtml ?? ""}
            pictures={work.pictures.slice(0, work.project.imageCount)}
            hints={work.project.hints}
            locked={false}
            imageBusy={imageBusy}
            imageNotes={imageNotes}
            notesHighlight={notesHighlight}
            onDescribe={(index, description) => {
              patchProject(work.project.id, (current) => ({
                ...current,
                pictures: current.pictures.map((picture, pictureIndex) =>
                  pictureIndex === index ? { ...picture, description } : picture,
                ),
              }));
            }}
            onStyleChange={(index, style) => {
              patchProject(work.project.id, (current) => ({
                ...current,
                pictures: current.pictures.map((picture, pictureIndex) =>
                  pictureIndex === index ? { ...picture, style } : picture,
                ),
              }));
            }}
            onGenerate={makePicture}
            onLearnedChange={(learnedHtml) => {
              patchProject(work.project.id, (current) => ({
                ...current,
                learnedHtml: sanitizeLearnedHtml(learnedHtml),
              }));
            }}
          />
        </div>
      </main>
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Submit your project?</DialogTitle>
            <DialogDescription className="text-base text-foreground/80">
              Are you sure you want to submit your project? You won&apos;t be able to change
              anything once you have submitted. Scout will download your PDF and open a new
              project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 text-base"
              onClick={() => setConfirmSubmit(false)}
              disabled={submitting}
            >
              Keep working
            </Button>
            <Button
              className="h-11 text-base"
              onClick={() => void confirmAndSubmit()}
              disabled={submitting}
              data-testid="confirm-submit"
            >
              {submitting ? "Making your PDF…" : "Submit and download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
