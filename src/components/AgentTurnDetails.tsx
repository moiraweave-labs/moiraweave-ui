import { useQuery } from "@tanstack/react-query";
import { Activity, Archive, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { AgentMessage, Artifact, RunEvent } from "../api";
import { formatDate, isActiveRunStatus } from "../utils";
import { StateBadge } from "./common";
import type { RunStreamStatus } from "./runs";

export type AgentTurnStreamStatus = RunStreamStatus & {
  liveEventCount: number;
};

export function AgentTurnDetails({
  message,
  stream
}: {
  message?: AgentMessage;
  stream?: AgentTurnStreamStatus;
}) {
  const runId = message?.run_id;
  const events = useQuery({
    queryKey: ["events", runId],
    queryFn: () => api.events(runId!),
    enabled: Boolean(runId),
    refetchInterval: isActiveRunStatus(message?.run_status) ? 2500 : false
  });
  const artifacts = useQuery({
    queryKey: ["artifacts", runId],
    queryFn: () => api.artifacts(runId!),
    enabled: Boolean(runId),
    refetchInterval: isActiveRunStatus(message?.run_status) ? 3000 : false
  });

  if (!runId) return null;

  const timeline = mergeTurnEvents(events.data || [], message?.latest_event)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 4);
  const producedArtifacts = artifacts.data || [];

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0e1322]/70 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Turn Details
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="font-mono text-slate-300">{runId.slice(0, 8)}</span>
            {message?.run_status && <StateBadge state={message.run_status} />}
            <span>{formatDate(message?.created_at || "")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
            to={`/runs/${runId}`}
          >
            <Activity className="h-3.5 w-3.5" />
            Run Detail
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
            to={`/artifacts?run_id=${encodeURIComponent(runId)}`}
          >
            <Archive className="h-3.5 w-3.5" />
            Artifact Library
          </Link>
        </div>
      </div>

      {stream && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-xs ${streamTone(
            stream.status
          )}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-100">
              <Radio className="h-3.5 w-3.5" />
              Live Turn Stream
            </span>
            <StateBadge state={stream.status} />
          </div>
          <div className="mt-1">{stream.message}</div>
          <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span>
              {stream.liveEventCount} live event
              {stream.liveEventCount === 1 ? "" : "s"}
            </span>
            {stream.lastEventAt && (
              <span>Last signal: {formatDate(stream.lastEventAt)}</span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Recent Events
          </div>
          <div className="space-y-2">
            {timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-slate-800 bg-[#050811] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-sky-300">
                    {event.type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDate(event.timestamp)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-300">{event.message}</div>
              </div>
            ))}
            {events.isLoading && timeline.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-[#050811] px-3 py-3 text-xs text-slate-500">
                Loading events
              </div>
            )}
            {!events.isLoading && timeline.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-[#050811] px-3 py-3 text-xs text-slate-500">
                No events recorded
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Produced Artifacts
          </div>
          <div className="space-y-2">
            {producedArtifacts.slice(0, 3).map((artifact) => (
              <TurnArtifactLink key={artifact.id} artifact={artifact} />
            ))}
            {artifacts.isLoading && producedArtifacts.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-[#050811] px-3 py-3 text-xs text-slate-500">
                Loading artifacts
              </div>
            )}
            {!artifacts.isLoading && producedArtifacts.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-[#050811] px-3 py-3 text-xs text-slate-500">
                No artifacts recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TurnArtifactLink({ artifact }: { artifact: Artifact }) {
  return (
    <Link
      className="block rounded-lg border border-slate-800 bg-[#050811] px-3 py-2 hover:border-slate-700 hover:bg-slate-900/40"
      to={`/artifacts?run_id=${encodeURIComponent(artifact.run_id)}`}
    >
      <div className="truncate text-xs font-semibold text-slate-200">
        {artifact.name}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
        <span>{artifact.content_type || "unknown"}</span>
        <span>{formatDate(artifact.created_at)}</span>
      </div>
    </Link>
  );
}

function mergeTurnEvents(events: RunEvent[], latestEvent?: RunEvent | null) {
  const merged = new Map<string, RunEvent>();
  events.forEach((event) => merged.set(event.id, event));
  if (latestEvent) merged.set(latestEvent.id, latestEvent);
  return Array.from(merged.values());
}

function streamTone(status: AgentTurnStreamStatus["status"]): string {
  if (status === "degraded") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (status === "live") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  if (status === "connected") return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  return "border-amber-500/20 bg-amber-500/10 text-amber-100";
}
