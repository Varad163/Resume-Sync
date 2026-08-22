/**
 * A small, total Java tokenizer.
 *
 * We deliberately do not use a full Java parser. A parser refuses files that
 * use syntax it does not know, and a scanner that silently skips files is worse
 * than useless in a security product — a missed file is a missed RSA key. This
 * tokenizer understands only what the crypto rules need (identifiers, string
 * literals, numbers, punctuation) and degrades to "unknown token" rather than
 * throwing, so every file yields a stream and every line is accounted for.
 */

export type TokenKind =
  | "identifier"
  | "keyword"
  | "string"
  | "char"
  | "number"
  | "punct"
  | "unknown";

export interface Token {
  readonly kind: TokenKind;
  /** Source text, with quotes stripped for `string` and `char`. */
  readonly value: string;
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

const KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
  "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
  "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
  "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
  "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void",
  "volatile", "while", "record", "sealed", "permits", "var", "yield",
]);

const isIdentStart = (c: string): boolean => /[A-Za-z_$]/.test(c);
const isIdentPart = (c: string): boolean => /[A-Za-z0-9_$]/.test(c);
const isDigit = (c: string): boolean => c >= "0" && c <= "9";

export function tokenizeJava(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const n = source.length;

  const push = (kind: TokenKind, value: string, startOffset: number, startLine: number, startLineBegin: number) => {
    tokens.push({
      kind,
      value,
      line: startLine,
      column: startOffset - startLineBegin + 1,
      offset: startOffset,
    });
  };

  const advanceNewlines = (text: string) => {
    for (let k = 0; k < text.length; k++) {
      if (text[k] === "\n") {
        line++;
        lineStart = i + k + 1;
      }
    }
  };

  while (i < n) {
    const c = source[i]!;

    // ------------------------------------------------------------ whitespace
    if (c === "\n") {
      line++;
      i++;
      lineStart = i;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "\f") {
      i++;
      continue;
    }

    // -------------------------------------------------------------- comments
    if (c === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      i = end === -1 ? n : end;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      advanceNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }

    const startOffset = i;
    const startLine = line;
    const startLineBegin = lineStart;

    // --------------------------------------------------------- text blocks
    if (c === '"' && source.startsWith('"""', i)) {
      const end = source.indexOf('"""', i + 3);
      const stop = end === -1 ? n : end + 3;
      const raw = source.slice(i + 3, end === -1 ? n : end);
      advanceNewlines(source.slice(i, stop));
      i = stop;
      push("string", raw, startOffset, startLine, startLineBegin);
      continue;
    }

    // ------------------------------------------------------ string literals
    if (c === '"') {
      i++;
      let value = "";
      while (i < n) {
        const ch = source[i]!;
        if (ch === "\\") {
          value += unescape(source, i);
          i += escapeLength(source, i);
          continue;
        }
        if (ch === '"' || ch === "\n") break;
        value += ch;
        i++;
      }
      if (source[i] === '"') i++;
      push("string", value, startOffset, startLine, startLineBegin);
      continue;
    }

    // -------------------------------------------------------- char literals
    if (c === "'") {
      i++;
      let value = "";
      while (i < n && source[i] !== "'" && source[i] !== "\n") {
        if (source[i] === "\\") {
          value += unescape(source, i);
          i += escapeLength(source, i);
          continue;
        }
        value += source[i];
        i++;
      }
      if (source[i] === "'") i++;
      push("char", value, startOffset, startLine, startLineBegin);
      continue;
    }

    // -------------------------------------------------------------- numbers
    if (isDigit(c) || (c === "." && isDigit(source[i + 1] ?? ""))) {
      let value = "";
      while (i < n && /[0-9a-fA-FxXbBoO._+-]/.test(source[i]!)) {
        // A '+'/'-' only continues a number inside an exponent.
        const ch = source[i]!;
        if ((ch === "+" || ch === "-") && !/[eE]$/.test(value)) break;
        if (ch === "." && !/^[0-9_]*$/.test(value)) break;
        value += ch;
        i++;
      }
      while (i < n && /[lLfFdD]/.test(source[i]!)) {
        value += source[i];
        i++;
      }
      push("number", value, startOffset, startLine, startLineBegin);
      continue;
    }

    // ---------------------------------------------------------- identifiers
    if (isIdentStart(c)) {
      let value = "";
      while (i < n && isIdentPart(source[i]!)) {
        value += source[i];
        i++;
      }
      push(KEYWORDS.has(value) ? "keyword" : "identifier", value, startOffset, startLine, startLineBegin);
      continue;
    }

    // -------------------------------------------------------- punctuation
    if (/[(){}[\];,.@<>=+\-*/%!&|^~?:]/.test(c)) {
      i++;
      push("punct", c, startOffset, startLine, startLineBegin);
      continue;
    }

    i++;
    push("unknown", c, startOffset, startLine, startLineBegin);
  }

  return tokens;
}

function escapeLength(source: string, at: number): number {
  const next = source[at + 1];
  if (next === "u") {
    let k = at + 2;
    while (source[k] === "u") k++;
    return k + 4 - at;
  }
  return 2;
}

function unescape(source: string, at: number): string {
  const next = source[at + 1];
  switch (next) {
    case "n":
      return "\n";
    case "t":
      return "\t";
    case "r":
      return "\r";
    case "0":
      return "\0";
    case "\\":
      return "\\";
    case '"':
      return '"';
    case "'":
      return "'";
    case "u": {
      let k = at + 2;
      while (source[k] === "u") k++;
      const hex = source.slice(k, k + 4);
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? "" : String.fromCharCode(code);
    }
    default:
      return next ?? "";
  }
}
