import type { ReactNode } from "react";

const KEYWORDS = new Set([
  "import",
  "export",
  "function",
  "return",
  "const",
  "let",
  "if",
  "type",
  "from",
  "async",
  "await",
  "new",
  "null",
  "as",
]);

export function highlightCode(text: string) {
  const nodes: ReactNode[] = [];
  const commentAt = text.indexOf("//");
  const code = commentAt >= 0 ? text.slice(0, commentAt) : text;
  const comment = commentAt >= 0 ? text.slice(commentAt) : "";
  let index = 0;
  const pattern =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    if (match.index > index) {
      nodes.push(code.slice(index, match.index));
    }
    const [raw, str, num, word] = match;
    if (str) {
      nodes.push(
        <span key={match.index} className="text-[#ce9178]">
          {str}
        </span>,
      );
    } else if (num) {
      nodes.push(
        <span key={match.index} className="text-[#b5cea8]">
          {num}
        </span>,
      );
    } else if (word && KEYWORDS.has(word)) {
      nodes.push(
        <span key={match.index} className="text-[#569cd6]">
          {word}
        </span>,
      );
    } else if (word && /^[A-Z]/.test(word)) {
      nodes.push(
        <span key={match.index} className="text-[#4ec9b0]">
          {word}
        </span>,
      );
    } else if (word) {
      nodes.push(
        <span key={match.index} className="text-[#9cdcfe]">
          {word}
        </span>,
      );
    } else {
      nodes.push(raw);
    }
    index = match.index + raw.length;
  }
  if (index < code.length) nodes.push(code.slice(index));
  if (comment) {
    nodes.push(
      <span key="comment" className="text-[#6a9955]">
        {comment}
      </span>,
    );
  }
  return nodes;
}
