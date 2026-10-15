import { allBriefsDone, briefStatuses, defaultBriefsForProject } from "@/lib/brief";
import { isLearnedReady, sanitizeLearnedHtml } from "@/lib/learned-html";
import {
  STARTERS,
  starterProject,
  type BriefItem,
  type BriefKind,
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

export type ImageStyle = "cartoon" | "photo";

/** Max times each picture slot may call the image API (first make + regenerations). */
export const MAX_IMAGE_GENERATIONS = 3;

/** Minimum time on a project before Submit unlocks (anti–speed-run). */
export const MIN_EXPLORE_MS = 15 * 60 * 1000;
export const MIN_EXPLORE_MINUTES = 15;

/** Soft nudge then hard cap on chat messages per project. */
export const CHAT_SOFT_WARN_AT = 40;
export const MAX_CHAT_MESSAGES = 50;

export type PictureSlot = {
  description: string;
  dataUrl: string;
  style: ImageStyle;
  /** How many image API calls have been made for this slot. */
  generations: number;
};

export type ProjectWork = {
  project: Project;
  messages: ChatMessage[];
  notices: Notice[];
  notes: Note[];
  /** Editable rich-text canvas for What I learned / the project write-up (HTML). */
  learnedHtml: string;
  pictures: PictureSlot[];
  /** When this project session began (local clock). */
  startedAt: number;
  /** Set when the child submits; project becomes read-only. */
  submittedAt: number | null;
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
    style: "cartoon" as const,
    generations: 0,
  }));
}

export function pictureTriesLeft(picture: PictureSlot): number {
  return Math.max(0, MAX_IMAGE_GENERATIONS - (picture.generations || 0));
}

export function emptyWork(project: Project): ProjectWork {
  return {
    project,
    messages: [],
    notices: [],
    notes: [],
    learnedHtml: "",
    pictures: emptyPictures(project.imageCount),
    startedAt: Date.now(),
    submittedAt: null,
  };
}

export function exploreElapsedMs(work: ProjectWork, now = Date.now()): number {
  const start = typeof work.startedAt === "number" && work.startedAt > 0 ? work.startedAt : now;
  return Math.max(0, now - start);
}

export function exploreMinutesDone(work: ProjectWork, now = Date.now()): number {
  return Math.min(MIN_EXPLORE_MINUTES, Math.floor(exploreElapsedMs(work, now) / 60_000));
}

export function isExploreReady(work: ProjectWork, now = Date.now()): boolean {
  return exploreElapsedMs(work, now) >= MIN_EXPLORE_MS;
}

export function canSubmitProject(work: ProjectWork, now = Date.now()): boolean {
  return isProjectComplete(work) && isExploreReady(work, now);
}

export function isChatAtLimit(work: ProjectWork): boolean {
  return work.messages.length >= MAX_CHAT_MESSAGES;
}

export function isChatSoftWarn(work: ProjectWork): boolean {
  const count = work.messages.length;
  return count >= CHAT_SOFT_WARN_AT && count < MAX_CHAT_MESSAGES;
}

export function isProjectSubmitted(work: ProjectWork): boolean {
  return typeof work.submittedAt === "number" && work.submittedAt > 0;
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
  const briefs = normalizeBriefs(record.briefs, title, id);
  const starter =
    STARTERS.find((item) => item.id === id) ||
    STARTERS.find((item) => item.title.toLowerCase() === title.toLowerCase());
  return {
    id,
    title,
    task: starter?.task ?? task,
    imageCount: 2,
    prompts: prompts.length > 0 ? prompts : starter?.prompts ?? [],
    hints: hints.length > 0 ? hints.slice(0, 2) : (starter?.hints ?? []).slice(0, 2),
    briefs,
    source,
    notice,
  };
}

function fallbackBriefs(title: string, id: string): BriefItem[] {
  const starter =
    STARTERS.find((item) => item.id === id) ||
    STARTERS.find((item) => item.title.toLowerCase() === title.toLowerCase());
  if (starter) return starter.briefs;
  return defaultBriefsForProject({ title, imageCount: 2 });
}

function normalizeBriefs(value: unknown, title: string, id: string): BriefItem[] {
  const kinds = new Set<BriefKind>(["ask", "write", "pictures"]);
  if (!Array.isArray(value)) {
    return fallbackBriefs(title, id);
  }
  const items = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const kind = record.kind;
    if (typeof kind !== "string" || !kinds.has(kind as BriefKind)) return [];
    const label = asString(record.label, 160);
    if (!label) return [];
    const briefId = asString(record.id, 80) || `brief-${index}`;
    const clues = Array.isArray(record.clues)
      ? record.clues
          .filter((clue): clue is string => typeof clue === "string")
          .map((clue) => clue.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 12)
      : [];
    const requireAllClues = record.requireAllClues === true ? true : undefined;
    return [
      {
        id: briefId,
        kind: kind as BriefKind,
        label,
        clues,
        requireAllClues,
      } satisfies BriefItem,
    ];
  });
  if (items.length === 0) {
    return fallbackBriefs(title, id);
  }
  return items.slice(0, 8);
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
      }).slice(-MAX_CHAT_MESSAGES)
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
  const pictures = emptyPictures(2);
  if (Array.isArray(record.pictures)) {
    record.pictures.slice(0, 2).forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const picture = item as Record<string, unknown>;
      const generations =
        typeof picture.generations === "number" && picture.generations > 0
          ? Math.min(MAX_IMAGE_GENERATIONS, Math.floor(picture.generations))
          : 0;
      pictures[index] = {
        description: asString(picture.description, 300),
        dataUrl: typeof picture.dataUrl === "string" && picture.dataUrl.startsWith("data:image/")
          ? picture.dataUrl
          : "",
        style: picture.style === "photo" ? "photo" : "cartoon",
        generations,
      };
    });
  }
  const legacyReport = asString(record.report, 2500);
  const startedAt =
    typeof record.startedAt === "number" && record.startedAt > 0
      ? record.startedAt
      : Date.now();
  const submittedAt =
    typeof record.submittedAt === "number" && record.submittedAt > 0
      ? record.submittedAt
      : null;
  let learnedHtml =
    typeof record.learnedHtml === "string"
      ? sanitizeLearnedHtml(record.learnedHtml).slice(0, 40_000)
      : "";
  if (!learnedHtml && notes.length > 0) {
    learnedHtml = notes
      .map((note) => {
        const safe = note.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<p>${safe.replace(/\n/g, "<br>")}</p>`;
      })
      .join("");
  }
  if (legacyReport) {
    const reportHtml = `<p>${legacyReport
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")}</p>`;
    learnedHtml = learnedHtml ? `${learnedHtml}${reportHtml}` : reportHtml;
  }
  return {
    project,
    messages,
    notices,
    notes,
    learnedHtml,
    pictures,
    startedAt,
    submittedAt,
  };
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
    const current = active ?? first;
    if (!current) return freshWorkspace();
    // One project only. Submitted work is finished — start fresh.
    if (isProjectSubmitted(current)) return freshWorkspace();
    return {
      activeId: current.project.id,
      projects: { [current.project.id]: current },
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
          { ...work, pictures: emptyPictures(2) },
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
  return allBriefsDone(work);
}

export type ProgressSteps = {
  asked: boolean;
  noted: boolean;
  picturesDone: number;
  picturesTotal: number;
  picturesReady: boolean;
  complete: boolean;
  exploreReady: boolean;
  exploreMinutes: number;
  canSubmit: boolean;
  briefs: ReturnType<typeof briefStatuses>;
  summary: string;
};

export function progressSteps(work: ProjectWork, now = Date.now()): ProgressSteps {
  const picturesDone = work.pictures.filter((picture) => picture.dataUrl).length;
  const picturesTotal = work.project.imageCount;
  const picturesReady = picturesDone >= picturesTotal;
  const asked = work.messages.some((message) => message.role === "user");
  const noted = isLearnedReady(work.learnedHtml);
  const briefs = briefStatuses(work);
  const complete = isProjectComplete(work);
  const exploreReady = isExploreReady(work, now);
  const exploreMinutes = exploreMinutesDone(work, now);
  const canSubmit = complete && exploreReady;

  let summary: string;
  if (canSubmit) {
    summary = "You finished the brief. Ready to submit.";
  } else if (complete && !exploreReady) {
    summary = `Nice work — keep exploring a bit longer. You can submit after ${MIN_EXPLORE_MINUTES} minutes.`;
  } else {
    const missing = briefs.filter((status) => !status.done).map((status) => status.item.label);
    if (missing.length === 0) {
      summary = "Almost there — finish the last steps on the list.";
    } else if (missing.length === 1) {
      summary = `Still to do: ${missing[0]}.`;
    } else {
      summary = `Still to do: ${missing.length} steps on your brief.`;
    }
  }

  return {
    asked,
    noted,
    picturesDone,
    picturesTotal,
    picturesReady,
    complete,
    exploreReady,
    exploreMinutes,
    canSubmit,
    briefs,
    summary,
  };
}

export function remainingText(work: ProjectWork): string {
  return progressSteps(work).summary;
}
