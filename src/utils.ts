import type { RunEvent } from "./api";

const ACTIVE_RUN_STATES = new Set([
  "queued",
  "starting",
  "running",
  "cancel_requested",
  "cancelling"
]);

const ATTENTION_RUN_STATES = new Set(["failed", "lost", "canceled"]);

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
  return [...events.values()].sort((a, b) => {
    const timestampDiff = eventTimestamp(a) - eventTimestamp(b);
    if (timestampDiff !== 0) return timestampDiff;
    return a.id.localeCompare(b.id);
  });
}

function eventTimestamp(event: RunEvent): number {
  const timestamp = Date.parse(event.timestamp);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function isActiveRunStatus(status?: string | null): boolean {
  return Boolean(status && ACTIVE_RUN_STATES.has(status));
}

export function isAttentionRunStatus(status?: string | null): boolean {
  return Boolean(status && ATTENTION_RUN_STATES.has(status));
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

export type AgentRuntimeSummary = {
  toolOwnership: string;
  boundaryLabels: string[];
  fields: Array<{ label: string; value: string }>;
  capabilities: Array<{ label: string; enabled: boolean }>;
};

export function agentRuntimeSummary(
  manifest?: Record<string, unknown>
): AgentRuntimeSummary {
  const spec = objectValue(manifest?.spec);
  const agent = objectValue(spec.agent);
  const requirements = objectValue(agent.runtimeRequirements);
  const filesystem = objectValue(requirements.filesystem);
  const network = objectValue(requirements.network);
  const webSearch = objectValue(requirements.webSearch);
  const browser = objectValue(requirements.browser);
  const terminal = objectValue(requirements.terminal);
  const mcp = objectValue(requirements.mcp);
  const messaging = objectValue(requirements.messaging);

  const toolOwnership =
    typeof agent.toolOwnership === "string" ? agent.toolOwnership : "runtime";
  const networkEgress =
    typeof network.egress === "string" ? network.egress : "restricted";
  const workspaceMount =
    typeof filesystem.workspaceMount === "string"
      ? filesystem.workspaceMount
      : typeof agent.workspaceMount === "string"
        ? agent.workspaceMount
        : "";
  const browserMode = typeof browser.mode === "string" ? browser.mode : "none";
  const terminalMode =
    typeof terminal.mode === "string" ? terminal.mode : "none";
  const terminalApproval =
    typeof terminal.approval === "string" ? terminal.approval : "runtime";
  const persistentWorkspace = filesystem.persistentWorkspace === true;
  const boundaryLabels = [
    networkEgress ? `egress:${networkEgress}` : "",
    persistentWorkspace ? "workspace:persistent" : "",
    webSearch.enabled === true ? "web-search" : "",
    browserMode !== "none" ? `browser:${browserMode}` : "",
    terminalMode !== "none" ? `terminal:${terminalMode}` : "",
    mcp.enabled === true ? "mcp" : "",
    messaging.enabled === true ? "messaging" : ""
  ].filter(Boolean);

  return {
    toolOwnership,
    boundaryLabels,
    fields: [
      { label: "Tool Owner", value: toolOwnership },
      { label: "Network", value: networkEgress },
      {
        label: "Workspace",
        value: persistentWorkspace
          ? `persistent${workspaceMount ? ` at ${workspaceMount}` : ""}`
          : "ephemeral"
      },
      { label: "Browser", value: browserMode },
      {
        label: "Terminal",
        value:
          terminalMode === "none"
            ? "none"
            : `${terminalMode} approval:${terminalApproval}`
      }
    ],
    capabilities: [
      { label: "Web Search", enabled: webSearch.enabled === true },
      { label: "MCP", enabled: mcp.enabled === true },
      { label: "Messaging", enabled: messaging.enabled === true }
    ]
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

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
