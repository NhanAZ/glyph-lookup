import { describe, expect, it } from "vitest";
import { getUnicodeMetadata } from "./metadata";

describe("Unicode metadata", () => {
  it("includes character names, category, and block data", async () => {
    await expect(getUnicodeMetadata(0x41)).resolves.toMatchObject({
      name: "LATIN CAPITAL LETTER A",
      category: "Lu",
      block: "Basic Latin",
      version: "18.0.0",
    });
  });

  it("identifies Private Use Area characters in all ranges", async () => {
    for (const [start, end, block] of [
      [0xe000, 0xf8ff, "Private Use Area"],
      [0xf0000, 0xffffd, "Supplementary Private Use Area-A"],
      [0x100000, 0x10fffd, "Supplementary Private Use Area-B"],
    ] as const) {
      for (const codePoint of [start, end]) {
        await expect(getUnicodeMetadata(codePoint)).resolves.toMatchObject({
          name: null,
          category: "Co",
          block,
          isPrivateUse: true,
        });
      }
    }
  });

  it("generates names for Unicode algorithmic ranges", async () => {
    await expect(getUnicodeMetadata(0xac00)).resolves.toMatchObject({
      name: "HANGUL SYLLABLE GA",
      category: "Lo",
    });
    await expect(getUnicodeMetadata(0x20000)).resolves.toMatchObject({
      name: "CJK UNIFIED IDEOGRAPH-20000",
      category: "Lo",
    });
    await expect(getUnicodeMetadata(0x3400)).resolves.toMatchObject({
      name: "CJK UNIFIED IDEOGRAPH-3400",
      category: "Lo",
    });
  });

  it("includes characters added in Unicode 18.0", async () => {
    await expect(getUnicodeMetadata(0x20c2)).resolves.toMatchObject({
      name: "RUFIYAA SIGN",
      category: "Sc",
      block: "Currency Symbols",
    });
  });

  it("labels unassigned and noncharacter code points without inventing names", async () => {
    await expect(getUnicodeMetadata(0x378)).resolves.toMatchObject({
      name: null,
      category: "Cn",
      isUnassigned: true,
    });
    await expect(getUnicodeMetadata(0xffff)).resolves.toMatchObject({
      name: null,
      category: "Cn",
      isUnassigned: true,
    });
  });
});
