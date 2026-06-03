import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Clock,
  Cpu,
  Layers,
  MessageSquare,
  Play,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Artifact, RunEvent, RunStatus } from "../api";
import { formatDate, isActiveRunStatus } from "../utils";
import { Metric, Panel, RowMessage, StateBadge } from "./common";

export type RunMetrics = {
  total: number;
  active: number;
  succeeded: number;
  failed: number;
};

export type RunStreamStatus = {
  status: "connecting" | "connected" | "live" | "degraded";
  message: string;
  lastEventAt?: string | null;
};

export function RunsMetrics({ metrics }: { metrics: RunMetrics }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Runs</span>
          <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/20 text-blue-400">
            <Layers className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.total}</div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</span>
          <div className="rounded-lg bg-sky-500/10 p-2 border border-sky-500/20 text-sky-400">
            <Cpu className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-bold text-slate-100">{metrics.active}</div>
          {metrics.active > 0 && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-ping" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Succeeded</span>
          <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.succeeded}</div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed</span>
          <div className="rounded-lg bg-red-500/10 p-2 border border-red-500/20 text-red-400">
            <XCircle className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.failed}</div>
      </div>
    </div>
  );
}

export function RunsTable({ runs }: { runs: RunStatus[] }) {
  return (
    <Panel title="Runs History">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#0b0f19]/40 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Run ID</th>
              <th className="px-5 py-3.5">Workload</th>
              <th className="px-5 py-3.5">State</th>
              <th className="px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">Last Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {runs.map((run) => (
              <tr key={run.run_id} className="hover:bg-slate-800/10 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs">
                  <Link
                    className="text-steel font-semibold hover:text-sky-300 hover:underline transition-colors"
                    to={`/runs/${run.run_id}`}
                  >
                    {run.run_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-300">{run.workload_name}</td>
                <td className="px-5 py-3.5">
                  <StateBadge state={run.status} />
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(run.created_at)}</td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(run.heartbeat_at)}</td>
              </tr>
            ))}
            {runs.length === 0 && <RowMessage colSpan={5} text="No runs found" />}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function RunSummaryPanel({
  runId,
  current,
  canOperate,
  onCancel
}: {
  runId: string;
  current?: RunStatus;
  canOperate: boolean;
  onCancel: () => void;
}) {
  return (
    <Panel
      title={`Run: ${runId.slice(0, 8)}`}
      action={
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
          onClick={onCancel}
          disabled={!canOperate || !current || ["succeeded", "failed", "canceled", "lost"].includes(current.status)}
        >
          <CircleStop className="h-3.5 w-3.5" />
          Cancel Execution
        </button>
      }
    >
      <div className="grid gap-4 p-5 grid-cols-2 md:grid-cols-4 bg-[#0b0f19]/30">
        <Metric label="State" value={current ? <StateBadge state={current.status} /> : "-"} />
        <Metric label="Workload" value={current ? <span className="font-semibold text-slate-200">{current.workload_name}</span> : "-"} />
        <Metric label="Created" value={<span className="text-xs text-slate-400">{formatDate(current?.created_at)}</span>} />
        <Metric label="Heartbeat" value={<span className="text-xs text-slate-400">{formatDate(current?.heartbeat_at)}</span>} />
      </div>
    </Panel>
  );
}

export function RunDiagnosticsPanel({
  current,
  events,
  artifactCount
}: {
  current?: RunStatus;
  events: RunEvent[];
  artifactCount: number;
}) {
  const latestEvent = events.length > 0 ? events[events.length - 1] : undefined;
  const diagnosis = runDiagnosis(current, latestEvent, artifactCount);

  return (
    <Panel title="Run Diagnostics">
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Lifecycle" value={<StateBadge state={current?.status || "unknown"} />} />
          <Metric label="Latest Event" value={<span className="text-xs text-slate-300">{latestEvent?.type || "-"}</span>} />
          <Metric label="Artifacts" value={<span className="text-xs text-slate-300">{artifactCount}</span>} />
        </div>
        <div className={`rounded-lg border px-3 py-2 text-xs ${diagnosis.tone}`}>
          <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5" />
            {diagnosis.title}
          </div>
          <div>{diagnosis.message}</div>
        </div>
        {latestEvent && (
          <div className="rounded-lg border border-slate-800 bg-[#050811] px-3 py-2 text-xs">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Latest Timeline Signal
            </div>
            <div className="text-slate-300">{latestEvent.message}</div>
            <div className="mt-1 text-[10px] text-slate-500">{formatDate(latestEvent.timestamp)}</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function RunLiveEventsPanel({
  stream,
  storedCount,
  streamedCount
}: {
  stream: RunStreamStatus;
  storedCount: number;
  streamedCount: number;
}) {
  return (
    <Panel title="Live Event Feed">
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Stream" value={<StateBadge state={stream.status} />} />
          <Metric label="Persisted Events" value={<span className="text-xs text-slate-300">{storedCount}</span>} />
          <Metric label="Live Events" value={<span className="text-xs text-slate-300">{streamedCount}</span>} />
        </div>
        <div className={`rounded-lg border px-3 py-2 text-xs ${streamTone(stream.status)}`}>
          <div className="font-semibold text-slate-100">{stream.message}</div>
          {stream.lastEventAt && (
            <div className="mt-1 text-[10px] text-slate-400">
              Last live event: {formatDate(stream.lastEventAt)}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function streamTone(status: RunStreamStatus["status"]): string {
  if (status === "degraded") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (status === "live") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  if (status === "connected") return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  return "border-amber-500/20 bg-amber-500/10 text-amber-100";
}

function runDiagnosis(
  current: RunStatus | undefined,
  latestEvent: RunEvent | undefined,
  artifactCount: number
): { title: string; message: string; tone: string } {
  if (!current) {
    return {
      title: "Loading Run",
      message: "Run state is still loading from the control plane.",
      tone: "border-slate-800 bg-slate-900/40 text-slate-300"
    };
  }
  const latestSignal = latestEvent ? ` Latest event: ${latestEvent.type}.` : "";
  const heartbeat = current.heartbeat_at
    ? ` Last heartbeat: ${formatDate(current.heartbeat_at)}.`
    : "";
  if (current.status === "queued") {
    return {
      title: "Waiting For Worker",
      message: "The run is queued. Check Redis and worker consumers if it stays here longer than expected.",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-100"
    };
  }
  if (["starting", "running"].includes(current.status)) {
    return {
      title: "Runtime Active",
      message: `The run is active and should keep heartbeating while work continues.${heartbeat}${latestSignal}`,
      tone: "border-sky-500/20 bg-sky-500/10 text-sky-100"
    };
  }
  if (current.status === "cancel_requested") {
    return {
      title: "Cancel Requested",
      message: "MoiraWeave has recorded cancellation. The worker or adapter still needs to acknowledge it.",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-100"
    };
  }
  if (current.status === "cancelling") {
    return {
      title: "Cancellation In Progress",
      message: "The adapter is attempting cooperative cancellation. Check runtime logs if this state persists.",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-100"
    };
  }
  if (current.status === "lost") {
    return {
      title: "Run Lost",
      message: "Heartbeat became stale. Check worker health, runtime health, and deployment records before retrying.",
      tone: "border-red-500/20 bg-red-500/10 text-red-200"
    };
  }
  if (current.status === "failed") {
    return {
      title: "Run Failed",
      message: current.error || latestEvent?.message || "Inspect timeline, payload, adapter config, and runtime logs.",
      tone: "border-red-500/20 bg-red-500/10 text-red-200"
    };
  }
  if (current.status === "canceled") {
    return {
      title: "Run Canceled",
      message: "Cancellation completed. Retry the turn from Agent Console when appropriate.",
      tone: "border-slate-700 bg-slate-900/50 text-slate-300"
    };
  }
  return {
    title: "Run Completed",
    message:
      artifactCount > 0
        ? `Run succeeded and produced ${artifactCount} artifact${artifactCount === 1 ? "" : "s"}.`
        : "Run succeeded. Inspect result JSON for the final output.",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
  };
}

export function RunEventTimeline({ events }: { events: RunEvent[] }) {
  return (
    <Panel title="Event Timeline">
      <div className="p-6">
        <div className="relative border-l-2 border-slate-800/80 ml-2.5 space-y-6">
          {events.map((event) => (
            <div key={event.id} className="relative pl-7 group">
              <div className="absolute -left-[14px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-[#070a13] group-hover:border-slate-600 transition-colors">
                {getEventIcon(event.type)}
              </div>

              <div className="grid gap-1 md:grid-cols-[160px_1fr]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">{event.type}</span>
                  <span className="text-[10px] text-slate-500">{formatDate(event.timestamp)}</span>
                </div>
                <div className="space-y-2 rounded-lg border border-slate-800/40 bg-slate-900/20 p-2.5 text-xs text-slate-400">
                  <div>{event.message}</div>
                  {Object.keys(event.data || {}).length > 0 && (
                    <pre className="max-h-28 overflow-auto rounded border border-slate-800 bg-[#050811] p-2 font-mono text-[10px] text-emerald-400/80">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-center py-6 text-sm text-slate-500">No events recorded for this run</div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function RunPayloadPanel({
  payload,
  result,
  error
}: {
  payload?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: unknown;
}) {
  return (
    <Panel title="Payload & Result JSON">
      <div className="p-4 bg-[#050811] rounded-b-xl border-t border-slate-900">
        <pre className="max-h-96 overflow-auto font-mono text-[10px] text-sky-400/90 leading-normal scrollbar-thin">
          {JSON.stringify({ payload: payload || {}, result: result || {}, error }, null, 2)}
        </pre>
      </div>
    </Panel>
  );
}

export function ProducedArtifactsPanel({
  artifacts,
  selectedArtifactId,
  onSelect
}: {
  artifacts: Artifact[];
  selectedArtifactId?: string | null;
  onSelect: (artifactId: string) => void;
}) {
  return (
    <Panel title="Produced Artifacts">
      <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
        {artifacts.map((artifact) => (
          <button
            key={artifact.id}
            className={`block w-full p-4 text-left transition-colors ${
              selectedArtifactId === artifact.id
                ? "bg-emerald-500/5"
                : "hover:bg-slate-800/10"
            }`}
            onClick={() => onSelect(artifact.id)}
          >
            <div className="font-semibold text-xs text-slate-200">{artifact.name}</div>
            <div className="break-all font-mono text-[10px] text-slate-500 mt-1">{artifact.uri}</div>
          </button>
        ))}
        {artifacts.length === 0 && (
          <div className="p-5 text-center text-xs text-slate-500">No artifacts generated</div>
        )}
      </div>
    </Panel>
  );
}

function getEventIcon(type: string) {
  if (type.includes("start") || type.includes("init")) return <Play className="h-3 w-3 text-sky-400" />;
  if (type.includes("error") || type.includes("fail")) return <XCircle className="h-3 w-3 text-red-400" />;
  if (type.includes("success") || type.includes("complete")) return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
  if (type.includes("message")) return <MessageSquare className="h-3 w-3 text-indigo-400" />;
  return <Clock className="h-3 w-3 text-slate-400" />;
}
