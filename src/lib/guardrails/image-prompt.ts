import "server-only";

import { checkText } from "./checks";

export type ImageStyle = "cartoon" | "photo";

export function childSafeImagePrompt(
  description: string,
  projectTitle: string,
  style: ImageStyle = "cartoon",
): string {
  const clean = description.replace(/\s+/g, " ").trim();
  const title = projectTitle.replace(/\s+/g, " ").trim();
  const look =
    style === "photo"
      ? [
          "A clear, realistic photograph suitable for a 9-year-old school project.",
          "Natural lighting, friendly and true to life, accurate enough to learn from.",
        ]
      : [
          "A clear, colorful picture-book illustration for a 9-year-old.",
          "Friendly cartoon style, bright, accurate enough to learn from.",
        ];
  return [
    ...look,
    "No letters, no words, and no captions in the picture.",
    "No scary, violent, rude, or adult content.",
    `School project: ${title}.`,
    `Show this: ${clean}`,
  ].join(" ");
}

export function prepareImagePrompt(
  description: string,
  projectTitle: string,
  style: ImageStyle = "cartoon",
): { ok: true; prompt: string } | { ok: false; message: string } {
  const subject = checkText(description, "image");
  if (!subject.allowed) return { ok: false, message: subject.redirect };
  const title = checkText(projectTitle, "image");
  if (!title.allowed) return { ok: false, message: title.redirect };
  const prompt = childSafeImagePrompt(description, projectTitle, style);
  const rewritten = checkText(prompt, "image");
  if (!rewritten.allowed) return { ok: false, message: rewritten.redirect };
  return { ok: true, prompt };
}
