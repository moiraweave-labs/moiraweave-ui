import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, RefreshCcw, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { DeploymentOperation, DeploymentPlan, PreflightResponse } from "../api";
import { useAuthProfile } from "../auth";
import { SAMPLE_DEPLOYMENT_METADATA } from "../constants";
import {
  ErrorMessage,
  HealthTile,
  Metric,
  Panel,
  PermissionNotice,
  StateBadge
} from "../components/common";
import { formatDate, formatError } from "../utils";

export function Health() {
  const queryClient = useQueryClient();
  const { canOperate, canAdmin } = useAuthProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedWorkload = searchParams.get("workload") || "";
  const [workload, setWorkload] = useState(() => requestedWorkload);
  const [target, setTarget] = useState("local");
  const [planEnv, setPlanEnv] = useState("dev");
  const [status, setStatus] = useState("running");
  const [endpoint, setEndpoint] = useState("");
  const [metadataDraft, setMetadataDraft] = useState(SAMPLE_DEPLOYMENT_METADATA);
  const [plan, setPlan] = useState<DeploymentPlan | null>(null);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [operation, setOperation] = useState<DeploymentOperation | null>(null);
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 5000 });
  const ready = useQuery({ queryKey: ["ready"], queryFn: api.ready, refetchInterval: 5000 });
  const deployments = useQuery({ queryKey: ["deployments"], queryFn: () => api.deployments(), refetchInterval: 10000 });
  const deploymentOperations = useQuery({
    queryKey: ["deployment-operations", workload || "all"],
    queryFn: () =>
      api.deploymentOperations({ workload_name: workload || undefined }),
    refetchInterval: 10000
  });
  const workloads = useQuery({ queryKey: ["workloads"], queryFn: api.workloads });
  const selectedWorkloadHealth = useQuery({
    queryKey: ["workload-health", workload],
    queryFn: () => api.workloadHealth(workload),
    enabled: Boolean(workload),
    refetchInterval: 10000
  });
  const secretInventory = useQuery({
    queryKey: ["secrets", workload || "all"],
    queryFn: () => api.secrets(workload || undefined),
    enabled: canAdmin,
    refetchInterval: 10000
  });
  const operationEvents = useQuery({
    queryKey: ["deployment-operation-events", operation?.operation_id],
    queryFn: () => api.deploymentOperationEvents(operation!.operation_id),
    enabled: Boolean(operation)
  });
  const preflightMutation = useMutation({
    mutationFn: () => api.preflight(workload, target, planEnv),
    onSuccess: (response) => setPreflight(response)
  });
  const deploymentPlan = useMutation({
    mutationFn: () => api.deploymentPlan(workload, target, planEnv),
    onSuccess: (response) => setPlan(response)
  });
  const syncOperation = useMutation({
    mutationFn: () =>
      api.deploymentOperation({
        action: "sync",
        workload_name: workload,
        target,
        env: planEnv,
        metadata: { status, source: "moiraweave-ui" }
      }),
    onSuccess: (response) => {
      setOperation(response);
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["deployment-operations"] });
      queryClient.invalidateQueries({ queryKey: ["workload-health", workload] });
    }
  });
  const recordDeployment = useMutation({
    mutationFn: () =>
      api.recordDeployment(workload, {
        target,
        status,
        endpoint: endpoint.trim() || undefined,
        metadata: JSON.parse(metadataDraft) as Record<string, unknown>
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["workload-health", workload] });
    }
  });

  useEffect(() => {
    setPlan(null);
    setPreflight(null);
    setOperation(null);
  }, [workload, target, planEnv]);

  useEffect(() => {
    if (requestedWorkload && workload !== requestedWorkload) {
      setWorkload(requestedWorkload);
    }
  }, [requestedWorkload, workload]);

  function selectWorkload(nextWorkload: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextWorkload) {
      nextParams.set("workload", nextWorkload);
    } else {
      nextParams.delete("workload");
    }
    setWorkload(nextWorkload);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <HealthTile title="System Health" ok={!health.error} body={health.data} />
        <HealthTile title="Gateway Readiness" ok={!ready.error} body={ready.data} />
      </div>
      <Panel
        title="Operations Center"
        action={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 disabled:text-slate-600"
              disabled={!canOperate || !workload || preflightMutation.isPending}
              onClick={() => preflightMutation.mutate()}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Preflight
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 disabled:text-slate-600"
              disabled={!workload || deploymentPlan.isPending}
              onClick={() => deploymentPlan.mutate()}
            >
              <Terminal className="h-3.5 w-3.5" />
              Plan
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:text-slate-600"
              disabled={!canOperate || !workload || syncOperation.isPending}
              onClick={() => syncOperation.mutate()}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Sync
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600"
              disabled={!canOperate || !workload || recordDeployment.isPending}
              onClick={() => recordDeployment.mutate()}
            >
              <Plus className="h-3.5 w-3.5" />
              Record
            </button>
          </div>
        }
      >
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {!canOperate && (
              <div className="sm:col-span-2">
                <PermissionNotice minimumRole="operator" action="Preflight, sync, and deployment records" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Workload</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={workload}
                onChange={(event) => selectWorkload(event.target.value)}
              >
                <option value="">Select workload...</option>
                {(workloads.data || []).map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="local">Local</option>
                <option value="kubernetes">Kubernetes</option>
                <option value="external">External</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Env</label>
              <input
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={planEnv}
                onChange={(event) => setPlanEnv(event.target.value)}
                placeholder="dev"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="generated">Generated</option>
                <option value="running">Running</option>
                <option value="applied">Applied</option>
                <option value="healthy">Healthy</option>
                <option value="failed">Failed</option>
                <option value="unhealthy">Unhealthy</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Endpoint</label>
              <input
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                placeholder="http://service:port"
              />
            </div>
            {recordDeployment.error && (
              <div className="sm:col-span-2">
                <ErrorMessage error={recordDeployment.error} fallback="Deployment record failed. Check JSON and endpoint." />
              </div>
            )}
            {deploymentPlan.error && (
              <div className="sm:col-span-2">
                <ErrorMessage error={deploymentPlan.error} fallback="Deployment plan failed. Check target and workload deployment mode." />
              </div>
            )}
            {preflightMutation.error && (
              <div className="sm:col-span-2">
                <ErrorMessage error={preflightMutation.error} fallback="Preflight failed. Check workload and role." />
              </div>
            )}
            {syncOperation.error && (
              <div className="sm:col-span-2">
                <ErrorMessage error={syncOperation.error} fallback="Deployment sync failed. Check workload and role." />
              </div>
            )}
            {selectedWorkloadHealth.data && (
              <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workload Health</span>
                  <StateBadge state={selectedWorkloadHealth.data.status} />
                </div>
                <div className="text-slate-400">{selectedWorkloadHealth.data.reason}</div>
                {selectedWorkloadHealth.data.recommendations.length > 0 && (
                  <div className="space-y-1">
                    {selectedWorkloadHealth.data.recommendations.map((item) => (
                      <div key={item} className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secret Inventory</span>
                {secretInventory.data && <StateBadge state={secretInventory.data.status} />}
              </div>
              {!canAdmin && (
                <PermissionNotice minimumRole="admin" action="Viewing secret inventory" />
              )}
              {secretInventory.isLoading && <div className="text-slate-500">Loading required names...</div>}
              {secretInventory.error && <div className="text-red-400">{formatError(secretInventory.error, "Unable to load secret inventory.")}</div>}
              {secretInventory.data && secretInventory.data.secrets.length === 0 && (
                <div className="text-slate-500">No required secrets declared.</div>
              )}
              {secretInventory.data && secretInventory.data.secrets.length > 0 && (
                <div className="space-y-1.5">
                  {secretInventory.data.secrets.map((secret) => (
                    <div key={secret.name} className="flex items-start justify-between gap-3 rounded border border-slate-800 bg-[#050811] p-2">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-[11px] text-slate-200">{secret.name}</div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {secret.workloads.join(", ")} - {secret.source}
                        </div>
                        {!secret.present && secret.remediation && (
                          <div className="mt-1 text-[10px] text-amber-300">{secret.remediation}</div>
                        )}
                      </div>
                      <StateBadge state={secret.present ? "present" : "missing"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {preflight && (
              <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preflight</span>
                  <StateBadge state={preflight.status} />
                </div>
                {preflight.recommendations.length > 0 && (
                  <div className="space-y-1 rounded border border-amber-500/20 bg-amber-500/10 p-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-200">Recommended Actions</span>
                    {preflight.recommendations.map((item) => (
                      <div key={item} className="mt-1 text-[10px] text-amber-100">{item}</div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {preflight.checks.map((check) => (
                    <div key={check.name} className="rounded border border-slate-800 bg-[#050811] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-300">{check.name}</span>
                        <StateBadge state={check.status} />
                      </div>
                      <div className="mt-1 text-slate-400">{check.message}</div>
                      {check.remediation && (
                        <div className="mt-1 text-amber-300">{check.remediation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plan && (
              <div className="space-y-3 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="Target" value={<StateBadge state={plan.target} />} />
                  <Metric label="Service" value={<span className="font-mono text-slate-300">{plan.service_name || "-"}</span>} />
                  <Metric label="Endpoint" value={<span className="break-all font-mono text-slate-400">{plan.endpoint || "-"}</span>} />
                </div>
                {plan.files.length > 0 && (
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Files</span>
                    <div className="space-y-1">
                      {plan.files.map((file) => (
                        <code key={file} className="block rounded border border-slate-800 bg-[#050811] px-2 py-1 text-[10px] text-emerald-300">
                          {file}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Commands</span>
                  <div className="space-y-1">
                    {plan.commands.map((command) => (
                      <code key={command} className="block whitespace-pre-wrap rounded border border-slate-800 bg-[#050811] px-2 py-1 text-[10px] text-sky-300">
                        {command}
                      </code>
                    ))}
                  </div>
                </div>
                {plan.notes.length > 0 && (
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {plan.notes.map((note) => (
                      <div key={note}>{note}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {operation && (
              <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="Operation" value={<span className="font-mono text-slate-300">{operation.operation_id.slice(0, 8)}</span>} />
                  <Metric label="Action" value={<span className="text-slate-300">{operation.action}</span>} />
                  <Metric label="Status" value={<StateBadge state={operation.status} />} />
                </div>
                {(operationEvents.data || []).map((event) => (
                  <div key={event.id} className="rounded border border-slate-800 bg-[#050811] px-2 py-1 text-[10px] text-slate-400">
                    <span className="font-semibold text-sky-300">{event.type}</span>
                    <span className="mx-2 text-slate-700">/</span>
                    {event.message}
                  </div>
                ))}
              </div>
            )}
          </div>
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border border-slate-900 bg-[#050811] p-4 font-mono text-[11px] text-emerald-400/90 outline-none focus:ring-1 focus:ring-slate-800"
            value={metadataDraft}
            onChange={(event) => setMetadataDraft(event.target.value)}
            spellCheck={false}
          />
        </div>
      </Panel>
      <Panel title="Deployments">
        <div className="divide-y divide-slate-800/50">
          {(deployments.data || []).map((deployment) => (
            <div key={deployment.deployment_id} className="grid gap-3 p-5 text-sm md:grid-cols-[1fr_120px_120px_1fr]">
              <span className="font-bold text-slate-200">{deployment.workload_name}</span>
              <span className="text-xs text-slate-400">{deployment.target}</span>
              <StateBadge state={deployment.status} />
              <span className="break-all font-mono text-[10px] text-slate-500">{deployment.endpoint || "-"}</span>
            </div>
          ))}
          {(deployments.data || []).length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">No deployment records yet</div>
          )}
        </div>
      </Panel>
      <Panel title="Deployment Operations">
        <div className="divide-y divide-slate-800/50">
          {(deploymentOperations.data || []).map((item) => (
            <button
              key={item.operation_id}
              className={`grid w-full gap-3 p-5 text-left text-sm transition-colors md:grid-cols-[110px_1fr_120px_120px_160px] ${
                operation?.operation_id === item.operation_id
                  ? "bg-emerald-500/5"
                  : "hover:bg-slate-800/10"
              }`}
              onClick={() => setOperation(item)}
            >
              <span className="font-mono text-[10px] font-semibold text-sky-300">
                {item.operation_id.slice(0, 8)}
              </span>
              <span className="font-bold text-slate-200">{item.workload_name}</span>
              <span className="text-xs text-slate-400">{item.action}</span>
              <StateBadge state={item.status} />
              <span className="text-[10px] text-slate-500">{formatDate(item.created_at)}</span>
            </button>
          ))}
          {(deploymentOperations.data || []).length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              No deployment operations recorded
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
