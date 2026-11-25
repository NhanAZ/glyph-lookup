import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, CopyButton, Icon, SegmentedControl, Surface } from "./components/ui";
import type { InputMode } from "./lib/unicode";
import { codePointFromUrl, formatCodePoint, formatDecimal, getEscapes, parseLookupInput, toUnicodeCharacter } from "./lib/unicode";
import type { UnicodeMetadata } from "./lib/metadata";
import { getUnicodeMetadata } from "./lib/metadata";

const INPUT_OPTIONS = [
  { value: "hex", label: "Hex" },
  { value: "decimal", label: "Decimal" },
  { value: "character", label: "Character" },
] as const;

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

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setMessage(label + " copied to the clipboard.");
      window.setTimeout(() => setCopiedValue(""), 1600);
    } catch {
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

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to lookup</a>

      <header className="site-header">
        <a className="wordmark" href="./" aria-label="Unicode Lookup home">
          <span className="wordmark-icon" aria-hidden="true">U+</span>
          <span>Unicode Lookup</span>
        </a>
        <a
          className="header-link"
          href="https://wiki.bedrock.dev/text/fonts.html"
          target="_blank"
          rel="noreferrer"
        >
          Bedrock Wiki fonts
          <Icon name="arrow" size={15} />
        </a>
      </header>

      <main id="main" className="main-content">
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow"><span className="eyebrow-mark" />Unicode 18.0 reference</p>
            <h1 id="page-title">Look up any Unicode code point.</h1>
            <p className="intro-description">
              Search by hexadecimal value, decimal value, or character. Copy its name,
              metadata, and escape sequences in one place.
            </p>
          </div>
          <div className="coverage-note" aria-label="Unicode code point coverage">
            <div className="coverage-heading">
              <Icon name="spark" size={17} />
              <span>Across every plane</span>
            </div>
            <div className="coverage-values">
              <span>0000</span>
              <span className="coverage-line" aria-hidden="true" />
              <span>10FFFF</span>
            </div>
            <p>Private Use Areas included</p>
          </div>
        </section>

        <Surface className="search-panel">
          <div className="search-panel-heading">
            <div>
              <h2>Find a character</h2>
              <p>Enter one value to see its Unicode details.</p>
            </div>
            <span className="local-badge"><span />Runs in your browser</span>
          </div>

          <form className="lookup-form" onSubmit={handleLookup} noValidate>
            <SegmentedControl
              label="Lookup input type"
              value={mode}
              options={INPUT_OPTIONS}
              onChange={handleModeChange}
            />
            <label className="field-label" htmlFor="lookup-input">
              {mode === "hex" ? "Hexadecimal code point" : mode === "decimal" ? "Decimal code point" : "Unicode character"}
            </label>
            <div className="lookup-row">
              <div className="input-wrap">
                <Icon name={mode === "character" ? "spark" : "search"} size={20} />
                <input
                  id="lookup-input"
                  name="lookup"
                  type="text"
                  inputMode={mode === "decimal" ? "numeric" : mode === "hex" ? "text" : "text"}
                  autoComplete="off"
                  autoCapitalize={mode === "hex" ? "characters" : "off"}
                  spellCheck={false}
                  value={query}
                  placeholder={getPlaceholder(mode)}
                  aria-invalid={inputError ? "true" : undefined}
                  aria-describedby={inputError ? "input-error" : "lookup-hint"}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" icon="search" className="lookup-button">
                Look up
              </Button>
            </div>
            {inputError ? (
              <p className="field-message field-error" id="input-error" role="alert">{inputError}</p>
            ) : (
              <p className="field-message" id="lookup-hint">
                Hex accepts U+ and 0x prefixes. Character mode accepts one code point.
              </p>
            )}
          </form>

          <div className="quick-tries" aria-label="Example code points">
            <span>Try</span>
            {[
              { label: "A", value: 0x41 },
              { label: "★", value: 0x2605 },
              { label: "E300", value: 0xe300 },
            ].map((sample) => (
              <button
                className="quick-try"
                type="button"
                key={sample.value}
                onClick={() => {
                  setMode("hex");
                  setQuery(sample.value.toString(16).toUpperCase());
                  setCodePoint(sample.value);
                  setInputError("");
                  const nextUrl = new URL(window.location.href);
                  nextUrl.searchParams.set("code", sample.value.toString(16).toUpperCase());
                  window.history.replaceState({}, "", nextUrl);
                }}
                aria-label={"Look up " + formatCodePoint(sample.value)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </Surface>

        <section className="result-section" aria-labelledby="result-heading" aria-live="polite">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow-light">Character details</p>
              <h2 id="result-heading">Your lookup</h2>
            </div>
            {codePoint !== null ? (
              <Button variant="quiet" icon="share" onClick={copyShareLink}>
                Copy share link
              </Button>
            ) : null}
          </div>

          {codePoint === null ? (
            <div className="empty-state">
              <div className="empty-mark" aria-hidden="true">?</div>
              <p>Enter a valid code point to see its details.</p>
            </div>
          ) : (
            <>
              <Surface className="identity-panel">
                <div
                  className="glyph-preview"
                  role="img"
                  aria-label={metadata ? "Preview of " + displayName(metadata) : "Unicode glyph preview"}
                >
                  {metadata && shouldShowGlyph(metadata) ? character : <span className="glyph-placeholder">Aa</span>}
                </div>
                <div className="identity-copy">
                  <p className="identity-kicker">{metadata ? metadata.categoryName : isBusy ? "Loading Unicode metadata" : "Unicode character"}</p>
                  <h3>{metadata ? displayName(metadata) : isBusy ? "Looking up character" : metadataError || "Character details"}</h3>
                  <p className="identity-block">
                    {metadata?.block ?? (metadata ? "No Unicode block assigned" : "Unicode 18.0.0")}
                  </p>
                </div>
                <div className="identity-code">
                  <span>Code point</span>
                  <code>{formatCodePoint(codePoint)}</code>
                  <CopyButton
                    label="code point"
                    copied={copiedValue === formatCodePoint(codePoint)}
                    onClick={() => void copyValue(formatCodePoint(codePoint), "Code point")}
                  />
                </div>
              </Surface>

              {metadata?.isPrivateUse ? (
                <p className="notice notice-pua">
                  Private Use Area characters have no standard name or glyph. Their appearance depends on the font or resource pack.
                </p>
              ) : metadata?.isUnassigned ? (
                <p className="notice">
                  {metadata.name === null && ((codePoint >= 0xfdd0 && codePoint <= 0xfdef) || (codePoint & 0xfffe) === 0xfffe)
                    ? "Unicode noncharacters are reserved for internal use and are not assigned a standard glyph."
                    : "Unicode 18.0.0 does not assign a character name to this code point."}
                </p>
              ) : null}

              <div className="metadata-grid">
                <Surface className="metadata-item">
                  <span className="metadata-label">Decimal</span>
                  <div className="metadata-value-row">
                    <code>{formatDecimal(codePoint)}</code>
                    <CopyButton
                      label="decimal value"
                      copied={copiedValue === String(codePoint)}
                      onClick={() => void copyValue(String(codePoint), "Decimal value")}
                    />
                  </div>
                </Surface>
                <Surface className="metadata-item">
                  <span className="metadata-label">General category</span>
                  <div className="metadata-value-row">
                    <span>{metadata ? metadata.category + " · " + metadata.categoryName : isBusy ? "Loading" : "Unavailable"}</span>
                    {metadata ? <CopyButton
                      label="general category"
                      copied={copiedValue === metadata.category}
                      onClick={() => void copyValue(metadata.category, "General category")}
                    /> : null}
                  </div>
                </Surface>
                <Surface className="metadata-item">
                  <span className="metadata-label">Unicode version</span>
                  <div className="metadata-value-row">
                    <span>{metadata?.version ?? "18.0.0"}</span>
                  </div>
                </Surface>
              </div>

              <Surface className="escape-panel">
                <div className="escape-heading">
                  <div>
                    <h3>Copy-ready values</h3>
                    <p>Use the escape format your code or document needs.</p>
                  </div>
                  <Button
                    variant="quiet"
                    icon="copy"
                    onClick={() => void copyValue(character, "Character")}
                  >
                    Copy character
                  </Button>
                </div>
                {escapes ? (
                  <div className="escape-grid">
                    {[
                      { label: "JavaScript", value: escapes.javascript },
                      { label: "HTML", value: escapes.html },
                      { label: "CSS", value: escapes.css },
                      { label: "UTF-8 bytes", value: escapes.utf8 },
                    ].map((item) => (
                      <div className="escape-item" key={item.label}>
                        <span className="metadata-label">{item.label}</span>
                        <div className="metadata-value-row">
                          <code>{item.value}</code>
                          <CopyButton
                            label={item.label + " escape"}
                            copied={copiedValue === item.value}
                            onClick={() => void copyValue(item.value, item.label)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Surface>
            </>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>Unicode 18.0.0 data from the Unicode Consortium.</p>
        <p>Glyph rendering depends on fonts installed on your device.</p>
      </footer>

      <div className="visually-hidden" role="status" aria-live="polite">{message}</div>
      <span className="visually-hidden">The lookup is processed in your browser. No code point is sent to an API.</span>
    </div>
  );
}
