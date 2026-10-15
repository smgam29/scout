/** Enough plain text for “I wrote something” in What I learned. */
export const LEARNED_READY_CHARS = 20;

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

/** Allow only simple formatting tags for the kid canvas. */
export function sanitizeLearnedHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").slice(0, 40_000);
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "SPAN", "DIV", "UL", "OL", "LI"]);

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
  return template.innerHTML.slice(0, 40_000);
}
