import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown } from "./markdown";
import type { ReactElement, ReactNode } from "react";

function staticMarkup(node: ReactNode): string {
  return renderToStaticMarkup(<>{node}</>);
}

function firstTag(node: ReactNode, type: string): ReactElement | undefined {
  const stack: unknown[] = [];
  const pushAll = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(pushAll);
    else stack.push(value);
  };
  pushAll(node);
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    const element = current as ReactElement;
    if (element.type === type) return element;
    if (element.props && typeof element.props === "object" && "children" in element.props) {
      pushAll((element.props as { children?: unknown }).children);
    }
  }
  return undefined;
}

describe("renderMarkdown (XSS safety)", () => {
  it("renders supported inline syntax", () => {
    const nodes = renderMarkdown("Added **dark mode**, fixed `crash`, see [docs](https://example.com)");
    const html = staticMarkup(nodes);
    expect(html).toContain("<strong>dark mode</strong>");
    expect(html).toContain("<code>crash</code>");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it("never produces script elements or javascript: links", () => {
    const hostile = 'Hello <script>alert(1)</script> [x](javascript:alert(1)) ![y](data:text/html;base64,AAAA)';
    const nodes = renderMarkdown(hostile);
    const html = staticMarkup(nodes);
    expect(html).not.toContain("<script");
    expect(html.toLowerCase()).not.toContain("javascript:");
    expect(html.toLowerCase()).not.toContain("data:text/html");
  });

  it("renders lists, tasks, headings and code blocks", () => {
    const source = "## Fixes\n\n- [x] done item\n- [ ] pending item\n- plain item\n\n```js\nconsole.log(1);\n```";
    const nodes = renderMarkdown(source);
    const html = staticMarkup(nodes);
    expect(html).toContain("<h4>");
    expect(html).toContain("md-task");
    expect(html).toContain("<pre><code>console.log(1);");
  });

  it("demotes release-note headings below the page h1/h2", () => {
    const nodes = renderMarkdown("# Top level");
    const html = staticMarkup(nodes);
    expect(html).not.toContain("<h1>");
    expect(html).not.toContain("<h2>");
    expect(html).toContain("<h3>");
  });

  it("keeps link targets safe and external", () => {
    const nodes = renderMarkdown("[click](https://github.com/yalaahamdy)");
    const link = firstTag(nodes[0] as ReactElement, "a");
    expect(link).toBeDefined();
    expect((link?.props as { href: string }).href).toBe("https://github.com/yalaahamdy");
  });

  it("renders numbered/ordered lists without hanging or crashing", () => {
    const source = "1. First feature\n2. Second feature\n3. Third feature";
    const nodes = renderMarkdown(source);
    const html = staticMarkup(nodes);
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>First feature</li>");
    expect(html).toContain("<li>Second feature</li>");
  });

  it("handles malformed list and paragraph lines safely", () => {
    const source = "1. Lone item\nJust a paragraph\n2. Another item\n- Bullet";
    const nodes = renderMarkdown(source);
    const html = staticMarkup(nodes);
    expect(html).toContain("<ol>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<p>Just a paragraph</p>");
  });
});
