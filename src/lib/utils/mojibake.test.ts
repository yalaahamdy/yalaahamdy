import { describe, expect, it } from "vitest";
import { hasCp1256Mojibake, repairCp1256Mojibake } from "./mojibake";

describe("repairCp1256Mojibake", () => {
  it("detects corrupted Arabic text", () => {
    expect(hasCp1256Mojibake("ظ…ط§ ط§ظ„ط¬ط¯ظٹط¯")).toBe(true);
    expect(hasCp1256Mojibake("Hello world")).toBe(false);
    expect(hasCp1256Mojibake("ما الجديد")).toBe(false);
  });

  it("restores corrupted Arabic release notes accurately", () => {
    const corrupted = "## ظ…ط§ ط§ظ„ط¬ط¯ظٹط¯ ظپظٹ ط§ظ„ط¥طµط¯ط§ط± v1.1.0\n1. ط­ظ…ط§ظٹط© ط§ظ„ظ†ظˆط§ظپط°";
    const repaired = repairCp1256Mojibake(corrupted);
    expect(repaired).toContain("## ما الجديد في الإصدار v1.1.0");
    expect(repaired).toContain("1. حماية النوافذ");
  });

  it("leaves normal text and normal Arabic untouched", () => {
    const arabic = "تطبيق رائع ومتطور";
    expect(repairCp1256Mojibake(arabic)).toBe(arabic);

    const english = "Release v1.2.0 - Fixed bug";
    expect(repairCp1256Mojibake(english)).toBe(english);
  });
});
