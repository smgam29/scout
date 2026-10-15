/** Enough plain text for “I wrote something” in What I learned. */
export const LEARNED_READY_CHARS = 20;

/** Ceiling for learned HTML including a few compressed data-URL images. */
export const LEARNED_HTML_MAX_CHARS = 1_500_000;

/** Hard cap on pasted images in the learned canvas. */
export const LEARNED_IMAGE_MAX_COUNT = 6;

export const LEARNED_IMAGE_DEFAULT_WIDTH_PERCENT = 50;
export const LEARNED_IMAGE_MIN_WIDTH_PERCENT = 15;
export const LEARNED_IMAGE_MAX_WIDTH_PERCENT = 100;
export const LEARNED_IMAGE_MAX_EDGE_PX = 640;

const ALLOWED_IMAGE_SRC =
  /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isLearnedReady(html: string): boolean {
  return plainTextFromHtml(html).length >= LEARNED_READY_CHARS;
}

export function isAllowedLearnedImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (trimmed.length > LEARNED_HTML_MAX_CHARS) return false;
  return ALLOWED_IMAGE_SRC.test(trimmed.replace(/\s+/g, ""));
}

export function countLearnedImages(html: string): number {
  const matches = html.match(/<img\b/gi);
  return matches?.length ?? 0;
}

export function clampLearnedImageWidthPercent(value: number): number {
  if (!Number.isFinite(value)) return LEARNED_IMAGE_DEFAULT_WIDTH_PERCENT;
  return Math.min(
    LEARNED_IMAGE_MAX_WIDTH_PERCENT,
    Math.max(LEARNED_IMAGE_MIN_WIDTH_PERCENT, Math.round(value)),
  );
}

export function learnedImageStyle(widthPercent: number): string {
  const width = clampLearnedImageWidthPercent(widthPercent);
  return `width: ${width}%; height: auto; max-width: 100%;`;
}

function widthPercentFromImg(el: HTMLElement): number {
  const styleWidth = el.style.width?.trim() ?? "";
  const percentMatch = styleWidth.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) return clampLearnedImageWidthPercent(Number(percentMatch[1]));

  const widthAttr = el.getAttribute("width");
  if (widthAttr && /^\d+(?:\.\d+)?%$/.test(widthAttr.trim())) {
    return clampLearnedImageWidthPercent(Number(widthAttr.trim().replace("%", "")));
  }
  if (widthAttr && /^\d+$/.test(widthAttr.trim()) && el.parentElement) {
    const parentWidth = el.parentElement.clientWidth || 1;
    const px = Number(widthAttr.trim());
    return clampLearnedImageWidthPercent((px / parentWidth) * 100);
  }
  return LEARNED_IMAGE_DEFAULT_WIDTH_PERCENT;
}

function isPreambleBlock(block: string): boolean {
  const line = block.replace(/\s+/g, " ").trim();
  if (!line || line.length > 140) return false;
  return (
    /^(that'?s|what) a (great|good|nice|awesome|cool|fun) question\b/i.test(line) ||
    /^(great|good|nice|awesome) question\b/i.test(line) ||
    /^(sure|absolutely|of course|you bet)[!.,]?\s/i.test(line) ||
    /^let'?s (look|find|learn|talk|explore|see)\b/i.test(line) ||
    /^i('m| am) (happy|glad|excited) to\b/i.test(line) ||
    /\bfor your .{0,50} project[!?.]?\s*$/i.test(line) ||
    (/question/i.test(line) && /project/i.test(line) && line.length < 100)
  );
}

/**
 * Drop Scout’s praise/preamble so “Save this” keeps the fact paragraphs.
 * Example: drop “That’s a great question for your project!” and keep the answer.
 */
export function stripReplyPreamble(text: string): string {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  let blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  // Soft line breaks: first line praise, rest is the fact.
  if (blocks.length === 1) {
    const lines = trimmed.split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1 && isPreambleBlock(lines[0])) {
      blocks = [lines[0], lines.slice(1).join("\n")];
    }
  }
  if (blocks.length <= 1) return trimmed;

  let start = 0;
  while (start < blocks.length - 1 && isPreambleBlock(blocks[start])) {
    start += 1;
  }
  return blocks.slice(start).join("\n\n");
}

/** Turn Scout reply text into safe HTML paragraphs (light markdown). */
export function replyToLearnedHtml(text: string): string {
  const fact = stripReplyPreamble(text);
  const escaped = escapeHtml(fact.trim());
  if (!escaped) return "";
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return withItalic
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function appendLearnedHtml(current: string, chunk: string): string {
  const next = chunk.trim();
  if (!next) return current;
  if (!current.trim()) return next;
  return `${current}${next}`;
}

function sanitizeWithoutDom(html: string): string {
  let next = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  next = next.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = (srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? "").trim();
    if (!isAllowedLearnedImageSrc(src)) return "";
    const styleMatch = tag.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const styleText = styleMatch?.[1] ?? styleMatch?.[2] ?? "";
    const styleWidth = styleText.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)%/i);
    const attrWidth = tag.match(/\bwidth\s*=\s*(?:"|\')?(\d+(?:\.\d+)?)%/i);
    const width = clampLearnedImageWidthPercent(
      Number(styleWidth?.[1] ?? attrWidth?.[1] ?? LEARNED_IMAGE_DEFAULT_WIDTH_PERCENT),
    );
    const safeSrc = src.replace(/\s+/g, "");
    return `<img src="${safeSrc}" alt="" style="${learnedImageStyle(width)}">`;
  });
  // Drop excess images beyond the cap (keep first N).
  let seen = 0;
  next = next.replace(/<img\b[^>]*>/gi, (tag) => {
    seen += 1;
    return seen <= LEARNED_IMAGE_MAX_COUNT ? tag : "";
  });
  return next.slice(0, LEARNED_HTML_MAX_CHARS);
}

/** Allow only simple formatting tags (+ safe pasted images) for the kid canvas. */
export function sanitizeLearnedHtml(html: string): string {
  if (typeof window === "undefined") {
    return sanitizeWithoutDom(html);
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "SPAN",
    "DIV",
    "UL",
    "OL",
    "LI",
    "IMG",
  ]);
  let imageCount = 0;

  function clean(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }
    const el = node as HTMLElement;
    if (!allowed.has(el.tagName)) {
      const parent = el.parentNode;
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      parent?.removeChild(el);
      return;
    }

    if (el.tagName === "IMG") {
      const src = (el.getAttribute("src") || "").trim();
      if (!isAllowedLearnedImageSrc(src) || imageCount >= LEARNED_IMAGE_MAX_COUNT) {
        el.parentNode?.removeChild(el);
        return;
      }
      imageCount += 1;
      const width = widthPercentFromImg(el);
      const safeSrc = src.replace(/\s+/g, "");
      [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
      el.setAttribute("src", safeSrc);
      el.setAttribute("alt", "");
      el.setAttribute("style", learnedImageStyle(width));
      return;
    }

    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (el.tagName === "SPAN" && name === "style") {
        const color = el.style.color;
        el.removeAttribute("style");
        if (color) el.style.color = color;
        return;
      }
      el.removeAttribute(attr.name);
    });
    [...el.childNodes].forEach(clean);
  }

  [...template.content.childNodes].forEach(clean);
  return template.innerHTML.slice(0, LEARNED_HTML_MAX_CHARS);
}

/** Downscale a pasted image blob to a JPEG data URL for localStorage. */
export async function compressLearnedImage(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const maxEdge = LEARNED_IMAGE_MAX_EDGE_PX;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    if (!isAllowedLearnedImageSrc(dataUrl)) throw new Error("encode");
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
