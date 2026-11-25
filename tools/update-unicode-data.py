"""Download Unicode 18.0 UCD files and create compact, lazy-loaded metadata."""

from __future__ import annotations

import io
import json
import re
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any


VERSION = "18.0.0"
DOWNLOAD_URL = f"https://www.unicode.org/Public/{VERSION}/ucd/UCD.zip"
TERMS_URL = "https://www.unicode.org/terms_of_use.html"
OUTPUT = Path("src/data/unicode")
SEGMENT_SIZE = 0x2000
SEGMENT_COUNT = 0x110000 // SEGMENT_SIZE


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def read_ucd_file(archive: zipfile.ZipFile, filename: str) -> str:
    match = next(
        (name for name in archive.namelist() if name.endswith("/" + filename) or name == filename),
        None,
    )
    if match is None:
        raise ValueError(f"{filename} was not found in the Unicode data archive")
    return archive.read(match).decode("utf-8")


def parse_unicode_data(contents: str) -> tuple[dict[int, list[list[Any]]], dict[int, list[list[Any]]]]:
    entries: dict[int, list[list[Any]]] = defaultdict(list)
    ranges: dict[int, list[list[Any]]] = defaultdict(list)
    range_start: tuple[int, str, str, int] | None = None

    for line in contents.splitlines():
        fields = line.split(";")
        code_point = int(fields[0], 16)
        name = fields[1]
        category = fields[2]
        combining_class = int(fields[3])
        segment = code_point // SEGMENT_SIZE

        if name.endswith(", First>"):
            range_start = (code_point, name[1:-8].upper(), category, combining_class)
            continue

        if name.endswith(", Last>") and range_start is not None:
            start, prefix, first_category, first_combining_class = range_start
            pattern = "prefix"
            if prefix == "HANGUL SYLLABLE":
                pattern = "hangul"
            elif prefix.startswith("CJK IDEOGRAPH"):
                prefix = "CJK UNIFIED IDEOGRAPH"
                pattern = "hex"
            elif prefix.startswith("PRIVATE USE"):
                prefix = ""
                pattern = "none"
            range_cursor = start
            while range_cursor <= code_point:
                range_segment = range_cursor // SEGMENT_SIZE
                range_end = min(code_point, (range_segment + 1) * SEGMENT_SIZE - 1)
                ranges[range_segment].append(
                    [
                        range_cursor,
                        range_end,
                        first_category,
                        pattern,
                        prefix,
                        first_combining_class,
                    ]
                )
                range_cursor = range_end + 1
            range_start = None
            continue

        if name.startswith("<") and name.endswith(">"):
            continue

        entries[segment].append([code_point, name, category, combining_class])

    return entries, ranges


def parse_blocks(contents: str) -> list[list[Any]]:
    blocks: list[list[Any]] = []
    for line in contents.splitlines():
        content = line.split("#", 1)[0].strip()
        if not content:
            continue
        interval, name = (part.strip() for part in content.split(";", 1))
        start, end = interval.split("..", 1)
        blocks.append([int(start, 16), int(end, 16), name])
    return blocks


def parse_aliases(contents: str) -> dict[str, list[str]]:
    aliases: dict[str, list[str]] = defaultdict(list)
    for line in contents.splitlines():
        content = line.split("#", 1)[0].strip()
        if not content:
            continue
        code, name, _alias_type = (part.strip() for part in content.split(";", 2))
        aliases[f"{int(code, 16):04X}"].append(name)
    return dict(aliases)


def main() -> None:
    request = urllib.request.Request(
        DOWNLOAD_URL,
        headers={"User-Agent": "Unicode-Lookup metadata builder"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        archive_bytes = response.read()

    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        entries, ranges = parse_unicode_data(read_ucd_file(archive, "UnicodeData.txt"))
        blocks = parse_blocks(read_ucd_file(archive, "Blocks.txt"))
        aliases = parse_aliases(read_ucd_file(archive, "NameAliases.txt"))

    with urllib.request.urlopen(TERMS_URL, timeout=30) as response:
        terms = response.read().decode("utf-8")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for pattern in ("plane-*.json", "segment-*.json"):
        for path in OUTPUT.glob(pattern):
            path.unlink()

    for segment in range(SEGMENT_COUNT):
        if not entries.get(segment) and not ranges.get(segment):
            continue
        write_json(
            OUTPUT / f"segment-{segment:03d}.json",
            {
                "entries": entries.get(segment, []),
                "ranges": ranges.get(segment, []),
            },
        )

    write_json(
        OUTPUT / "index.json",
        {
            "version": VERSION,
            "segmentSize": SEGMENT_SIZE,
            "blocks": blocks,
            "aliases": aliases,
        },
    )
    (OUTPUT / "UNICODE-LICENSE.txt").write_text(terms, encoding="utf-8")
    print(f"Generated Unicode {VERSION} metadata in {OUTPUT}")


if __name__ == "__main__":
    main()
