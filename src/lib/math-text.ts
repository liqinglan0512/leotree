// Parses $...$ (inline) and $$...$$ (display) math delimiters inside plain text.
// Kept framework-free so it can be unit tested and reused anywhere.

export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; tex: string }
  | { kind: "display"; tex: string };

function isWs(ch: string | undefined) {
  return ch === " " || ch === "\t";
}

export function parseMathSegments(input: string): MathSegment[] {
  const text = input ?? "";
  const out: MathSegment[] = [];
  let buf = "";
  let i = 0;
  const flushText = () => {
    if (buf) {
      out.push({ kind: "text", value: buf });
      buf = "";
    }
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && text[i + 1] === "$") {
      // escaped dollar — literal $
      buf += "$";
      i += 2;
      continue;
    }
    if (ch !== "$") {
      buf += ch;
      i += 1;
      continue;
    }
    // $$ display block: allow newlines, require a closing $$
    if (text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      const tex = end === -1 ? "" : text.slice(i + 2, end);
      if (end !== -1 && tex.trim()) {
        flushText();
        out.push({ kind: "display", tex: tex.trim() });
        i = end + 2;
        continue;
      }
      // unterminated or empty — treat both dollars literally
      buf += "$$";
      i += 2;
      continue;
    }
    // $ inline: same line only; inner edges must not be whitespace (pandoc rule,
    // keeps currency sentences like "花了 $5 和 $6" out of the renderer)
    const nl = text.indexOf("\n", i + 1);
    const end = text.indexOf("$", i + 1);
    const lineEnd = nl === -1 ? text.length : nl;
    if (end !== -1 && end < lineEnd) {
      const raw = text.slice(i + 1, end);
      if (raw.trim() && !isWs(raw[0]) && !isWs(raw[raw.length - 1])) {
        flushText();
        out.push({ kind: "inline", tex: raw });
        i = end + 1;
        continue;
      }
    }
    // not a formula — literal dollar
    buf += "$";
    i += 1;
  }
  flushText();
  return out;
}

export function hasMath(input: string): boolean {
  const text = input ?? "";
  if (!text.includes("$")) return false;
  return parseMathSegments(text).some((s) => s.kind !== "text");
}
