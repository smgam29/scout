import "server-only";

import { SCOUT_SYSTEM_PROMPT } from "./system-prompt";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * The locked prompt is always message 0, copied verbatim.
 * Client-supplied system text is never accepted here.
 */
export function withLockedSystemPrompt(
  conversation: ConversationMessage[],
  addendum?: string,
): ModelMessage[] {
  const messages: ModelMessage[] = [
    { role: "system", content: SCOUT_SYSTEM_PROMPT },
  ];
  if (addendum) {
    messages.push({ role: "system", content: addendum });
  }
  for (const message of conversation) {
    if (message.role === "user" || message.role === "assistant") {
      messages.push({ role: message.role, content: message.content });
    }
  }
  return messages;
}

export function projectAddendum(project: {
  title: string;
  task: string;
  imageCount: number;
}): string {
  return [
    `Assigned project title: ${project.title}`,
    `Assigned task: ${project.task}`,
    `He needs ${project.imageCount} pictures and short notes about what he learned.`,
    "Help only with this project.",
    "Use short sentences and concrete words a 9-year-old can read.",
    "Sound like a warm teacher. Do not talk down to him.",
    "When he asks for a note, give him two or three short sentences he can save.",
  ].join("\n");
}

export function newProjectInstruction(currentTitle: string): string {
  return [
    "Create one new school research project for a 9-year-old.",
    "It must be safe, concrete, and doable in one sitting.",
    "He will research a real topic and create 3 pictures that show what he learned.",
    `Do not repeat this topic: ${currentTitle}.`,
    "Good topics: animals, space, weather, plants, maps, simple machines, or history told simply.",
    "No scary, violent, or adult topics.",
    "Reply with JSON only, no markdown:",
    '{"title":"","task":"","prompts":["","","",""]}',
    "title is 2 to 5 words.",
    "task is one or two short sentences at a 3rd grade reading level, and it must ask for 3 images.",
    "prompts are 4 short questions he can ask about the project.",
  ].join("\n");
}
