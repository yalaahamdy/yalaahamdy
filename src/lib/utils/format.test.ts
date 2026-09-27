import { describe, expect, it } from "vitest";
import { formatBytes, formatCount, formatDate, formatRelativeTime, markdownExcerpt } from "./format";

describe("formatBytes", () => {
  it("formats sizes across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(36.5 * 1024 * 1024)).toBe("36.5 MB");
    expect(formatBytes(177 * 1024 * 1024)).toBe("177 MB");
    expect(formatBytes(2 * 1024 ** 3)).toBe("2.00 GB");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("formatCount", () => {
  it("compacts large numbers", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1234)).toBe("1.2k");
    expect(formatCount(56_000)).toBe("56k");
    expect(formatCount(1_250_000)).toBe("1.3M");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-27T12:00:00Z");

  it("describes recent timestamps", () => {
    expect(formatRelativeTime("2026-09-27T11:59:40Z", "en", now)).toBe("just now");
    expect(formatRelativeTime("2026-09-27T11:00:00Z", "en", now)).toBe("1 hour ago");
    expect(formatRelativeTime("2026-09-25T12:00:00Z", "en", now)).toBe("2 days ago");
  });

  it("renders Arabic relative time with Latin digits", () => {
    expect(formatRelativeTime("2026-09-27T11:59:40Z", "ar", now)).toBe("الآن");
    expect(formatRelativeTime("2026-09-27T11:00:00Z", "ar", now)).toBe("قبل ساعة واحدة");
    expect(formatRelativeTime("2026-09-25T12:00:00Z", "ar", now)).toBe("أول أمس");
  });

  it("falls back to an absolute date after a month", () => {
    expect(formatRelativeTime("2026-08-01T00:00:00Z", "en", now)).toBe("Aug 1, 2026");
  });

  it("handles missing or invalid input", () => {
    expect(formatRelativeTime(null)).toBe("—");
    expect(formatRelativeTime("not-a-date")).toBe("—");
  });
});

describe("formatDate", () => {
  it("renders a short absolute date", () => {
    expect(formatDate("2026-09-20T13:16:07Z", "en")).toMatch(/Sep 20, 2026|Sep 19, 2026/);
  });

  it("renders an Arabic date with the month name and Latin digits", () => {
    const arabic = formatDate("2026-09-20T13:16:07Z", "ar");
    expect(arabic).toMatch(/2026/);
    expect(arabic).toMatch(/[\u0600-\u06FF]/);
    expect(arabic).not.toMatch(/[\u0660-\u0669]/);
  });
});

describe("markdownExcerpt", () => {
  it("strips markdown noise into plain text", () => {
    const excerpt = markdownExcerpt("## What's New\n- **Added** dark mode\n- Fixed [crash](https://x.dev) on start");
    expect(excerpt).toContain("Added dark mode");
    expect(excerpt).not.toContain("**");
    expect(excerpt).not.toContain("https://");
  });

  it("truncates long notes with an ellipsis", () => {
    const excerpt = markdownExcerpt("x".repeat(300), 50);
    expect(excerpt.length).toBe(50);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("returns empty text for empty input", () => {
    expect(markdownExcerpt(null)).toBe("");
  });
});
