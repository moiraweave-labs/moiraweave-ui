import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Archive, Bot, MessageSquare, Play, Plus, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, streamRunEvents } from "../api";
import type { AgentMessage, AgentSession, RunEvent } from "../api";
import { useAuthProfile } from "../auth";
import { ChannelPills, Panel, PermissionNotice, StateBadge } from "../components/common";
import { MessageBubble } from "../components/MessageBubble";
import {
  agentChannels,
  formatDate,
  isActiveRunStatus,
  isAttentionRunStatus
} from "../utils";

type HistoryFilter = "all" | "active" | "attention" | "artifacts";

export function AgentConsole() {
  const { canOperate } = useAuthProfile();
  const workloads = useQuery({ queryKey: ["workloads"], queryFn: api.workloads });
  const agents = useMemo(
    () => (workloads.data || []).filter((item) => item.type === "agent-service"),
    [workloads.data]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedAgent = searchParams.get("agent") || "";
  const [agent, setAgent] = useState(() => requestedAgent);
  const [selected, setSelected] = useState<AgentSession | null>(null);
  const [message, setMessage] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [streamedEvents, setStreamedEvents] = useState<Record<string, RunEvent>>({});
  const queryClient = useQueryClient();
  const selectedAgent = useMemo(
    () => agents.find((item) => item.name === agent),
    [agent, agents]
  );
  const requestedAgentKnown = Boolean(
    requestedAgent && agents.some((item) => item.name === requestedAgent)
  );
  const channels = useMemo(
    () => agentChannels(selectedAgent?.manifest),
    [selectedAgent]
  );

  const sessions = useQuery({
    queryKey: ["sessions", agent],
    queryFn: () => api.sessions(agent),
    enabled: Boolean(agent),
    refetchInterval: 5000
  });

  useEffect(() => {
    if (requestedAgentKnown && agent !== requestedAgent) {
      setAgent(requestedAgent);
      setSelected(null);
    }
  }, [agent, requestedAgent, requestedAgentKnown]);

  useEffect(() => {
    if (!agent && agents.length > 0 && !requestedAgentKnown) {
      const firstAgent = agents[0].name;
      setSearchParams({ agent: firstAgent }, { replace: true });
      setAgent(agents[0].name);
    }
  }, [agent, agents, requestedAgentKnown, setSearchParams]);

  useEffect(() => {
    if (!selected && sessions.data && sessions.data.length > 0) {
      setSelected(sessions.data[0]);
    }
  }, [selected, sessions.data]);

  const history = useQuery({
    queryKey: ["history", agent, selected?.session_id],
    queryFn: () => api.history(agent, selected!.session_id),
    enabled: Boolean(agent && selected),
    refetchInterval: 2500
  });
  const historyItems = useMemo(
    () =>
      (history.data || []).map((item) => {
        if (!item.run_id || !streamedEvents[item.run_id]) return item;
        return { ...item, latest_event: streamedEvents[item.run_id] };
      }),
    [history.data, streamedEvents]
  );
  const activeRunIds = useMemo(
    () =>
      Array.from(
        new Set(
          historyItems
            .filter((item) => item.run_id && isActiveRunStatus(item.run_status))
            .map((item) => item.run_id as string)
        )
      ),
    [historyItems]
  );
  const activeRunKey = activeRunIds.join("|");
  const filteredHistory = useMemo(
    () =>
      historyItems.filter((item) => {
        if (historyFilter === "active") return isActiveRunStatus(item.run_status);
        if (historyFilter === "attention") return isAttentionRunStatus(item.run_status);
        if (historyFilter === "artifacts") return Boolean(item.artifact_count);
        return true;
      }),
    [historyFilter, historyItems]
  );
  const latestRunMessage = useMemo(
    () => [...historyItems].reverse().find((item) => item.run_id),
    [historyItems]
  );
  const activeRunCount = useMemo(
    () => historyItems.filter((item) => isActiveRunStatus(item.run_status)).length,
    [historyItems]
  );

  useEffect(() => {
    const runIds = activeRunKey ? activeRunKey.split("|") : [];
    if (!runIds.length || !agent || !selected?.session_id) return;
    const controllers = runIds.map((runId) =>
      streamRunEvents(
        runId,
        (event) => {
          setStreamedEvents((current) => ({ ...current, [runId]: event }));
          queryClient.invalidateQueries({
            queryKey: ["history", agent, selected.session_id]
          });
          queryClient.invalidateQueries({ queryKey: ["runs"] });
        },
        () => undefined
      )
    );
    return () => controllers.forEach((controller) => controller.abort());
  }, [activeRunKey, agent, queryClient, selected?.session_id]);
  const create = useMutation({
    mutationFn: () => api.createSession(agent),
    onSuccess: (session) => {
      setSelected(session);
      queryClient.invalidateQueries({ queryKey: ["sessions", agent] });
    }
  });
  const send = useMutation({
    mutationFn: () => api.message(agent, selected!.session_id, message),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["history", agent, selected?.session_id] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    }
  });
  const retry = useMutation({
    mutationFn: (text: string) => api.message(agent, selected!.session_id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history", agent, selected?.session_id] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    }
  });
  const cancelRun = useMutation({
    mutationFn: (runId: string) => api.cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history", agent, selected?.session_id] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canOperate && selected && message.trim()) send.mutate();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Panel
        title="Agent Sessions"
        action={
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
            onClick={() => create.mutate()}
            disabled={!canOperate || !agent}
          >
            <Play className="h-3 w-3" />
            New Session
          </button>
        }
      >
        <div className="space-y-4 p-4">
          {!canOperate && (
            <PermissionNotice minimumRole="operator" action="Creating sessions and messaging agents" />
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Agent</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 focus:border-slate-700 outline-none"
              value={agent}
              onChange={(event) => {
                const nextAgent = event.target.value;
                setAgent(nextAgent);
                setSelected(null);
                setSearchParams(nextAgent ? { agent: nextAgent } : {}, { replace: true });
              }}
            >
              <option value="">Select agent...</option>
              {agents.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {(sessions.data || []).map((session) => (
              <button
                key={session.session_id}
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-left transition-all ${
                  selected?.session_id === session.session_id
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                    : "border-slate-800/80 bg-[#0e1322]/20 text-slate-300 hover:bg-slate-800/30"
                }`}
                onClick={() => setSelected(session)}
              >
                <div className="flex justify-between items-center">
                  <span className="block font-mono text-xs font-semibold">{session.session_id.slice(0, 8)}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{formatDate(session.created_at).split(",")[1]?.trim() || "-"}</span>
                </div>
                <span className="block text-[10px] text-slate-500 mt-0.5">{formatDate(session.created_at).split(",")[0]}</span>
              </button>
            ))}
            {sessions.data && sessions.data.length === 0 && agent && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-[#090d16]/40 p-4 text-center">
                <div className="text-xs font-semibold text-slate-300">No sessions yet</div>
                <button
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  onClick={() => create.mutate()}
                  disabled={!canOperate || create.isPending}
                >
                  <Play className="h-3 w-3" />
                  Start session
                </button>
              </div>
            )}
            {!agent && (
              <div className="text-center py-6 text-xs text-slate-500">Choose an agent workload</div>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Channels</span>
            <div className="rounded-lg border border-slate-800 bg-[#090d16]/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">MoiraWeave</span>
                <span className="text-[10px] text-slate-500">API Gateway</span>
              </div>
              <ChannelPills channels={channels.exposed} empty="No declared channels" tone="emerald" />
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#090d16]/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Runtime-Owned</span>
                <span className="text-[10px] text-slate-500">External</span>
              </div>
              <ChannelPills channels={channels.externalOwned} empty="None" tone="amber" />
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title={selected ? `Chat Session: ${selected.session_id.slice(0, 8)}` : "Chat Workspace"}
        action={
          <select
            className="rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 outline-none focus:border-slate-700 disabled:opacity-50"
            disabled={!selected || historyItems.length === 0}
            onChange={(event) => setHistoryFilter(event.target.value as HistoryFilter)}
            value={historyFilter}
          >
            <option value="all">All messages</option>
            <option value="active">Active runs</option>
            <option value="attention">Needs attention</option>
            <option value="artifacts">With artifacts</option>
          </select>
        }
      >
        <div className="flex min-h-[500px] flex-col bg-[#0b0f19]/25 rounded-b-xl border-t border-slate-900">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[460px]">
            <AgentRunSummary message={latestRunMessage} activeRunCount={activeRunCount} />
            {filteredHistory.map((item) => (
              <MessageBubble
                key={item.message_id}
                message={item}
                onCancel={canOperate ? (runId) => cancelRun.mutate(runId) : undefined}
                onRetry={canOperate ? (text) => retry.mutate(text) : undefined}
              />
            ))}
            {!selected && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-500">
                <Bot className="h-10 w-10 text-slate-700 mb-2 animate-bounce" />
                <p className="text-sm font-semibold">Ready for Conversation</p>
                <p className="text-xs text-slate-600 max-w-xs mt-1">
                  {agent
                    ? "Start a session and the chat input will be ready immediately."
                    : "Create or select an agent workload to start chatting."}
                </p>
                <div className="mt-4">
                  {agent ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      onClick={() => create.mutate()}
                      disabled={!canOperate || create.isPending}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start session
                    </button>
                  ) : (
                    <Link
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                      to="/"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create agent workload
                    </Link>
                  )}
                </div>
              </div>
            )}
            {selected && (history.data || []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                <MessageSquare className="h-8 w-8 text-slate-800 mb-1.5" />
                <p className="text-xs font-medium">Session initialized. Send a message to get started.</p>
              </div>
            )}
            {selected && historyItems.length > 0 && filteredHistory.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-[#090d16]/40 p-6 text-center text-xs text-slate-500">
                No messages match this filter.
              </div>
            )}
          </div>

          <form className="flex gap-3 border-t border-slate-800/80 bg-[#0e1322]/40 p-4" onSubmit={submit}>
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-[#090d16] px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-slate-700 transition-colors"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={selected ? `Message ${agent}...` : "Select a session"}
              disabled={!canOperate || !selected}
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-lg shadow-emerald-500/5 shrink-0"
              disabled={!canOperate || !selected || !message.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </Panel>
    </div>
  );
}

function AgentRunSummary({
  message,
  activeRunCount
}: {
  message?: AgentMessage;
  activeRunCount: number;
}) {
  if (!message?.run_id) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0e1322]/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Run Activity
            </span>
            {activeRunCount > 0 && (
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                {activeRunCount} active
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-mono text-xs font-semibold text-sky-300 underline-offset-2 hover:underline"
              to={`/runs/${message.run_id}`}
            >
              {message.run_id.slice(0, 8)}
            </Link>
            {message.run_status && <StateBadge state={message.run_status} />}
            <span className="text-[11px] text-slate-500">
              {formatDate(message.latest_event?.timestamp || message.created_at)}
            </span>
          </div>
          {message.latest_event && (
            <p className="mt-2 text-xs text-slate-400">
              {message.latest_event.type}: {message.latest_event.message}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
            to={`/runs/${message.run_id}`}
          >
            <Activity className="h-3.5 w-3.5" />
            Open Run
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
            to={`/artifacts?run_id=${encodeURIComponent(message.run_id)}`}
          >
            <Archive className="h-3.5 w-3.5" />
            Artifacts
            {message.artifact_count ? ` (${message.artifact_count})` : ""}
          </Link>
        </div>
      </div>
    </div>
  );
}
