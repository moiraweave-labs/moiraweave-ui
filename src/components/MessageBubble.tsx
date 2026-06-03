import { Activity, Archive, Bot, CircleStop, Cpu, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { AgentMessage } from "../api";
import { isActiveRunStatus } from "../utils";
import { StateBadge } from "./common";

export function MessageBubble({
  message,
  selected,
  onCancel,
  onInspect,
  onRetry
}: {
  message: AgentMessage;
  selected?: boolean;
  onCancel?: (runId: string) => void;
  onInspect?: (message: AgentMessage) => void;
  onRetry?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const canCancel = Boolean(message.run_id) && isActiveRunStatus(message.run_status);
  const selectedClass = selected
    ? isUser
      ? "ring-2 ring-white/30"
      : "ring-2 ring-emerald-500/30"
    : "";
  return (
    <div className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#0e1322] text-emerald-400">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-xl px-4 py-3 text-xs shadow-sm ${
          isUser
            ? "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-medium rounded-tr-none"
            : "border border-slate-800/80 bg-[#0e1322]/80 text-slate-300 rounded-tl-none"
        } ${selectedClass}`}
      >
        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider opacity-60">
          {isUser ? "You" : message.role}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">{message.message}</div>
        {message.run_id && (
          <div className={`mt-3 rounded-lg border px-2.5 py-2 ${isUser ? "border-white/20 bg-white/10" : "border-slate-800 bg-[#090d16]/70"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className={`font-mono text-[10px] font-semibold underline-offset-2 hover:underline ${isUser ? "text-white" : "text-sky-300"}`}
                to={`/runs/${message.run_id}`}
              >
                {message.run_id.slice(0, 8)}
              </Link>
              {message.run_status && <StateBadge state={message.run_status} />}
              {message.artifact_count ? (
                <span className="text-[10px] font-semibold text-slate-300">
                  {message.artifact_count} artifact{message.artifact_count === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            {message.latest_event && (
              <div className={`mt-1 text-[10px] ${isUser ? "text-white/75" : "text-slate-500"}`}>
                {message.latest_event.type}: {message.latest_event.message}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {onInspect && (
                <button
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                    isUser
                      ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                      : "border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60"
                  }`}
                  onClick={() => onInspect(message)}
                  type="button"
                >
                  <Activity className="h-3 w-3" />
                  Inspect
                </button>
              )}
              <Link
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                  isUser
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                    : "border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60"
                }`}
                to={`/artifacts?run_id=${encodeURIComponent(message.run_id)}`}
              >
                <Archive className="h-3 w-3" />
                Artifacts
              </Link>
              {canCancel && onCancel && (
                <button
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                    isUser
                      ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                      : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                  }`}
                  onClick={() => onCancel(message.run_id!)}
                  type="button"
                >
                  <CircleStop className="h-3 w-3" />
                  Cancel
                </button>
              )}
              {isUser && onRetry && (
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/15"
                  onClick={() => onRetry(message.message)}
                  type="button"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          <Cpu className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
