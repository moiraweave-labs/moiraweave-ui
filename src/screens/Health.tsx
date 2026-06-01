import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, RefreshCcw, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { DeploymentOperation, DeploymentPlan, PreflightResponse } from "../api";
import { useAuthProfile } from "../auth";
import { SAMPLE_DEPLOYMENT_METADATA } from "../constants";
import { HealthTile, Panel, PermissionNotice } from "../components/common";
import {
  DeploymentOperationSummary,
  DeploymentOperationsPanel,
  DeploymentPlanSummary,
  DeploymentsPanel,
  OperationError,
  PreflightSummary,
  SecretInventorySummary,
  WorkloadHealthSummary
} from "../components/operations";

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
            <OperationError error={recordDeployment.error} fallback="Deployment record failed. Check JSON and endpoint." />
            <OperationError error={deploymentPlan.error} fallback="Deployment plan failed. Check target and workload deployment mode." />
            <OperationError error={preflightMutation.error} fallback="Preflight failed. Check workload and role." />
            <OperationError error={syncOperation.error} fallback="Deployment sync failed. Check workload and role." />
            {selectedWorkloadHealth.data && (
              <WorkloadHealthSummary health={selectedWorkloadHealth.data} />
            )}
            <SecretInventorySummary
              canAdmin={canAdmin}
              inventory={secretInventory.data}
              isLoading={secretInventory.isLoading}
              error={secretInventory.error}
            />
            {preflight && <PreflightSummary preflight={preflight} />}
            {plan && <DeploymentPlanSummary plan={plan} />}
            {operation && (
              <DeploymentOperationSummary
                operation={operation}
                events={operationEvents.data || []}
              />
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
      <DeploymentsPanel deployments={deployments.data || []} />
      <DeploymentOperationsPanel
        operations={deploymentOperations.data || []}
        selectedOperationId={operation?.operation_id}
        onSelect={setOperation}
      />
    </div>
  );
}
