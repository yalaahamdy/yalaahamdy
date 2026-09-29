import { describe, expect, it } from "vitest";
import { bestIconPath, resolveConfiguredIcon, scoreIconPath } from "./icons";
import type { AppEntry } from "../config";

function app(overrides: Partial<AppEntry> = {}): AppEntry {
  return {
    slug: "demo",
    name: "Demo",
    repository: "owner/demo",
    description: "d",
    platforms: [],
    category: "Other",
    ...overrides,
  };
}

describe("resolveConfiguredIcon", () => {
  it("treats a leading slash as a site asset untouched", () => {
    expect(resolveConfiguredIcon(app({ icon: "/app-icons/demo.webp" }))).toBe("/app-icons/demo.webp");
  });

  it("keeps absolute URLs as-is", () => {
    expect(resolveConfiguredIcon(app({ icon: "https://cdn.example.io/x.png" }))).toBe("https://cdn.example.io/x.png");
  });

  it("resolves a repo file path to raw.githubusercontent", () => {
    expect(resolveConfiguredIcon(app({ repository: "yalaahamdy/ClipVault", icon: "icon.png" }))).toBe(
      "https://raw.githubusercontent.com/yalaahamdy/ClipVault/HEAD/icon.png",
    );
  });

  it("returns null without an icon", () => {
    expect(resolveConfiguredIcon(app())).toBeNull();
  });
});

describe("bestIconPath", () => {
  it("prefers root icon.png over deep logo files", () => {
    expect(bestIconPath(["docs/img/logo.png", "icon.png"])).toBe("icon.png");
  });

  it("prefers the highest-density launcher icon", () => {
    const best = bestIconPath([
      "app/src/main/res/mipmap-mdpi/ic_launcher.png",
      "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
      "app/src/main/res/mipmap-hdpi/ic_launcher.png",
    ]);
    expect(best).toBe("app/src/main/res/mipmap-xxxhdpi/ic_launcher.png");
  });

  it("ranks SVG over PNG at equal depth", () => {
    expect(scoreIconPath("logo.svg")).toBeGreaterThan(scoreIconPath("logo.png"));
  });

  it("ignores files that are not icon-like", () => {
    expect(bestIconPath(["src/app.tsx", "README.md", "assets/banner.png"])).toBeNull();
  });

  it("finds android launcher webp and tauri icons", () => {
    expect(bestIconPath(["app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp"])).toBeTruthy();
    expect(bestIconPath(["src-tauri/icons/icon.png"])).toBeTruthy();
  });

  it("prefers explicit brand assets over generic template logos", () => {
    const chosen = bestIconPath(["public/logo.svg", "public/brand/app_icon.png"]);
    expect(chosen).toBe("public/brand/app_icon.png");
  });

  it("penalizes boilerplate files like next.svg and vercel.svg", () => {
    expect(scoreIconPath("public/vercel.svg")).toBeLessThan(0);
    expect(scoreIconPath("public/next.svg")).toBeLessThan(0);
  });

  it("detects code-drawn Android launcher vector xml as a prime icon candidate", () => {
    const chosen = bestIconPath([
      "app/src/main/res/drawable/ic_launcher_foreground.xml",
      "public/dummy-icon.png",
    ]);
    expect(chosen).toBe("app/src/main/res/drawable/ic_launcher_foreground.xml");
  });
});
