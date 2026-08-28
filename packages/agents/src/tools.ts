/**
 * The read-only tool surface agents investigate through.
 *
 * Three constraints are enforced here rather than trusted to the prompt:
 * every path is resolved and confined to the checkout, every read is bounded,
 * and in metadata-only mode the file tools are not offered at all. An agent
 * cannot exfiltrate what it was never able to open.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_LINES = 120;
const MAX_MATCHES = 40;
const MAX_FILES = 200;

export interface ToolContext {
  /** Absolute path of the checkout. Nothing outside it can be read. */
  readonly repoRoot?: string;
  readonly metadataOnly: boolean;
}

export const READ_FILE_TOOL: Anthropic.Tool = {
  name: "read_file",
  description:
    "Read a bounded range of lines from a file in the repository under analysis. Use it to resolve what an algorithm actually is, or whether a code path is reachable. Paths are relative to the repository root.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repository-relative file path." },
      start_line: { type: "integer", description: "First line to read, 1-based." },
      end_line: { type: "integer", description: `Last line to read. At most ${MAX_LINES} lines are returned.` },
    },
    required: ["path"],
    additionalProperties: false,
  },
};

export const SEARCH_TOOL: Anthropic.Tool = {
  name: "search_repository",
  description:
    "Search the repository for a literal string or regular expression and return matching lines with their file and line number. Use it to find callers, configuration values, and other uses of an algorithm.",
  input_schema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regular expression to search for." },
      glob: { type: "string", description: "Optional file glob to restrict the search, e.g. '**/*.java'." },
    },
    required: ["pattern"],
    additionalProperties: false,
  },
};

export const LIST_FILES_TOOL: Anthropic.Tool = {
  name: "list_files",
  description:
    "List files in the repository matching a glob, so you can see how a module is laid out before reading anything.",
  input_schema: {
    type: "object",
    properties: {
      glob: { type: "string", description: "Glob such as 'src/main/**/*.java'." },
    },
    required: ["glob"],
    additionalProperties: false,
  },
};

export function investigationTools(ctx: ToolContext): Anthropic.Tool[] {
  if (ctx.metadataOnly || !ctx.repoRoot) return [];
  return [READ_FILE_TOOL, SEARCH_TOOL, LIST_FILES_TOOL];
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  if (ctx.metadataOnly || !ctx.repoRoot) {
    return "Source access is disabled for this scan (metadata-only mode). Decide from the metadata you were given, and lower your confidence accordingly.";
  }
  switch (name) {
    case "read_file":
      return readBoundedFile(ctx.repoRoot, input);
    case "search_repository":
      return searchRepository(ctx.repoRoot, input);
    case "list_files":
      return listFiles(ctx.repoRoot, input);
    default:
      return `Unknown tool: ${name}`;
  }
}

/** Resolves a caller-supplied path and refuses anything outside the checkout. */
export function safeResolve(root: string, candidate: string): string | undefined {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, candidate);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  return resolved;
}

async function readBoundedFile(root: string, input: Record<string, unknown>): Promise<string> {
  const requested = String(input["path"] ?? "");
  const absolute = safeResolve(root, requested);
  if (!absolute) return `Refused: ${requested} is outside the repository.`;

  let content: string;
  try {
    content = await readFile(absolute, "utf8");
  } catch (error) {
    return `Could not read ${requested}: ${(error as Error).message}`;
  }

  const lines = content.split("\n");
  const start = Math.max(1, Number(input["start_line"] ?? 1));
  const requestedEnd = Number(input["end_line"] ?? start + MAX_LINES - 1);
  const end = Math.min(lines.length, start + MAX_LINES - 1, requestedEnd);
  const body = lines
    .slice(start - 1, end)
    .map((text, index) => `${start + index}: ${text}`)
    .join("\n");

  const truncated = end < lines.length ? `\n… ${lines.length - end} further lines not shown.` : "";
  return `${requested} lines ${start}-${end} of ${lines.length}:\n${body}${truncated}`;
}

async function searchRepository(root: string, input: Record<string, unknown>): Promise<string> {
  const pattern = String(input["pattern"] ?? "");
  let expression: RegExp;
  try {
    expression = new RegExp(pattern, "i");
  } catch (error) {
    return `Invalid regular expression: ${(error as Error).message}`;
  }

  const glob = String(input["glob"] ?? "**/*.{java,kt,xml,properties,yaml,yml,gradle,json,toml,txt}");
  const files = (
    await fg([glob], {
      cwd: root,
      ignore: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/build/**"],
      suppressErrors: true,
    })
  )
    .sort()
    .slice(0, MAX_FILES);

  const matches: string[] = [];
  for (const relative of files) {
    if (matches.length >= MAX_MATCHES) break;
    const absolute = safeResolve(root, relative);
    if (!absolute) continue;
    let content: string;
    try {
      content = await readFile(absolute, "utf8");
    } catch {
      continue;
    }
    content.split("\n").forEach((text, index) => {
      if (matches.length >= MAX_MATCHES) return;
      if (expression.test(text)) matches.push(`${relative}:${index + 1}: ${text.trim().slice(0, 200)}`);
    });
  }

  if (matches.length === 0) return `No matches for /${pattern}/ in ${files.length} files.`;
  return `${matches.length} match(es) for /${pattern}/:\n${matches.join("\n")}`;
}

async function listFiles(root: string, input: Record<string, unknown>): Promise<string> {
  const glob = String(input["glob"] ?? "**/*");
  const files = (
    await fg([glob], {
      cwd: root,
      ignore: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/build/**"],
      onlyFiles: true,
      suppressErrors: true,
    })
  ).sort();
  const shown = files.slice(0, MAX_FILES);
  const more = files.length > shown.length ? `\n… and ${files.length - shown.length} more.` : "";
  return shown.length === 0 ? `No files match ${glob}.` : `${shown.join("\n")}${more}`;
}
