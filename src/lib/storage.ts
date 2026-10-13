import {
  starterProject,
  type Project,
} from "@/lib/projects";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "model" | "guardrail";
};

export type Notice = {
  id: string;
  afterMessageId: string;
  kind: "setup" | "error";
  text: string;
};

export type Note = {
  id: string;
  messageId: string;
  text: string;
  savedAt: number;
};

export type PictureSlot = {
  description: string;
  dataUrl: string;
};

export type ProjectWork = {
  project: Project;
  messages: ChatMessage[];
  notices: Notice[];
  notes: Note[];
  pictures: PictureSlot[];
};

export type SavedWorkspace = {
  activeId: string;
  projects: Record<string, ProjectWork>;
};

const STORAGE_KEY = "scout.workspace.v1";
const CHANGE_EVENT = "scout-workspace";

let snapshot: SavedWorkspace | null = null;

export function getWorkspaceSnapshot(): SavedWorkspace | null {
  if (typeof window === "undefined") return null;
  if (!snapshot) snapshot = loadWorkspace();
  return snapshot;
}

let serverSnapshot: SavedWorkspace | null = null;

export function getServerWorkspaceSnapshot(): SavedWorkspace {
  if (!serverSnapshot) serverSnapshot = freshWorkspace();
  return serverSnapshot;
}

export function subscribeWorkspace(listener: () => void) {
  const onChange = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = loadWorkspace();
    listener();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateWorkspace(
  recipe: (current: SavedWorkspace) => SavedWorkspace,
): { droppedPictures: boolean } {
  const current = snapshot ?? loadWorkspace();
  const next = recipe(current);
  const result = saveWorkspace(next);
  snapshot = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return result;
}

export function emptyPictures(count: number): PictureSlot[] {
  return Array.from({ length: count }, () => ({
    description: "",
    dataUrl: "",
  }));
}

export function emptyWork(project: Project): ProjectWork {
  return {
    project,
    messages: [],
    notices: [],
    notes: [],
    pictures: emptyPictures(project.imageCount),
  };
}

function freshWorkspace(): SavedWorkspace {
  const project = starterProject();
  return {
    activeId: project.id,
    projects: { [project.id]: emptyWork(project) },
  };
}

function asString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asString(record.title, 80);
  const task = asString(record.task, 400);
  const id = asString(record.id, 80);
  if (!id || !title || !task) return null;
  const prompts = Array.isArray(record.prompts)
    ? record.prompts
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const hints = Array.isArray(record.hints)
    ? record.hints
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .slice(0, 3)
    : [];
  const source = record.source === "model" ? "model" : "starter";
  const notice =
    typeof record.notice === "string" && record.notice.trim()
      ? record.notice.trim().slice(0, 240)
      : null;
  return {
    id,
    title,
    task,
    imageCount: 3,
    prompts,
    hints,
    source,
    notice,
  };
}

function normalizeWork(value: unknown): ProjectWork | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const project = normalizeProject(record.project);
  if (!project) return null;
  const messages = Array.isArray(record.messages)
    ? record.messages.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const message = item as Record<string, unknown>;
        const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
        const content = asString(message.content, 2000);
        const id = asString(message.id, 80);
        if (!role || !content || !id) return [];
        const source =
          message.source === "guardrail"
            ? "guardrail"
            : message.source === "model"
              ? "model"
              : undefined;
        return [{ id, role, content, source } satisfies ChatMessage];
      }).slice(-40)
    : [];
  const notices = Array.isArray(record.notices)
    ? record.notices.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const notice = item as Record<string, unknown>;
        const id = asString(notice.id, 80);
        const afterMessageId = asString(notice.afterMessageId, 80);
        const text = asString(notice.text, 400);
        const kind = notice.kind === "setup" ? "setup" : notice.kind === "error" ? "error" : null;
        if (!id || !afterMessageId || !text || !kind) return [];
        return [{ id, afterMessageId, kind, text } satisfies Notice];
      }).slice(-20)
    : [];
  const notes = Array.isArray(record.notes)
    ? record.notes.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const note = item as Record<string, unknown>;
        const id = asString(note.id, 80);
        const messageId = asString(note.messageId, 80);
        const text = asString(note.text, 2000);
        const savedAt = typeof note.savedAt === "number" ? note.savedAt : Date.now();
        if (!id || !text) return [];
        return [{ id, messageId, text, savedAt } satisfies Note];
      }).slice(-12)
    : [];
  const pictures = emptyPictures(3);
  if (Array.isArray(record.pictures)) {
    record.pictures.slice(0, 3).forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const picture = item as Record<string, unknown>;
      pictures[index] = {
        description: asString(picture.description, 300),
        dataUrl: typeof picture.dataUrl === "string" && picture.dataUrl.startsWith("data:image/")
          ? picture.dataUrl
          : "",
      };
    });
  }
  return { project, messages, notices, notes, pictures };
}

export function loadWorkspace(): SavedWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshWorkspace();
    const parsed = JSON.parse(raw) as Partial<SavedWorkspace>;
    if (!parsed || typeof parsed !== "object" || !parsed.projects) return freshWorkspace();
    const projects: Record<string, ProjectWork> = {};
    for (const [id, work] of Object.entries(parsed.projects)) {
      const normalized = normalizeWork(work);
      if (normalized) projects[normalized.project.id || id] = normalized;
    }
    const active = projects[parsed.activeId ?? ""];
    const first = Object.values(projects)[0];
    if (!active && !first) return freshWorkspace();
    return {
      activeId: active ? parsed.activeId! : first.project.id,
      projects,
    };
  } catch {
    return freshWorkspace();
  }
}

export function saveWorkspace(data: SavedWorkspace): {
  ok: boolean;
  droppedPictures: boolean;
} {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true, droppedPictures: false };
  } catch {
    const slim: SavedWorkspace = {
      activeId: data.activeId,
      projects: Object.fromEntries(
        Object.entries(data.projects).map(([id, work]) => [
          id,
          { ...work, pictures: emptyPictures(3) },
        ]),
      ),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      return { ok: true, droppedPictures: true };
    } catch {
      return { ok: false, droppedPictures: true };
    }
  }
}

export function isProjectComplete(work: ProjectWork): boolean {
  const picturesReady =
    work.pictures.filter((picture) => picture.dataUrl).length >= work.project.imageCount;
  return work.notes.length > 0 && picturesReady;
}

export function remainingText(work: ProjectWork): string {
  const pictureCount = work.pictures.filter((picture) => picture.dataUrl).length;
  if (isProjectComplete(work)) {
    return `Project complete. You saved a note and made all ${work.project.imageCount} pictures.`;
  }
  const parts: string[] = [];
  if (work.notes.length === 0) parts.push("save a note from a reply");
  const picturesLeft = work.project.imageCount - pictureCount;
  if (picturesLeft > 0) {
    parts.push(`make ${picturesLeft} picture${picturesLeft === 1 ? "" : "s"}`);
  }
  return `Still to do: ${parts.join(" and ")}.`;
}
