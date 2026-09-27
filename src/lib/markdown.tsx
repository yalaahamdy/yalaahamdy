import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal, XSS-safe GitHub-flavored markdown renderer.
 *
 * Everything is built with React elements — `dangerouslySetInnerHTML` is never
 * used, so untrusted release notes can never inject markup. Supported syntax
 * covers what release notes actually use: headings, lists (with task items),
 * fenced code, blockquotes, tables, rules, bold/italic/strike/code, links and
 * images (rendered as links).
 */

const SAFE_URL = /^(https?:\/\/|\/|#|mailto:)/i;

interface Token {
  text: string;
  url?: string;
  kind: "text" | "code" | "bold" | "italic" | "strike" | "link" | "image";
}

const INLINE_PATTERN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(~~[^~\n]+~~)|(!?\[[^\]\n]*\]\([^)\s]+\))/g;

function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ text: text.slice(lastIndex, index), kind: "text" });
    const raw = match[0];
    if (raw.startsWith("`")) {
      tokens.push({ text: raw.slice(1, -1), kind: "code" });
    } else if (raw.startsWith("**")) {
      tokens.push({ text: raw.slice(2, -2), kind: "bold" });
    } else if (raw.startsWith("~~")) {
      tokens.push({ text: raw.slice(2, -2), kind: "strike" });
    } else if (raw.startsWith("*")) {
      tokens.push({ text: raw.slice(1, -1), kind: "italic" });
    } else {
      const isImage = raw.startsWith("!");
      const label = raw.slice(isImage ? 2 : 1, raw.indexOf("]"));
      const url = raw.slice(raw.indexOf("](") + 2, -1);
      if (SAFE_URL.test(url)) {
        tokens.push({ text: label || url, url, kind: isImage ? "image" : "link" });
      } else {
        // Unsafe scheme (javascript:, data:, …) — degrade to plain text.
        tokens.push({ text: label || url, kind: "text" });
      }
    }
    lastIndex = index + raw.length;
  }
  if (lastIndex < text.length) tokens.push({ text: text.slice(lastIndex), kind: "text" });
  return tokens;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return tokenizeInline(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.kind) {
      case "code":
        return <code key={key}>{token.text}</code>;
      case "bold":
        return <strong key={key}>{token.text}</strong>;
      case "italic":
        return <em key={key}>{token.text}</em>;
      case "strike":
        return <del key={key}>{token.text}</del>;
      case "link":
        return (
          <a key={key} href={token.url} target="_blank" rel="noopener noreferrer nofollow">
            {token.text}
          </a>
        );
      case "image":
        return (
          <a key={key} href={token.url} target="_blank" rel="noopener noreferrer nofollow">
            [image: {token.text}]
          </a>
        );
      default:
        return <Fragment key={key}>{token.text}</Fragment>;
    }
  });
}

function isListItem(line: string): { indent: number; content: string; task: "done" | "todo" | null } | null {
  const match = /^(\s*)[-*+]\s+(.*)$/.exec(line);
  if (!match) return null;
  const [, indent, rest] = match as unknown as [string, string, string];
  const taskMatch = /^\[( |x|X)\]\s+(.*)$/.exec(rest);
  if (taskMatch) {
    const [, mark, content] = taskMatch as unknown as [string, string, string];
    return { indent: indent.length, content, task: mark.toLowerCase() === "x" ? "done" : "todo" };
  }
  return { indent: indent.length, content: rest, task: null };
}

interface TableRows {
  header: string[];
  rows: string[][];
}

function parseTable(lines: string[]): TableRows | null {
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  if (lines.length < 2) return null;
  const header = cells(lines[0] ?? "");
  const separator = lines[1] ?? "";
  if (!header.length || !/^\s*\|?[\s:-]*-[\s|:-]*$/.test(separator)) return null;
  const rows = lines.slice(2).map((line) => cells(line));
  return { header, rows };
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;
  let key = 0;
  const nextKey = () => `md-${(key += 1)}`;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test((lines[index] ?? "").trim())) {
        buffer.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      nodes.push(
        <pre key={nextKey()}>
          <code>{buffer.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Heading (demoted by two levels so release notes never outrank page headings)
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const [, hashes, content] = heading as unknown as [string, string, string];
      const level = Math.min(6, hashes.length + 2);
      const Tag = `h${level}` as "h3" | "h4" | "h5" | "h6";
      nodes.push(<Tag key={nextKey()}>{renderInline(content, nextKey())}</Tag>);
      index += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      nodes.push(<hr key={nextKey()} />);
      index += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const buffer: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? "")) {
        buffer.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
        index += 1;
      }
      nodes.push(<blockquote key={nextKey()}>{renderMarkdown(buffer.join("\n"))}</blockquote>);
      continue;
    }

    // Table
    if (/^\s*\|/.test(line)) {
      const buffer: string[] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index] ?? "")) {
        buffer.push(lines[index] ?? "");
        index += 1;
      }
      const table = parseTable(buffer);
      if (table) {
        nodes.push(
          <div key={nextKey()} className="md-table-wrap">
            <table>
              <thead>
                <tr>
                  {table.header.map((cell, i) => (
                    <th key={i}>{renderInline(cell, `${nextKey()}-h-${i}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>{renderInline(cell, `${nextKey()}-${r}-${c}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      } else {
        nodes.push(<p key={nextKey()}>{renderInline(buffer.join(" "), nextKey())}</p>);
      }
      continue;
    }

    // Lists (flat with limited nesting by indentation)
    const listItem = isListItem(line);
    if (listItem) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: { content: string; task: "done" | "todo" | null }[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? "";
        const parsed = isListItem(current);
        if (!parsed || ordered !== /^\s*\d+[.)]\s+/.test(current)) break;
        items.push({ content: parsed.content, task: parsed.task });
        index += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      nodes.push(
        <ListTag key={nextKey()}>
          {items.map((item, i) => (
            <li key={i} className={item.task ? "md-task" : undefined} data-checked={item.task === "done" ? "true" : item.task === "todo" ? "false" : undefined}>
              {item.task !== null && <span className="md-task-box" aria-hidden="true" />}
              {renderInline(item.content, `${nextKey()}-${i}`)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Paragraph (soft line breaks preserved, as GitHub renders release notes)
    const buffer: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim() && !/^(#{1,6})\s|^\s*>|^\s*[-*+]\s|^\s*\d+[.)]\s|^\s*```|^\s*\||^\s*([-*_])\s*(\1\s*){2,}$/.test(lines[index] ?? "")) {
      buffer.push((lines[index] ?? "").trim());
      index += 1;
    }
    nodes.push(
      <p key={nextKey()}>
        {buffer.map((part, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(part, `${nextKey()}-${i}`)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return nodes;
}

export function MarkdownBody({ source, className }: { source: string; className?: string }) {
  return <div className={cn("md-body", className)}>{renderMarkdown(source)}</div>;
}
