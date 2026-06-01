import {
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
import { formatDate } from "../utils";
import { Metric, Panel, RowMessage, StateBadge } from "./common";

export type RunMetrics = {
  total: number;
  active: number;
  succeeded: number;
  failed: number;
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
                <div className="text-xs text-slate-400 bg-slate-900/20 rounded-lg p-2.5 border border-slate-800/40">
                  {event.message}
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
