import { describe, expect, it } from "vitest";
import { detectAsset, groupAssets, isDownloadable, pickPrimaryAsset, type NormalizedAsset } from "./assets";

const asset = (name: string, overrides: Partial<NormalizedAsset> = {}): NormalizedAsset => ({
  name,
  url: `https://example.com/${name}`,
  size: 1024,
  downloadCount: 0,
  ...detectAsset(name),
  ...overrides,
});

describe("detectAsset", () => {
  it("classifies common installer formats", () => {
    expect(detectAsset("App-v1.0.0.apk")).toMatchObject({ platform: "Android", kind: "installer", label: "APK" });
    expect(detectAsset("App-1.2.3_x64-setup.exe")).toMatchObject({ platform: "Windows", kind: "installer" });
    expect(detectAsset("setup.msi")).toMatchObject({ platform: "Windows", kind: "installer" });
    expect(detectAsset("App.dmg")).toMatchObject({ platform: "macOS", kind: "installer" });
    expect(detectAsset("app_1.0_amd64.deb")).toMatchObject({ platform: "Linux", kind: "package" });
    expect(detectAsset("app-1.0-x86_64.AppImage")).toMatchObject({ platform: "Linux", kind: "portable" });
  });

  it("classifies tar.gz before treating gz-like suffixes", () => {
    expect(detectAsset("myapp-linux.tar.gz")).toMatchObject({ platform: "Linux", kind: "archive", label: "tar.gz" });
    expect(detectAsset("myapp.tgz")).toMatchObject({ platform: "Linux", kind: "archive" });
  });

  it("uses filename keywords for ambiguous zip archives", () => {
    expect(detectAsset("myapp-win64-portable.zip")).toMatchObject({ platform: "Windows", kind: "portable" });
    expect(detectAsset("bundle-android.zip").platform).toBe("Android");
    expect(detectAsset("something.zip").platform).toBe("Other");
  });

  it("never guesses platform for unknown or checksum files", () => {
    expect(detectAsset("firmware.bin")).toMatchObject({ platform: "Other", kind: "other" });
    expect(detectAsset("checksums.txt")).toMatchObject({ kind: "checksum" });
    expect(detectAsset("app.apk.sha256")).toMatchObject({ kind: "checksum" });
    expect(detectAsset("app-sources.zip")).toMatchObject({ platform: "Other" });
  });

  it("honors assetOverrides above every heuristic", () => {
    const overrides = [{ match: "\\.zip$", platform: "Windows", label: "Portable ZIP" }];
    expect(detectAsset("crossplatform-bundle.zip", overrides)).toMatchObject({ platform: "Windows", label: "Portable ZIP" });
  });

  it("skips invalid override regexes instead of crashing", () => {
    const overrides = [{ match: "([bad", platform: "Windows" }];
    expect(detectAsset("app.apk", overrides).platform).toBe("Android");
  });
});

describe("groupAssets", () => {
  it("groups by platform in display order and separates checksums", () => {
    const { groups, checksums } = groupAssets([
      asset("app.exe"),
      asset("app.apk"),
      asset("checksums.txt"),
      asset("portable-win.zip"),
    ]);
    expect(groups.map((group) => group.platform)).toEqual(["Android", "Windows"]);
    expect(groups[0]?.assets).toHaveLength(1);
    expect(groups[1]?.assets).toHaveLength(2);
    expect(checksums).toHaveLength(1);
  });

  it("reports a source-only release with no groups", () => {
    const { groups, checksums } = groupAssets([asset("source.zip")]);
    expect(groups).toHaveLength(0);
    expect(checksums).toHaveLength(0);
  });
});

describe("pickPrimaryAsset", () => {
  it("prefers installers for the app's declared platforms", () => {
    const assets = [asset("app.apk"), asset("app.exe"), asset("portable.zip")];
    expect(pickPrimaryAsset(assets, ["Windows", "Android"])?.name).toBe("app.exe");
    expect(pickPrimaryAsset(assets, ["Android", "Windows"])?.name).toBe("app.apk");
  });

  it("falls back to any installable, then any downloadable asset", () => {
    const apkOnly = [asset("app.apk")];
    expect(pickPrimaryAsset(apkOnly, ["Windows"])?.name).toBe("app.apk");
    const checksumOnly = [asset("checksums.txt")];
    expect(pickPrimaryAsset(checksumOnly, ["Windows"])).toBeNull();
  });

  it("returns null when nothing is downloadable", () => {
    expect(pickPrimaryAsset([], [])).toBeNull();
    expect(isDownloadable(asset("notes.txt"))).toBe(false);
  });
});
