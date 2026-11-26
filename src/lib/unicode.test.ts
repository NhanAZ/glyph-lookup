import { describe, expect, it } from "vitest";
import {
  codePointFromUrl,
  formatCodePoint,
  formatDecimal,
  getEscapes,
  parseLookupInput,
} from "./unicode";

describe("parseLookupInput", () => {
  it("accepts hexadecimal values with common prefixes", () => {
    expect(parseLookupInput("E300", "hex")).toEqual({ ok: true, codePoint: 0xe300 });
    expect(parseLookupInput("U+E300", "hex")).toEqual({ ok: true, codePoint: 0xe300 });
    expect(parseLookupInput("0xE300", "hex")).toEqual({ ok: true, codePoint: 0xe300 });
  });

  it("accepts decimal values and pasted supplementary characters", () => {
    expect(parseLookupInput("57344", "decimal")).toEqual({ ok: true, codePoint: 0xe000 });
    expect(parseLookupInput("🧭", "character")).toEqual({ ok: true, codePoint: 0x1f9ed });
  });

  it("accepts formatted decimal values copied from character details", () => {
    const decimal = formatDecimal(0x2605);

    expect(decimal).toBe("9,733");
    expect(parseLookupInput(decimal, "decimal")).toEqual({ ok: true, codePoint: 0x2605 });
    expect(parseLookupInput("1,114,111", "decimal")).toEqual({ ok: true, codePoint: 0x10ffff });
  });

  it("rejects decimal values with invalid comma grouping", () => {
    expect(parseLookupInput("9,73,3", "decimal").ok).toBe(false);
    expect(parseLookupInput("97,33", "decimal").ok).toBe(false);
  });

  it("preserves a literal space in character mode", () => {
    expect(parseLookupInput(" ", "character")).toEqual({ ok: true, codePoint: 0x20 });
  });

  it("rejects values outside the scalar range and surrogate code points", () => {
    expect(parseLookupInput("110000", "hex").ok).toBe(false);
    expect(parseLookupInput("D800", "hex").ok).toBe(false);
    expect(parseLookupInput("hello", "character").ok).toBe(false);
  });

  it("reads hexadecimal share links", () => {
    expect(codePointFromUrl("?code=E300")).toBe(0xe300);
    expect(codePointFromUrl("?code=110000")).toBeNull();
  });
});

describe("Unicode formatting", () => {
  it("formats code points and creates copyable escapes", () => {
    expect(formatCodePoint(0xe300)).toBe("U+E300");
    expect(getEscapes(0x1f9ed)).toEqual({
      javascript: "\\u{1F9ED}",
      html: "&#x1F9ED;",
      css: "\\1F9ED",
      utf8: "F0 9F A7 AD",
    });
  });
});
