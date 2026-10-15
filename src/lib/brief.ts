import { plainTextFromHtml, isLearnedReady } from "@/lib/learned-html";
import type { BriefItem, Project } from "@/lib/projects";

/** Minimal work shape for brief checks (avoids a storage ↔ brief import cycle). */
export type BriefWork = {
  project: Project;
  messages: { role: "user" | "assistant"; content: string; source?: string }[];
  learnedHtml: string;
  pictures: { dataUrl: string }[];
};

export type BriefStatus = {
  item: BriefItem;
  done: boolean;
};

function haystack(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function clueMatches(hay: string, clue: string): boolean {
  return clue
    .toLowerCase()
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => hay.includes(part));
}

/** True if the text mentions at least one clue word/phrase. */
export function textHasClue(text: string, clues: string[]): boolean {
  if (clues.length === 0) return text.trim().length > 0;
  const hay = haystack(text);
  return clues.some((clue) => clueMatches(hay, clue));
}

export function textHasClues(
  text: string,
  clues: string[],
  requireAll = false,
): boolean {
  if (clues.length === 0) return text.trim().length > 0;
  const hay = haystack(text);
  const hits = clues.map((clue) => clueMatches(hay, clue));
  return requireAll ? hits.every(Boolean) : hits.some(Boolean);
}

function learnedText(work: BriefWork): string {
  return plainTextFromHtml(work.learnedHtml);
}

function hasResearchChat(work: BriefWork): boolean {
  const asked = work.messages.some((message) => message.role === "user");
  const answered = work.messages.some(
    (message) => message.role === "assistant" && message.source !== "guardrail",
  );
  return asked && answered;
}

export function isBriefItemDone(work: BriefWork, item: BriefItem): boolean {
  if (item.kind === "pictures") {
    const done = work.pictures.filter((picture) => picture.dataUrl).length;
    return done >= work.project.imageCount;
  }
  const learned = learnedText(work);
  const notesMatch = textHasClues(learned, item.clues, item.requireAllClues === true);
  // Research asks: chatting the question is not enough — the answer must land in What I learned.
  if (item.kind === "ask") {
    return hasResearchChat(work) && isLearnedReady(work.learnedHtml) && notesMatch;
  }
  return isLearnedReady(work.learnedHtml) && notesMatch;
}

export function briefStatuses(work: BriefWork): BriefStatus[] {
  const items = work.project.briefs ?? [];
  return items.map((item) => ({
    item,
    done: isBriefItemDone(work, item),
  }));
}

export function allBriefsDone(work: BriefWork): boolean {
  const items = work.project.briefs ?? [];
  if (items.length === 0) {
    const picturesReady =
      work.pictures.filter((picture) => picture.dataUrl).length >= work.project.imageCount;
    return isLearnedReady(work.learnedHtml) && picturesReady && work.messages.length > 0;
  }
  return items.every((item) => isBriefItemDone(work, item));
}

/** Kid-facing Scout lines for checklist gaps (injected into chat). */
export function coachLinesForGaps(work: BriefWork): string[] {
  return briefStatuses(work)
    .filter((status) => !status.done)
    .map((status) => {
      const { item } = status;
      if (item.kind === "ask") {
        return `Before you submit: ${item.label}. Ask me for help, then put the answer in What I learned (Save this or type it yourself).`;
      }
      if (item.kind === "write") {
        return `Before you submit: ${item.label}. Put it in What I learned in your own words (you can Save this from my replies, then edit).`;
      }
      return `Before you submit: ${item.label}. Describe each picture and press Make this picture.`;
    });
}

export function defaultBriefsForProject(
  project: Pick<Project, "title" | "imageCount">,
): BriefItem[] {
  const clues = project.title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 2);
  return [
    {
      id: "ask-1",
      kind: "ask",
      label: `Research one important fact about ${project.title}, then add it to What I learned`,
      clues: clues.length > 0 ? clues : ["learn"],
    },
    {
      id: "ask-2",
      kind: "ask",
      label: `Compare two ideas about ${project.title}, then add your answer to What I learned`,
      clues: clues.length > 0 ? clues : ["learn"],
    },
    {
      id: "ask-3",
      kind: "ask",
      label: `Find a number or measurement about ${project.title}, then add it to What I learned`,
      clues: clues.length > 0 ? clues : ["learn"],
    },
    {
      id: "write-1",
      kind: "write",
      label: `Write in your own words what you learned about ${project.title}`,
      clues: clues.length > 0 ? clues : ["learn"],
    },
    {
      id: "pictures",
      kind: "pictures",
      label: `Make ${project.imageCount} pictures that show what you learned`,
      clues: [],
    },
  ];
}
