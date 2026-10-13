import "server-only";

import { checkText } from "./checks";

export function childSafeImagePrompt(
  description: string,
  projectTitle: string,
): string {
  const clean = description.replace(/\s+/g, " ").trim();
  const title = projectTitle.replace(/\s+/g, " ").trim();
  return [
    "A clear, colorful picture-book illustration for a 9-year-old.",
    "Friendly and bright, accurate enough to learn from.",
    "No letters, no words, and no captions in the picture.",
    "No scary, violent, rude, or adult content.",
    `School project: ${title}.`,
    `Show this: ${clean}`,
  ].join(" ");
}

export function prepareImagePrompt(
  description: string,
  projectTitle: string,
): { ok: true; prompt: string } | { ok: false; message: string } {
  const subject = checkText(description, "image");
  if (!subject.allowed) return { ok: false, message: subject.redirect };
  const title = checkText(projectTitle, "image");
  if (!title.allowed) return { ok: false, message: title.redirect };
  const prompt = childSafeImagePrompt(description, projectTitle);
  const rewritten = checkText(prompt, "image");
  if (!rewritten.allowed) return { ok: false, message: rewritten.redirect };
  return { ok: true, prompt };
}
