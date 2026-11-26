import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@oreui-web/react/button";
import { Container } from "@oreui-web/react/container";
import { Divider } from "@oreui-web/react/divider";
import { Table } from "@oreui-web/react/table";
import { Textfield } from "@oreui-web/react/textfield";
import { TabButton, Toggles } from "@oreui-web/react/toggles";
import { Toast } from "@oreui-web/react/toast";
import type { InputMode } from "./lib/unicode";
import {
  codePointFromUrl,
  formatCodePoint,
  formatDecimal,
  getEscapes,
  parseLookupInput,
  toUnicodeCharacter,
} from "./lib/unicode";
import type { UnicodeMetadata } from "./lib/metadata";
import { getUnicodeMetadata } from "./lib/metadata";

const INPUT_OPTIONS = [
  { value: "hex", label: "Hex" },
  { value: "decimal", label: "Decimal" },
  { value: "character", label: "Character" },
] as const;

const QUICK_LOOKUPS = [
  { label: "U+0041", value: 0x41 },
  { label: "U+2605", value: 0x2605 },
  { label: "U+E300", value: 0xe300 },
];

function readInitialState(): {
  codePoint: number | null;
  query: string;
  error: string;
} {
  const params = new URLSearchParams(window.location.search);
  const sharedCode = params.get("code");
  if (sharedCode === null) {
    return { codePoint: 0x2605, query: "2605", error: "" };
  }

  const codePoint = codePointFromUrl(window.location.search);
  if (codePoint === null) {
    return {
      codePoint: null,
      query: sharedCode,
      error: "This link does not contain a valid Unicode code point.",
    };
  }

  return { codePoint, query: formatCodePoint(codePoint).slice(2), error: "" };
}

function displayName(metadata: UnicodeMetadata): string {
  if (metadata.isPrivateUse) return "Private-use character";
  if (metadata.isUnassigned) {
    return metadata.codePoint >= 0xfdd0 && metadata.codePoint <= 0xfdef ||
      (metadata.codePoint & 0xfffe) === 0xfffe
      ? "Unicode noncharacter"
      : "Unassigned code point";
  }
  return metadata.name ?? "Unnamed character";
}

function shouldShowGlyph(metadata: UnicodeMetadata): boolean {
  return !metadata.category.startsWith("C") || metadata.isPrivateUse;
}

function getPlaceholder(mode: InputMode): string {
  if (mode === "decimal") return "For example, 57344";
  if (mode === "character") return "Paste one Unicode character";
  return "For example, E300";
}

function CopyAction({
  label,
  value,
  copiedValue,
  onCopy,
  compact = false,
}: {
  label: string;
  value: string;
  copiedValue: string;
  onCopy: () => void;
  compact?: boolean;
}) {
  const copied = copiedValue === value;
  return (
    <Button
      color="secondary"
      className={compact ? "copy-action" : undefined}
      type="button"
      aria-label={copied ? label + " copied" : "Copy " + label}
      onClick={onCopy}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CopyCell({
  label,
  value,
  copiedValue,
  onCopy,
}: {
  label: string;
  value: string;
  copiedValue: string;
  onCopy: () => void;
}) {
  return (
    <div className="table-value">
      <code title={value}>{value}</code>
      <CopyAction
        label={label}
        value={value}
        copiedValue={copiedValue}
        onCopy={onCopy}
        compact
      />
    </div>
  );
}

export default function App() {
  const [initial] = useState(readInitialState);
  const [mode, setMode] = useState<InputMode>("hex");
  const [query, setQuery] = useState(initial.query);
  const [codePoint, setCodePoint] = useState<number | null>(initial.codePoint);
  const [inputError, setInputError] = useState(initial.error);
  const [metadata, setMetadata] = useState<UnicodeMetadata | null>(null);
  const [metadataError, setMetadataError] = useState("");
  const [loadingMetadata, setLoadingMetadata] = useState(initial.codePoint !== null);
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState<"informative" | "warning">("informative");
  const [copiedValue, setCopiedValue] = useState("");

  useEffect(() => {
    if (codePoint === null) {
      setMetadata(null);
      setLoadingMetadata(false);
      return;
    }

    let current = true;
    setMetadata(null);
    setLoadingMetadata(true);
    setMetadataError("");

    getUnicodeMetadata(codePoint)
      .then((result) => {
        if (current) setMetadata(result);
      })
      .catch(() => {
        if (current) setMetadataError("Unicode metadata could not be loaded.");
      })
      .finally(() => {
        if (current) setLoadingMetadata(false);
      });

    return () => {
      current = false;
    };
  }, [codePoint]);

  useEffect(() => {
    function restoreFromUrl() {
      const restored = codePointFromUrl(window.location.search);
      if (restored === null) return;
      setMode("hex");
      setQuery(formatCodePoint(restored).slice(2));
      setCodePoint(restored);
      setInputError("");
    }

    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  function handleModeChange(nextMode: InputMode) {
    setMode(nextMode);
    setInputError("");
    if (codePoint === null) return;
    if (nextMode === "character") {
      setQuery(toUnicodeCharacter(codePoint));
    } else if (nextMode === "decimal") {
      setQuery(String(codePoint));
    } else {
      setQuery(codePoint.toString(16).toUpperCase());
    }
  }

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseLookupInput(query, mode);
    if (!parsed.ok) {
      setCodePoint(null);
      setInputError(parsed.message);
      return;
    }

    setCodePoint(parsed.codePoint);
    setInputError("");
    setQuery(mode === "character"
      ? toUnicodeCharacter(parsed.codePoint)
      : mode === "decimal"
        ? String(parsed.codePoint)
        : parsed.codePoint.toString(16).toUpperCase());

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("code", parsed.codePoint.toString(16).toUpperCase());
    window.history.replaceState({}, "", nextUrl);
  }

  function handleQuickLookup(value: number) {
    setMode("hex");
    setQuery(value.toString(16).toUpperCase());
    setCodePoint(value);
    setInputError("");
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("code", value.toString(16).toUpperCase());
    window.history.replaceState({}, "", nextUrl);
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setMessageVariant("informative");
      setMessage(label + " copied to the clipboard.");
      window.setTimeout(() => setCopiedValue(""), 1600);
    } catch {
      setMessageVariant("warning");
      setMessage("Clipboard access is not available in this browser.");
    }
  }

  async function copyShareLink() {
    if (codePoint === null) return;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("code", codePoint.toString(16).toUpperCase());
    await copyValue(shareUrl.toString(), "Share link");
  }

  const escapes = codePoint === null ? null : getEscapes(codePoint);
  const character = codePoint === null ? "" : toUnicodeCharacter(codePoint);
  const isBusy = loadingMetadata;
  const metadataRows = codePoint === null
    ? []
    : [
        { label: "Code point", value: formatCodePoint(codePoint), copyLabel: "code point" },
        { label: "Decimal", value: formatDecimal(codePoint), copyLabel: "decimal value" },
        {
          label: "General category",
          value: metadata
            ? metadata.category + " (" + metadata.categoryName + ")"
            : isBusy
              ? "Loading"
              : "Unavailable",
          copyLabel: "general category",
        },
        {
          label: "Unicode block",
          value: metadata?.block ?? (metadata ? "No Unicode block assigned" : "Loading"),
          copyLabel: "Unicode block",
        },
        { label: "Unicode version", value: metadata?.version ?? "18.0.0", copyLabel: "Unicode version" },
      ];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to lookup</a>

      <main id="main" className="main-content">
        <h1 className="visually-hidden">Unicode Lookup</h1>

        <Container variant="dark" className="lookup-workspace">
          <div className="workspace-grid">
            <section className="lookup-column" aria-labelledby="lookup-heading">
              <div className="section-heading">
                <h2 id="lookup-heading">Find a character</h2>
                <p>Choose a format, then enter a value.</p>
              </div>

              <form className="lookup-form" onSubmit={handleLookup} noValidate>
                <Toggles aria-label="Lookup input type" className="input-modes">
                  {INPUT_OPTIONS.map((option) => (
                    <TabButton
                      key={option.value}
                      value={option.value}
                      selected={mode === option.value}
                      onChange={() => handleModeChange(option.value)}
                    >
                      {option.label}
                    </TabButton>
                  ))}
                </Toggles>

                <Textfield
                  className="lookup-field"
                  name="lookup"
                  label={mode === "hex" ? "Hexadecimal code point" : mode === "decimal" ? "Decimal code point" : "Unicode character"}
                  description={inputError ? "" : "Hex accepts U+ or 0x. Character mode accepts one code point."}
                  error={inputError}
                  type="text"
                  inputMode={mode === "decimal" ? "numeric" : "text"}
                  autocomplete="off"
                  placeholder={getPlaceholder(mode)}
                  value={query}
                  onInput={(event) => {
                    const field = event.currentTarget as HTMLElement & { value: string };
                    setQuery(field.value);
                  }}
                />

                <Button type="submit" color="primary" className="lookup-submit">
                  Look up
                </Button>
              </form>

              <div className="quick-lookups">
                <p>Examples</p>
                <div className="quick-lookup-list">
                  {QUICK_LOOKUPS.map((item) => (
                    <Button
                      key={item.value}
                      color="secondary"
                      className="quick-lookup"
                      type="button"
                      onClick={() => handleQuickLookup(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

            </section>

            <section
              className="result-column"
              aria-labelledby="result-heading"
              aria-live="polite"
              aria-busy={isBusy}
            >
              <div className="result-heading-row">
                <div className="section-heading">
                  <h2 id="result-heading">Character details</h2>
                </div>
                {codePoint !== null ? (
                  <Button color="secondary" type="button" onClick={() => void copyShareLink()}>
                    Copy share link
                  </Button>
                ) : null}
              </div>

              {codePoint === null ? (
                <p className="empty-state">
                  Enter a valid code point to see its Unicode details.
                </p>
              ) : (
                <>
                  <div className="character-overview">
                    <Container
                      variant="light"
                      className="glyph-preview"
                      role="img"
                      aria-label={metadata ? "Preview of " + displayName(metadata) : "Unicode glyph preview"}
                    >
                      {metadata && shouldShowGlyph(metadata)
                        ? <span className="glyph-character">{character}</span>
                        : <span className="glyph-placeholder">U+</span>}
                    </Container>
                    <div className="character-summary">
                      <p className="character-kind">
                        {metadata ? metadata.categoryName : isBusy ? "Loading Unicode metadata" : "Unicode character"}
                      </p>
                      <h3>{metadata ? displayName(metadata) : isBusy ? "Looking up character" : metadataError || "Character details"}</h3>
                      <p>{metadata?.block ?? (metadata ? "No Unicode block assigned" : "Unicode 18.0.0")}</p>
                      <CopyAction
                        label="character"
                        value={character}
                        copiedValue={copiedValue}
                        onCopy={() => void copyValue(character, "Character")}
                      />
                    </div>
                  </div>

                  {metadata?.isPrivateUse ? (
                    <p className="character-note" role="note">
                      Private-use code points have no standard name or glyph. Their appearance depends on the font or resource pack.
                    </p>
                  ) : metadata?.isUnassigned ? (
                    <p className="character-note" role="note">
                      {metadata.name === null && (
                        (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
                        (codePoint & 0xfffe) === 0xfffe
                      )
                        ? "Unicode noncharacters are reserved for internal use and are not assigned a standard glyph."
                        : "Unicode 18.0.0 does not assign a character name to this code point."}
                    </p>
                  ) : null}

                  <Divider className="overview-divider" />
                  <Table variant="striped" className="details-table">
                    <table>
                      <caption>Unicode properties and escape sequences</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="ore-table-row-header-column">Property</th>
                          <th scope="col">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metadataRows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row">{row.label}</th>
                            <td>
                              <CopyCell
                                label={row.copyLabel}
                                value={row.value}
                                copiedValue={copiedValue}
                                onCopy={() => void copyValue(row.value, row.copyLabel)}
                              />
                            </td>
                          </tr>
                        ))}
                        {escapes ? (
                          <>
                            {[
                              { label: "JavaScript", copyLabel: "JavaScript escape", value: escapes.javascript },
                              { label: "HTML", copyLabel: "HTML escape", value: escapes.html },
                              { label: "CSS", copyLabel: "CSS escape", value: escapes.css },
                              { label: "UTF-8 bytes", copyLabel: "UTF-8 bytes", value: escapes.utf8 },
                            ].map((item) => (
                              <tr key={item.label}>
                                <th scope="row">{item.label}</th>
                                <td>
                                <CopyCell
                                    label={item.copyLabel}
                                    value={item.value}
                                    copiedValue={copiedValue}
                                    onCopy={() => void copyValue(item.value, item.copyLabel)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </>
                        ) : null}
                      </tbody>
                    </table>
                  </Table>
                </>
              )}
            </section>
          </div>
        </Container>
      </main>

      <footer className="site-footer">
        <Divider className="footer-divider" />
        <p>Unicode 18.0.0 data from the Unicode Consortium.</p>
        <p>Glyph rendering depends on fonts installed on your device or resource pack.</p>
        <p>The lookup is processed in your browser. No code point is sent to an API.</p>
        <nav className="footer-links" aria-label="Project resources">
          <Button href="https://github.com/NhanAZ/glyph-lookup" color="secondary" target="_blank" rel="noreferrer">
            GitHub repository
          </Button>
          <Button href="https://discord.com/invite/j2X83ujT6c" color="secondary" target="_blank" rel="noreferrer">
            Discord community
          </Button>
          <Button href="https://wiki.bedrock.dev/text/fonts.html" color="secondary" target="_blank" rel="noreferrer">
            Minecraft font guide
          </Button>
          <Button href="https://wiki.bedrock.dev/text/custom-emojis" color="secondary" target="_blank" rel="noreferrer">
            Custom emoji guide
          </Button>
        </nav>
        <p>NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</p>
      </footer>

      <p className="visually-hidden" role="status" aria-live="polite">{message}</p>
      <Toast
        open={Boolean(message)}
        duration={2400}
        position="bottom-center"
        variant={messageVariant}
        onOpenChange={(event) => {
          if (!event.detail) setMessage("");
        }}
      >
        {message}
      </Toast>
    </div>
  );
}
