/** Small validators for agent submissions. Rejections are fed back in-loop. */

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function fail<T>(error: string): Validated<T> {
  return { ok: false, error };
}

export function asRecord(input: unknown): Record<string, unknown> | undefined {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

export function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function asString(value: unknown, max = 4000): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed.slice(0, max);
}

export function asUnitInterval(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric) || numeric < 0 || numeric > 1) return undefined;
  return numeric;
}
