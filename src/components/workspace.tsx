"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
import type { Project } from "@/lib/projects";
import {
  emptyWork,
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  isProjectComplete,
  remainingText,
  subscribeWorkspace,
  updateWorkspace,
  type ChatMessage,
  type Notice,
  type ProjectWork,
} from "@/lib/storage";

type FeatureStatus = {
  chat: boolean;
  images: boolean;
  speech: boolean;
};

type ImageNote = { kind: "setup" | "error" | "blocked"; text: string };

export function Workspace() {
  const saved = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot,
  );
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [status, setStatus] = useState<FeatureStatus | null>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [imageBusy, setImageBusy] = useState<number | null>(null);
  const [imageNotes, setImageNotes] = useState<Record<number, ImageNote>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: FeatureStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ chat: false, images: false, speech: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        projects: { ...current.projects, [projectId]: next },
      };
    });
    if (result.droppedPictures) {
      setStorageWarning(
        "This browser ran out of room for the picture files. They stay on the page until you refresh.",
      );
    }
  }

  function selectProject(id: string) {
    setImageNotes({});
    updateWorkspace((current) => ({ ...current, activeId: id }));
  }

  async function send(text: string) {
    const projectId = work.project.id;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const history = [...work.messages, userMessage];
    patchProject(projectId, (current) => ({ ...current, messages: [...current.messages, userMessage] }));
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
    patchProject(work.project.id, (current) => {
      if (current.notes.some((note) => note.messageId === message.id)) return current;
      return {
        ...current,
        notes: [
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
  }

  async function makePicture(index: number) {
    const projectId = work.project.id;
    const description = work.pictures[index]?.description.trim() ?? "";
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
        body: JSON.stringify({ description, projectTitle }),
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
            pictureIndex === index ? { description, dataUrl: data.dataUrl! } : picture,
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

  async function createProject() {
    setCreating(true);
    try {
      const response = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTitle: work.project.title }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        project?: Project;
        message?: string;
      };
      if (!data.ok || !data.project) {
        setImageNotes({});
        return;
      }
      const next = emptyWork(data.project);
      setImageNotes({});
      const result = updateWorkspace((current) => ({
        activeId: data.project!.id,
        projects: { ...current.projects, [data.project!.id]: next },
      }));
      if (result.droppedPictures) {
        setStorageWarning(
          "This browser ran out of room for the picture files. They stay on the page until you refresh.",
        );
      }
      setConfirmNew(false);
    } catch {
      setConfirmNew(false);
    } finally {
      setCreating(false);
    }
  }

  const savedProjects = Object.values(saved.projects).map((item) => ({
    id: item.project.id,
    title: item.project.title,
    complete: isProjectComplete(item),
  }));

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 px-4 py-4 lg:px-6">
        <Compass className="size-7 text-tide" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Scout</h1>
        <p className="text-sm text-muted-foreground">Research projects</p>
      </header>
      {storageWarning ? (
        <p className="px-4 pb-2 text-sm text-muted-foreground lg:px-6">{storageWarning}</p>
      ) : null}
      <main className="grid grid-cols-1 gap-4 px-4 pb-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-5 lg:px-6">
        <div className="lg:col-start-1 lg:row-start-1">
          <ProjectPanel
            project={work.project}
            remaining={remainingText(work)}
            complete={isProjectComplete(work)}
            saved={savedProjects}
            onSelect={selectProject}
            onNew={() => setConfirmNew(true)}
            creating={creating}
          />
        </div>
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <ChatPanel
            project={work.project}
            messages={work.messages}
            notices={work.notices}
            sending={sending}
            speechReady={status ? status.speech : null}
            onSend={send}
            onSave={saveNote}
            savedMessageIds={work.notes.map((note) => note.messageId)}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <ResultsTray
            notes={work.notes}
            pictures={work.pictures}
            hints={work.project.hints}
            imageBusy={imageBusy}
            imageNotes={imageNotes}
            onDescribe={(index, description) => {
              patchProject(work.project.id, (current) => ({
                ...current,
                pictures: current.pictures.map((picture, pictureIndex) =>
                  pictureIndex === index ? { ...picture, description } : picture,
                ),
              }));
            }}
            onGenerate={makePicture}
            onRemoveNote={(id) => {
              patchProject(work.project.id, (current) => ({
                ...current,
                notes: current.notes.filter((note) => note.id !== id),
              }));
            }}
          />
        </div>
      </main>
      <Dialog open={confirmNew} onOpenChange={setConfirmNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Start a new project?</DialogTitle>
            <DialogDescription className="text-base text-foreground/80">
              This page will show the new project. The one you are on stays saved in this browser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 text-base"
              onClick={() => setConfirmNew(false)}
              disabled={creating}
            >
              Keep this one
            </Button>
            <Button className="h-11 text-base" onClick={createProject} disabled={creating}>
              {creating ? "Finding a project…" : "New project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
