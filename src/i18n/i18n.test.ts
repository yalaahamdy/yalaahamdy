import { describe, expect, it } from "vitest";
import { fill } from "./config";
import { en } from "./en";
import { ar } from "./ar";
import { dictionaries } from "./dictionaries";

/** Recursively collect the "shape" of an object: keys and node kinds. */
function shape(value: unknown): string {
  if (value === null || typeof value !== "object") return typeof value;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => `${key}:${shape(child)}`)
    .join(",")}}`;
}

describe("dictionaries", () => {
  it("Arabic implements the exact English dictionary shape", () => {
    expect(shape(ar)).toBe(shape(en));
  });

  it("registers both locales", () => {
    expect(Object.keys(dictionaries).sort()).toEqual(["ar", "en"]);
  });

  it("has no leftover English copy inside the Arabic dictionary", () => {
    const asciiOnly = /"([^"]*[A-Za-z]{3}[^"]*)"/;
    const values: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node === "string") values.push(node);
      else if (node && typeof node === "object") Object.values(node).forEach(walk);
    };
    walk(ar);
    const offenders = values.filter((value) => {
      // Allow brand names, GitHub, version-ish tokens and format placeholders.
      const cleaned = value.replace(/\{(\w+)\}/g, "").replace(/GitHub|macOS|iOS|AAB|MSIX|APK|DEB|RPM|AppImage|Snap|Flatpak|CEFR|Yalaah|PIN|Web|zip|tar\.gz|v?\d+(\.\d+)*/g, "");
      return asciiOnly.test(cleaned);
    });
    expect(offenders).toEqual([]);
  });

  it("keeps templates symmetric between locales", () => {
    const templates: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") {
        if (/\{\w+\}/.test(node)) templates.push(path);
      } else if (node && typeof node === "object") {
        for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`);
      }
    };
    walk(en, "en");
    walk(ar, "ar");
    const normalize = (path: string) => path.replace(/^en\./, "").replace(/^ar\./, "");
    const enPaths = new Set(templates.filter((p) => p.startsWith("en.")).map(normalize));
    const arPaths = new Set(templates.filter((p) => p.startsWith("ar.")).map(normalize));
    expect([...enPaths].sort()).toEqual([...arPaths].sort());
  });
});

describe("fill", () => {
  it("replaces named placeholders", () => {
    expect(fill("Download {label} · {size}", { label: "APK", size: 12 })).toBe("Download APK · 12");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(fill("Hi {name} {missing}", { name: "Ali" })).toBe("Hi Ali {missing}");
  });
});
