/**
 * Android Vector Drawable to SVG converter.
 *
 * Converts Android Vector XML (such as ic_launcher_foreground.xml and adaptive icon layers)
 * directly into standards-compliant SVG data URIs, allowing apps whose icons are drawn
 * purely in code during the build process to be discovered and displayed faithfully.
 */

export function androidColorToCss(colorStr: string): string {
  const trimmed = colorStr.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 8) {
      // #AARRGGBB format
      const alpha = parseInt(hex.slice(0, 2), 16) / 255;
      const r = parseInt(hex.slice(2, 4), 16);
      const g = parseInt(hex.slice(4, 6), 16);
      const b = parseInt(hex.slice(6, 8), 16);
      if (alpha === 1) {
        return `#${hex.slice(2)}`;
      }
      return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
    }
    if (hex.length === 4) {
      // #ARGB format
      const alpha = parseInt(hex[0] + hex[0], 16) / 255;
      const r = parseInt(hex[1] + hex[1], 16);
      const g = parseInt(hex[2] + hex[2], 16);
      const b = parseInt(hex[3] + hex[3], 16);
      if (alpha === 1) {
        return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
      }
      return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
    }
    return trimmed;
  }
  return trimmed;
}

interface GroupAttrs {
  scaleX?: number;
  scaleY?: number;
  pivotX?: number;
  pivotY?: number;
  translateX?: number;
  translateY?: number;
  rotation?: number;
}

function buildGroupTransform(attrs: GroupAttrs): string {
  const {
    scaleX = 1,
    scaleY = 1,
    pivotX = 0,
    pivotY = 0,
    translateX = 0,
    translateY = 0,
    rotation = 0,
  } = attrs;

  const parts: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    parts.push(`translate(${translateX}, ${translateY})`);
  }
  if (rotation !== 0) {
    if (pivotX !== 0 || pivotY !== 0) {
      parts.push(`rotate(${rotation}, ${pivotX}, ${pivotY})`);
    } else {
      parts.push(`rotate(${rotation})`);
    }
  }
  if (scaleX !== 1 || scaleY !== 1) {
    if (pivotX !== 0 || pivotY !== 0) {
      parts.push(`translate(${pivotX}, ${pivotY})`);
    }
    parts.push(`scale(${scaleX}, ${scaleY})`);
    if (pivotX !== 0 || pivotY !== 0) {
      parts.push(`translate(${-pivotX}, ${-pivotY})`);
    }
  }
  return parts.join(" ");
}

function extractAttr(tagStr: string, attrName: string): string | null {
  const match = new RegExp(`(?:android:|tools:|app:)?${attrName}="([^"]*)"`, "i").exec(tagStr);
  return match ? match[1] : null;
}

/**
 * Extracts inner paths and groups from an Android Vector XML.
 */
function parseVectorElements(xml: string): string {
  // Extract path and group tags using regex to remain environment-agnostic (browser & node).
  const elementRegex = /<(path|group|\/group)([^>]*?)(\/?>)/gi;
  let match: RegExpExecArray | null;
  const result: string[] = [];

  while ((match = elementRegex.exec(xml)) !== null) {
    const tagName = match[1].toLowerCase();
    const rawAttrs = match[2];
    const isSelfClosing = match[3] === "/>" || match[3].endsWith("/>");

    if (tagName === "/group") {
      result.push("</g>");
      continue;
    }

    if (tagName === "group") {
      const scaleX = parseFloat(extractAttr(rawAttrs, "scaleX") ?? "1");
      const scaleY = parseFloat(extractAttr(rawAttrs, "scaleY") ?? "1");
      const pivotX = parseFloat(extractAttr(rawAttrs, "pivotX") ?? "0");
      const pivotY = parseFloat(extractAttr(rawAttrs, "pivotY") ?? "0");
      const translateX = parseFloat(extractAttr(rawAttrs, "translateX") ?? "0");
      const translateY = parseFloat(extractAttr(rawAttrs, "translateY") ?? "0");
      const rotation = parseFloat(extractAttr(rawAttrs, "rotation") ?? "0");

      const transform = buildGroupTransform({ scaleX, scaleY, pivotX, pivotY, translateX, translateY, rotation });
      const transformAttr = transform ? ` transform="${transform}"` : "";

      result.push(`<g${transformAttr}>`);
      if (isSelfClosing) {
        result.push("</g>");
      }
      continue;
    }

    if (tagName === "path") {
      const pathData = extractAttr(rawAttrs, "pathData");
      if (!pathData) continue;

      const rawFillColor = extractAttr(rawAttrs, "fillColor");
      const rawStrokeColor = extractAttr(rawAttrs, "strokeColor");
      const strokeWidth = extractAttr(rawAttrs, "strokeWidth");
      const fillType = extractAttr(rawAttrs, "fillType");
      const strokeLineCap = extractAttr(rawAttrs, "strokeLineCap");
      const strokeLineJoin = extractAttr(rawAttrs, "strokeLineJoin");

      const parts: string[] = [`d="${pathData.trim()}"`];

      if (rawFillColor) {
        parts.push(`fill="${androidColorToCss(rawFillColor)}"`);
      } else {
        parts.push('fill="none"');
      }

      if (rawStrokeColor) {
        parts.push(`stroke="${androidColorToCss(rawStrokeColor)}"`);
      }
      if (strokeWidth) {
        parts.push(`stroke-width="${strokeWidth}"`);
      }
      if (fillType && fillType.toLowerCase() === "evenodd") {
        parts.push('fill-rule="evenodd"');
      }
      if (strokeLineCap) {
        parts.push(`stroke-linecap="${strokeLineCap}"`);
      }
      if (strokeLineJoin) {
        parts.push(`stroke-linejoin="${strokeLineJoin}"`);
      }

      result.push(`<path ${parts.join(" ")}/>`);
    }
  }

  return result.join("");
}

export interface ConvertOptions {
  backgroundXml?: string;
  backgroundColor?: string;
}

/**
 * Converts Android Vector XML string to a complete SVG document.
 */
export function convertVectorDrawableToSvg(xml: string, options: ConvertOptions = {}): string {
  const rootMatch = /<vector([^>]*?)>/i.exec(xml);
  const rootAttrs = rootMatch ? rootMatch[1] : "";

  const viewportWidth = extractAttr(rootAttrs, "viewportWidth") ?? "108";
  const viewportHeight = extractAttr(rootAttrs, "viewportHeight") ?? "108";

  let backgroundSvgLayer = "";
  if (options.backgroundXml) {
    backgroundSvgLayer = parseVectorElements(options.backgroundXml);
  } else if (options.backgroundColor) {
    const color = androidColorToCss(options.backgroundColor);
    backgroundSvgLayer = `<rect width="${viewportWidth}" height="${viewportHeight}" fill="${color}"/>`;
  }

  const foregroundSvgLayer = parseVectorElements(xml);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewportWidth} ${viewportHeight}" width="${viewportWidth}" height="${viewportHeight}">` +
    backgroundSvgLayer +
    foregroundSvgLayer +
    `</svg>`
  );
}

/**
 * Encodes an SVG string as an inline Data URI suitable for img src.
 */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
