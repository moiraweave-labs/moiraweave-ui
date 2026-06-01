import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { RunResponse } from "../api";
import { useAuthProfile } from "../auth";
import { SAMPLE_RUN_PAYLOAD } from "../constants";
import {
  ErrorMessage,
  Panel,
  PermissionNotice
} from "../components/common";
import { RunsMetrics, RunsTable } from "../components/runs";

export function Runs() {
  const { canOperate } = useAuthProfile();
  const [workload, setWorkload] = useState("");
  const [submitWorkload, setSubmitWorkload] = useState("");
  const [payloadDraft, setPayloadDraft] = useState(SAMPLE_RUN_PAYLOAD);
  const [submitted, setSubmitted] = useState<RunResponse | null>(null);
  const queryClient = useQueryClient();
  const workloads = useQuery({
    queryKey: ["workloads"],
    queryFn: api.workloads
  });
  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["runs", workload],
    queryFn: () => api.runs(workload || undefined),
    refetchInterval: 3000
  });
  const submitRun = useMutation({
    mutationFn: () =>
      api.submitRun(
        submitWorkload,
        JSON.parse(payloadDraft) as Record<string, unknown>
      ),
    onSuccess: (response) => {
      setSubmitted(response);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    }
  });

  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((run) => ["running", "starting"].includes(run.status)).length;
    const succeeded = data.filter((run) => run.status === "succeeded").length;
    const failed = data.filter((run) => ["failed", "lost"].includes(run.status)).length;
    return { total, active, succeeded, failed };
  }, [data]);

  return (
    <div className="space-y-6">
      <Panel
        title="Submit Run"
        action={
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600"
            disabled={!canOperate || !submitWorkload || submitRun.isPending}
            onClick={() => submitRun.mutate()}
          >
            <Play className="h-3.5 w-3.5" />
            Submit
          </button>
        }
      >
        <div className="grid gap-4 p-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            {!canOperate && (
              <PermissionNotice minimumRole="operator" action="Submitting runs" />
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Workload</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={submitWorkload}
                onChange={(event) => setSubmitWorkload(event.target.value)}
              >
                <option value="">Select workload...</option>
                {(workloads.data || []).map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-[#0b0f19]/40 p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Submitted</span>
              {submitted ? (
                <Link
                  className="mt-1 block font-mono text-xs font-semibold text-sky-300 hover:underline"
                  to={`/runs/${submitted.run_id}`}
                >
                  {submitted.run_id.slice(0, 8)}
                </Link>
              ) : (
                <span className="mt-1 block text-xs text-slate-500">-</span>
              )}
            </div>
            {submitRun.error && (
              <ErrorMessage error={submitRun.error} fallback="Submit failed. Check JSON and workload state." />
            )}
          </div>
          <textarea
            className="min-h-44 w-full resize-y rounded-lg border border-slate-900 bg-[#050811] p-4 font-mono text-[11px] text-sky-400/90 outline-none focus:ring-1 focus:ring-slate-800"
            value={payloadDraft}
            onChange={(event) => setPayloadDraft(event.target.value)}
            spellCheck={false}
          />
        </div>
      </Panel>

      <RunsMetrics metrics={metrics} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <input
            className="w-full rounded-lg border border-slate-800 bg-[#0e1322] pl-3.5 pr-10 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
            value={workload}
            onChange={(event) => setWorkload(event.target.value)}
            placeholder="Filter by workload name..."
          />
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0e1322] hover:bg-slate-800 text-slate-400 transition-colors"
          onClick={() => refetch()}
          title="Refresh runs"
        >
          <RefreshCcw className={`h-4.5 w-4.5 text-slate-400 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <RunsTable runs={data} />
    </div>
  );
}
