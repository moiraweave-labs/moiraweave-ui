import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../api";
import { formatError } from "../utils";

export function Panel(props: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0e1322]/50 backdrop-blur-md overflow-hidden shadow-card hover:border-slate-800 transition-all duration-300">
      <div className="flex min-h-12 items-center justify-between border-b border-slate-800/70 bg-[#0b0f19]/60 px-5 py-2.5">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">{props.title}</h2>
        {props.action}
      </div>
      <div>{props.children}</div>
    </section>
  );
}

export function PermissionNotice({
  minimumRole,
  action
}: {
  minimumRole: "operator" | "admin";
  action: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
      <ShieldCheck className="h-4 w-4 shrink-0" />
      <span>
        {action} requires the <span className="font-bold">{minimumRole}</span> role.
      </span>
    </div>
  );
}

export function ErrorMessage({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
      {formatError(error, fallback)}
    </div>
  );
}

export function StateBadge({ state }: { state: string }) {
  const badgeStyle = {
    succeeded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    running: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    starting: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    queued: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    passed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    created: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    not_checked: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    missing: "bg-red-500/10 text-red-400 border-red-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    degraded: "bg-red-500/10 text-red-400 border-red-500/20",
    unavailable: "bg-red-500/10 text-red-400 border-red-500/20",
    canceled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    cancelling: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    cancel_requested: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    lost: "bg-red-500/10 text-red-400 border-red-500/20"
  }[state] || "bg-slate-500/10 text-slate-400 border-slate-500/20";

  const isPulse = ["running", "starting"].includes(state);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${badgeStyle}`}>
      {isPulse && <span className="status-dot status-dot-pulse bg-sky-400" />}
      {state}
    </span>
  );
}

export function WorkloadHealthBadge({ name }: { name: string }) {
  const health = useQuery({
    queryKey: ["workload-health", name],
    queryFn: () => api.workloadHealth(name),
    refetchInterval: 10000
  });
  if (health.isLoading) return <StateBadge state="checking" />;
  if (health.error || !health.data) return <StateBadge state="unknown" />;
  return <StateBadge state={health.data.status} />;
}

export function RowMessage({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="px-5 py-8 text-center text-xs text-slate-500" colSpan={colSpan}>
        {text}
      </td>
    </tr>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-1.5 rounded-lg border border-slate-800/30 bg-slate-900/10">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-200">{value}</div>
    </div>
  );
}

export function HealthTile({ title, ok, body }: { title: string; ok: boolean; body?: unknown }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  const statusLabel = ok ? "Healthy & Online" : "Degraded / Offline";
  const details = body as Record<string, unknown> | undefined;

  return (
    <Panel title={title}>
      <div className="p-6">
        <div className="flex items-center gap-3.5 mb-5 p-4 rounded-xl border border-slate-800 bg-[#0b0f19]/30">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Status</span>
            <span className={`text-sm font-bold ${ok ? "text-emerald-400" : "text-red-400"}`}>{statusLabel}</span>
          </div>
        </div>

        {details && (
          <div className="grid gap-3 grid-cols-2 mb-5">
            <div className="bg-slate-900/10 border border-slate-800/80 rounded-lg p-3 text-center">
              <span className="block text-[10px] font-semibold uppercase text-slate-500">Service</span>
              <span className="text-xs font-bold text-slate-300 mt-0.5 block">{String(details.status || "moiraweave-api")}</span>
            </div>
            <div className="bg-slate-900/10 border border-slate-800/80 rounded-lg p-3 text-center">
              <span className="block text-[10px] font-semibold uppercase text-slate-500">Version</span>
              <span className="text-xs font-bold text-slate-300 mt-0.5 block">{String(details.version || "0.1.0")}</span>
            </div>
          </div>
        )}

        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Diagnostic Data</span>
        <div className="p-4 bg-[#050811] rounded-lg border border-slate-900">
          <pre className="overflow-auto text-[10px] font-mono text-emerald-500/85 leading-normal max-h-40">
            {JSON.stringify(body || { error: "No response from service" }, null, 2)}
          </pre>
        </div>
      </div>
    </Panel>
  );
}

export function ChannelPills({
  channels,
  empty,
  tone
}: {
  channels: string[];
  empty: string;
  tone: "emerald" | "amber";
}) {
  const classes =
    tone === "amber"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (!channels.length) {
    return <div className="mt-2 text-xs text-slate-600">{empty}</div>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {channels.map((channel) => (
        <span
          key={channel}
          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${classes}`}
        >
          {channel}
        </span>
      ))}
    </div>
  );
}
