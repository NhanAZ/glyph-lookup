export type InputMode = "hex" | "decimal" | "character";

export type ParsedCodePoint =
  | { ok: true; codePoint: number }
  | { ok: false; message: string };

const MAX_CODE_POINT = 0x10ffff;

function validateCodePoint(codePoint: number): ParsedCodePoint {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > MAX_CODE_POINT) {
    return {
      ok: false,
      message: "Enter a value from 0 to 10FFFF.",
    };
  }

  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    return {
      ok: false,
      message: "Surrogate values are not Unicode characters. Enter a character or code point instead.",
    };
  }

  return { ok: true, codePoint };
}

export function parseLookupInput(value: string, mode: InputMode): ParsedCodePoint {
  if (mode === "character") {
    const characters = Array.from(value);
    if (characters.length !== 1) {
      return {
        ok: false,
        message: "Enter exactly one Unicode code point.",
      };
    }

    return validateCodePoint(characters[0].codePointAt(0)!);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      message: "Enter a Unicode value to look it up.",
    };
  }

  if (mode === "decimal") {
    const decimal = /^\d+$/.test(trimmed)
      ? trimmed
      : /^\d{1,3}(?:,\d{3})+$/.test(trimmed)
        ? trimmed.replace(/,/g, "")
        : null;

    if (decimal === null) {
      return {
        ok: false,
        message: "Enter a whole decimal number.",
      };
    }

    return validateCodePoint(Number(decimal));
  }

  const hex = trimmed.replace(/^(?:U\+|0x|\\u\{?)/i, "").replace(/\}$/, "");
  if (!/^[\da-f]{1,6}$/i.test(hex)) {
    return {
      ok: false,
      message: "Enter one to six hexadecimal digits, such as E300.",
    };
  }

  return validateCodePoint(Number.parseInt(hex, 16));
}

export function formatCodePoint(codePoint: number): string {
  return "U+" + codePoint.toString(16).toUpperCase().padStart(4, "0");
}

export function formatDecimal(codePoint: number): string {
  return new Intl.NumberFormat("en-US").format(codePoint);
}

export function toUnicodeCharacter(codePoint: number): string {
  return String.fromCodePoint(codePoint);
}

export function getEscapes(codePoint: number): {
  javascript: string;
  html: string;
  css: string;
  utf8: string;
} {
  const character = toUnicodeCharacter(codePoint);
  const utf8 = Array.from(new TextEncoder().encode(character))
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
  const hex = codePoint.toString(16).toUpperCase();

  return {
    javascript: "\\u{" + hex + "}",
    html: "&#x" + hex + ";",
    css: "\\" + hex,
    utf8,
  };
}

export function codePointFromUrl(search: string): number | null {
  const code = new URLSearchParams(search).get("code");
  if (!code) return null;
  const parsed = parseLookupInput(code, "hex");
  return parsed.ok ? parsed.codePoint : null;
}
