/**
 * CP-1256 (Windows Arabic) to UTF-8 Mojibake Repair.
 *
 * When Arabic text encoded in UTF-8 is mistakenly decoded using Windows-1256
 * (a common occurrence when publishing GitHub Releases via certain Windows CLIs/terminals),
 * the UTF-8 bytes for Arabic (0xD8/0xD9 followed by 0x80..0xBF) are interpreted
 * as Windows-1256 characters, producing text starting with "ط" (0xD8) and "ظ" (0xD9)
 * such as "ظ…ط§ ط§ظ„ط¬ط¯ظٹط¯" instead of "ما الجديد".
 *
 * This utility reverses the mapping and re-decodes the bytes as valid UTF-8.
 */

const CP1256_HIGH_CODEPOINTS: readonly number[] = [
  8364, 1662, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 1657, 8249, 338, 1670, 1688, 1672,
  1711, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 1705, 8482, 1681, 8250, 339, 8204, 8205, 1722,
  160, 1548, 162, 163, 164, 165, 166, 167, 168, 169, 1726, 171, 172, 173, 174, 175,
  176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 1563, 187, 188, 189, 190, 1567,
  1729, 1569, 1570, 1571, 1572, 1573, 1574, 1575, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583,
  1584, 1585, 1586, 1587, 1588, 1589, 1590, 215, 1591, 1592, 1593, 1594, 1600, 1601, 1602, 1603,
  224, 1604, 226, 1605, 1606, 1607, 1608, 231, 232, 233, 234, 235, 1609, 1610, 238, 239,
  1611, 1612, 1613, 1614, 244, 1615, 1616, 247, 1617, 249, 1618, 251, 252, 8206, 8207, 1746,
];

const cp1256ReverseMap: Map<number, number> = new Map();
CP1256_HIGH_CODEPOINTS.forEach((code, index) => {
  cp1256ReverseMap.set(code, 128 + index);
});

/**
 * Checks if a string has the typical signature of Arabic UTF-8 corrupted by CP-1256.
 */
export function hasCp1256Mojibake(text: string): boolean {
  if (!text) return false;
  // In CP-1256 mojibake, Arabic 2-byte sequences always start with U+0637 (ط) or U+0638 (ظ)
  return /(?:[طظ][^\s\w]){2,}/.test(text);
}

/**
 * Recovers pristine UTF-8 Arabic text from CP-1256 mojibake.
 * If the string does not appear corrupted or cannot be safely decoded, returns the original text.
 */
export function repairCp1256Mojibake(text: string): string {
  if (!hasCp1256Mojibake(text)) return text;

  try {
    const bytes: number[] = [];
    const encoder = new TextEncoder();

    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else if (cp1256ReverseMap.has(code)) {
        bytes.push(cp1256ReverseMap.get(code)!);
      } else {
        const char = text[i] ?? "";
        const encoded = encoder.encode(char);
        for (let j = 0; j < encoded.length; j += 1) {
          bytes.push(encoded[j]!);
        }
      }
    }

    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
    // Verify that the restored text contains Arabic characters
    if (/[\u0600-\u06FF]/.test(decoded)) {
      return decoded;
    }
    return text;
  } catch {
    return text;
  }
}
