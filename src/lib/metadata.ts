import unicodeIndex from "../data/unicode/index.json";

type UnicodeBlock = [start: number, end: number, name: string];
type UnicodeAliasMap = Record<string, string[]>;
type UnicodeEntry = [codePoint: number, name: string, category: string, combiningClass: number];
type UnicodeRange = [
  start: number,
  end: number,
  category: string,
  pattern: "prefix" | "hex" | "hangul" | "none",
  prefix: string,
  combiningClass: number,
];

interface UnicodePlane {
  entries: UnicodeEntry[];
  ranges: UnicodeRange[];
}

interface UnicodeIndex {
  version: string;
  segmentSize: number;
  blocks: UnicodeBlock[];
  aliases: UnicodeAliasMap;
}

export interface UnicodeMetadata {
  codePoint: number;
  name: string | null;
  aliases: string[];
  block: string | null;
  category: string;
  categoryName: string;
  combiningClass: number;
  isPrivateUse: boolean;
  isUnassigned: boolean;
  version: string;
}

const index = unicodeIndex as unknown as UnicodeIndex;
const segmentLoaders = import.meta.glob<UnicodePlane>("../data/unicode/segment-*.json", {
  import: "default",
});
const segmentCache = new Map<number, Promise<UnicodePlane>>();

const CATEGORY_NAMES: Record<string, string> = {
  Lu: "Uppercase letter",
  Ll: "Lowercase letter",
  Lt: "Titlecase letter",
  Lm: "Modifier letter",
  Lo: "Other letter",
  Mn: "Nonspacing mark",
  Mc: "Spacing mark",
  Me: "Enclosing mark",
  Nd: "Decimal number",
  Nl: "Letter number",
  No: "Other number",
  Pc: "Connector punctuation",
  Pd: "Dash punctuation",
  Ps: "Open punctuation",
  Pe: "Close punctuation",
  Pi: "Initial punctuation",
  Pf: "Final punctuation",
  Po: "Other punctuation",
  Sm: "Math symbol",
  Sc: "Currency symbol",
  Sk: "Modifier symbol",
  So: "Other symbol",
  Zs: "Space separator",
  Zl: "Line separator",
  Zp: "Paragraph separator",
  Cc: "Control",
  Cf: "Format",
  Cs: "Surrogate",
  Co: "Private use",
  Cn: "Unassigned",
};

function getSegment(segment: number): Promise<UnicodePlane> {
  const existing = segmentCache.get(segment);
  if (existing) return existing;

  const path = "../data/unicode/segment-" + segment.toString().padStart(3, "0") + ".json";
  const loader = segmentLoaders[path];
  if (!loader) return Promise.resolve({ entries: [], ranges: [] });

  const loaded = loader();
  segmentCache.set(segment, loaded);
  return loaded;
}

function binarySearch<T>(
  values: T[],
  codePoint: number,
  getStart: (value: T) => number,
  getEnd: (value: T) => number,
): T | undefined {
  let lower = 0;
  let upper = values.length - 1;

  while (lower <= upper) {
    const middle = (lower + upper) >> 1;
    const value = values[middle];
    if (codePoint < getStart(value)) {
      upper = middle - 1;
    } else if (codePoint > getEnd(value)) {
      lower = middle + 1;
    } else {
      return value;
    }
  }

  return undefined;
}

function getBlock(codePoint: number): string | null {
  return binarySearch(index.blocks, codePoint, (block) => block[0], (block) => block[1])?.[2] ?? null;
}

function getHangulName(codePoint: number): string {
  const leading = ["G", "GG", "N", "D", "DD", "R", "M", "B", "BB", "S", "SS", "NG", "J", "JJ", "C", "K", "T", "P", "H"];
  const vowels = ["A", "AE", "YA", "YAE", "EO", "E", "YEO", "YE", "O", "WA", "WAE", "OE", "YO", "U", "WEO", "WE", "WI", "YU", "EU", "YI", "I"];
  const trailing = ["", "G", "GG", "GS", "N", "NJ", "NH", "D", "L", "LG", "LM", "LB", "LS", "LT", "LP", "LH", "M", "B", "BS", "S", "SS", "NG", "J", "C", "K", "T", "P", "H"];
  const syllableIndex = codePoint - 0xac00;
  const leadingIndex = Math.floor(syllableIndex / 588);
  const vowelIndex = Math.floor((syllableIndex % 588) / 28);
  const trailingIndex = syllableIndex % 28;
  return "HANGUL SYLLABLE " + leading[leadingIndex] + vowels[vowelIndex] + trailing[trailingIndex];
}

function isNoncharacter(codePoint: number): boolean {
  return (codePoint >= 0xfdd0 && codePoint <= 0xfdef) || (codePoint & 0xfffe) === 0xfffe;
}

export async function getUnicodeMetadata(codePoint: number): Promise<UnicodeMetadata> {
  const segment = await getSegment(Math.floor(codePoint / index.segmentSize));
  const entry = binarySearch(
    segment.entries,
    codePoint,
    (value) => value[0],
    (value) => value[0],
  );
  const range = binarySearch(
    segment.ranges,
    codePoint,
    (value) => value[0],
    (value) => value[1],
  );
  const category = entry?.[2] ?? range?.[2] ?? "Cn";
  const aliases = index.aliases[codePoint.toString(16).toUpperCase().padStart(4, "0")] ?? [];
  let name: string | null = entry?.[1] ?? null;
  let combiningClass = entry?.[3] ?? range?.[5] ?? 0;

  if (range) {
    if (range[3] === "hangul") {
      name = getHangulName(codePoint);
    } else if (range[3] === "hex") {
      name = range[4] + "-" + codePoint.toString(16).toUpperCase();
    } else if (range[3] === "prefix") {
      name = range[4] + "-" + codePoint.toString(16).toUpperCase();
    }
  }

  if (name === "<control>" && aliases.length > 0) {
    name = aliases[0];
  }

  if (isNoncharacter(codePoint)) {
    name = null;
  }

  if (category === "Co") {
    name = null;
  }

  return {
    codePoint,
    name,
    aliases,
    block: getBlock(codePoint),
    category,
    categoryName: CATEGORY_NAMES[category] ?? "Unassigned",
    combiningClass,
    isPrivateUse: category === "Co",
    isUnassigned: category === "Cn",
    version: index.version,
  };
}
