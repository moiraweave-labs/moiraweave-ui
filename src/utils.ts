import type { RunEvent } from "./api";

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function formatError(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // Fall through to the raw message when the API returned plain text.
  }
  return error.message || fallback;
}

export function mergeEvents(stored: RunEvent[], streamed: RunEvent[]): RunEvent[] {
  const events = new Map<string, RunEvent>();
  for (const event of [...stored, ...streamed]) events.set(event.id, event);
  return [...events.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

export function agentAdapter(manifest: Record<string, unknown>): string | null {
  const spec = manifest.spec;
  if (!spec || typeof spec !== "object") return null;
  const agent = (spec as Record<string, unknown>).agent;
  if (!agent || typeof agent !== "object") return null;
  const adapter = (agent as Record<string, unknown>).adapter;
  return typeof adapter === "string" ? adapter : null;
}

export function agentChannels(manifest?: Record<string, unknown>): {
  exposed: string[];
  externalOwned: string[];
} {
  const spec = manifest?.spec;
  if (!spec || typeof spec !== "object") {
    return { exposed: [], externalOwned: [] };
  }
  const agent = (spec as Record<string, unknown>).agent;
  if (!agent || typeof agent !== "object") {
    return { exposed: [], externalOwned: [] };
  }
  const data = agent as Record<string, unknown>;
  return {
    exposed: stringList(data.exposedChannels),
    externalOwned: stringList(data.externalOwnedChannels)
  };
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

export function isServedArtifactUri(uri: string): boolean {
  const normalized = uri.trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized.startsWith("file://") ||
    normalized.startsWith("local://") ||
    normalized.startsWith("artifact://") ||
    normalized.startsWith("artifacts://")
  ) {
    return true;
  }
  return !/^[a-z][a-z0-9+.-]*:/.test(normalized);
}

export function formatBytes(value?: number | null): string {
  if (value === null || value === undefined) return "-";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value / 1024;
  for (const unit of units) {
    if (amount < 1024) return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${unit}`;
    amount /= 1024;
  }
  return `${amount.toFixed(0)} PB`;
}
