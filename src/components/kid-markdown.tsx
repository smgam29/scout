"use client";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <p className="font-semibold">{children}</p>,
  h2: ({ children }) => <p className="font-semibold">{children}</p>,
  h3: ({ children }) => <p className="font-semibold">{children}</p>,
  a: ({ children }) => <span>{children}</span>,
  code: ({ children }) => <span className="font-medium">{children}</span>,
  pre: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  blockquote: ({ children }) => (
    <div className="border-l-2 border-current/20 pl-3 opacity-90">{children}</div>
  ),
  hr: () => null,
  img: () => null,
};

export function KidMarkdown({ text }: { text: string }) {
  return (
    <div className="kid-markdown space-y-2 text-base leading-relaxed">
      <Markdown components={components} skipHtml>
        {text}
      </Markdown>
    </div>
  );
}
