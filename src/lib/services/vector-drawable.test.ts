import { describe, expect, it } from "vitest";
import { androidColorToCss, convertVectorDrawableToSvg, svgToDataUri } from "./vector-drawable";

describe("androidColorToCss", () => {
  it("converts #AARRGGBB with full opacity to #RRGGBB", () => {
    expect(androidColorToCss("#FF101720")).toBe("#101720");
  });

  it("converts #AARRGGBB with partial opacity to rgba", () => {
    expect(androidColorToCss("#80101720")).toMatch(/^rgba\(16, 23, 32, 0\.5\d*\)$/);
  });

  it("handles #RRGGBB directly", () => {
    expect(androidColorToCss("#FFB74A")).toBe("#FFB74A");
  });
});

describe("convertVectorDrawableToSvg", () => {
  it("converts basic vector drawable with path", () => {
    const xml = `
      <vector xmlns:android="http://schemas.android.com/apk/res/android"
          android:width="108dp"
          android:height="108dp"
          android:viewportWidth="108"
          android:viewportHeight="108">
          <path
              android:fillColor="#FFB74A"
              android:pathData="M12,14c1.66,0 3,-1.34 3,-3V5"/>
      </vector>
    `;

    const svg = convertVectorDrawableToSvg(xml);
    expect(svg).toContain('viewBox="0 0 108 108"');
    expect(svg).toContain('fill="#FFB74A"');
    expect(svg).toContain('d="M12,14c1.66,0 3,-1.34 3,-3V5"');
  });

  it("converts groups with transform attributes", () => {
    const xml = `
      <vector xmlns:android="http://schemas.android.com/apk/res/android"
          android:viewportWidth="108"
          android:viewportHeight="108">
          <group
              android:translateX="27"
              android:translateY="26"
              android:scaleX="2.25"
              android:scaleY="2.25">
              <path
                  android:fillColor="#FFFFFF"
                  android:pathData="M0,0 L10,10"/>
          </group>
      </vector>
    `;

    const svg = convertVectorDrawableToSvg(xml);
    expect(svg).toContain("<g transform=");
    expect(svg).toContain("translate(27, 26)");
    expect(svg).toContain("scale(2.25, 2.25)");
    expect(svg).toContain("</g>");
  });

  it("integrates background color or background xml layer", () => {
    const xml = `
      <vector xmlns:android="http://schemas.android.com/apk/res/android"
          android:viewportWidth="108"
          android:viewportHeight="108">
          <path android:fillColor="#FFFFFF" android:pathData="M1,1 L2,2"/>
      </vector>
    `;

    const svgWithColor = convertVectorDrawableToSvg(xml, { backgroundColor: "#FF182230" });
    expect(svgWithColor).toContain('<rect width="108" height="108" fill="#182230"/>');

    const bgXml = `
      <vector xmlns:android="http://schemas.android.com/apk/res/android"
          android:viewportWidth="108"
          android:viewportHeight="108">
          <path android:fillColor="#000000" android:pathData="M0,0 H108 V108 H0 Z"/>
      </vector>
    `;
    const svgWithXml = convertVectorDrawableToSvg(xml, { backgroundXml: bgXml });
    expect(svgWithXml).toContain('d="M0,0 H108 V108 H0 Z"');
  });
});

describe("svgToDataUri", () => {
  it("encodes valid data uri", () => {
    const dataUri = svgToDataUri("<svg><circle r='5'/></svg>");
    expect(dataUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(dataUri).toContain("%3Csvg%3E");
  });
});
