import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CheckCircle2,
  Plus,
  RefreshCcw,
  Rocket,
  ScrollText,
  Terminal,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type {
  Deployment,
  DeploymentOperation,
  DeploymentPlan,
  PreflightResponse,
  RunStatus,
  WorkloadInfo
} from "../api";
import { useAuthProfile } from "../auth";
import { SAMPLE_DEPLOYMENT_METADATA } from "../constants";
import { HealthTile, Panel, PermissionNotice, StateBadge } from "../components/common";
import {
  AuditEventsPanel,
  CommandCompanionPanel,
  ControllerQueuePanel,
  DeploymentOperationSummary,
  DeploymentOperationsPanel,
  DeploymentPlanSummary,
  DeploymentsPanel,
  EnvironmentOverviewPanel,
  OperationError,
  OperationsSnapshot,
  PreflightActionGuide,
  PreflightSummary,
  SecretInventorySummary,
  WorkloadHealthSummary
} from "../components/operations";
import {
  agentChannels,
  formatDate,
  isActiveRunStatus,
  isAttentionRunStatus
} from "../utils";

function hasStatus(body: unknown, status: string): boolean {
  return Boolean(
    body &&
      typeof body === "object" &&
      "status" in body &&
      String((body as { status?: unknown }).status) === status
  );
}

type ReadinessCheck = {
  status?: string;
  message?: string | null;
  latency_ms?: number | null;
  metadata?: Record<string, unknown>;
};

const COMMON_ENVIRONMENTS = ["local", "dev", "staging", "prod"];
const HEALTHY_CHECK_STATES = new Set(["ok", "passed", "ready", "healthy", "present"]);

function readinessChecks(body: unknown): Array<[string, ReadinessCheck]> {
  if (!body || typeof body !== "object" || !("checks" in body)) return [];
  const checks = (body as { checks?: unknown }).checks;
  if (!checks || typeof checks !== "object") return [];
  return Object.entries(checks as Record<string, ReadinessCheck>);
}

function PlatformChecks({ body }: { body: unknown }) {
  const checks = readinessChecks(body);
  if (!checks.length) return null;
  return (
    <Panel title="Platform Checks">
      <div className="divide-y divide-slate-900">
        {checks.map(([name, check]) => {
          const recommendedAction = platformCheckAction(name, check);
          return (
            <div
              key={name}
              className="grid gap-3 px-5 py-4 text-xs md:grid-cols-[160px_120px_1fr]"
            >
              <div className="font-semibold text-slate-200">{name}</div>
              <div>
                <StateBadge state={check.status || "unknown"} />
              </div>
              <div className="space-y-2 text-slate-400">
                <div>{check.message || "No action needed."}</div>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                  {typeof check.latency_ms === "number" && (
                    <span className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1">
                      {check.latency_ms} ms
                    </span>
                  )}
                  {Object.entries(check.metadata || {}).map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1"
                    >
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
                {recommendedAction && (
                  <div className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                    <span className="font-semibold text-amber-200">Recommended action:</span>{" "}
                    {recommendedAction}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function platformCheckAction(name: string, check: ReadinessCheck): string | null {
  if (HEALTHY_CHECK_STATES.has(String(check.status || "").toLowerCase())) return null;
  const normalized = name.toLowerCase();
  if (normalized.includes("postgres") || normalized.includes("database")) {
    return "Check DATABASE_URL, then inspect Postgres with docker compose logs postgres.";
  }
  if (normalized.includes("redis")) {
    return "Check REDIS_URL, then inspect Redis with docker compose logs redis.";
  }
  if (normalized.includes("worker")) {
    return "Start the worker or inspect it with docker compose logs worker. Run moira doctor if the consumer is missing.";
  }
  if (normalized.includes("qdrant")) {
    return "Start Qdrant when vector storage is required, or keep it disabled for workloads that do not need it.";
  }
  if (normalized.includes("ui")) {
    return "Check the UI container, VITE_API_BASE_URL, and docker compose logs ui.";
  }
  if (normalized.includes("api") || normalized.includes("gateway")) {
    return "Inspect the API gateway with docker compose logs api and verify /ready.";
  }
  if (normalized.includes("docker") || normalized.includes("compose")) {
    return "Verify Docker is running and regenerate local files with moira up or moira init.";
  }
  return "Run moira doctor, inspect the relevant service logs, and retry preflight after the dependency is healthy.";
}

function AgentOperationsPanel({
  deployments,
  env,
  isLoading,
  runs,
  target,
  workloads
}: {
  deployments: Deployment[];
  env: string;
  isLoading: boolean;
  runs: RunStatus[];
  target: string;
  workloads: WorkloadInfo[];
}) {
  const agents = workloads.filter((item) => item.type === "agent-service");

  return (
    <Panel title="Agent Runtime Supervision">
      <div className="divide-y divide-slate-900">
        {isLoading && (
          <div className="px-5 py-6 text-xs text-slate-500">Loading agent operations...</div>
        )}
        {!isLoading && agents.length === 0 && (
          <div className="px-5 py-6 text-xs text-slate-500">
            No agent workloads have been created yet.
          </div>
        )}
        {!isLoading &&
          agents.map((agent) => {
            const agentRuns = runs
              .filter((run) => run.workload_name === agent.name)
              .sort((left, right) => right.created_at.localeCompare(left.created_at));
            const activeRuns = agentRuns.filter((run) => isActiveRunStatus(run.status));
            const attentionRuns = agentRuns.filter((run) => isAttentionRunStatus(run.status));
            const cancellationRuns = agentRuns.filter((run) =>
              ["cancel_requested", "cancelling"].includes(run.status)
            );
            const longRunningRuns = activeRuns.filter((run) => runAgeHours(run) >= 1);
            const record = deployments.find(
              (deployment) =>
                deployment.workload_name === agent.name &&
                deployment.target === target &&
                deployment.env === env
            );
            const mode = workloadDeploymentMode(agent);
            const channels = agentChannels(agent.manifest);
            const nextAction = agentSupervisionAction({
              attentionRuns,
              cancellationRuns,
              channels,
              env,
              mode,
              record,
              target
            });
            const latestRun = agentRuns[0];

            return (
              <div
                key={agent.name}
                className="grid gap-4 px-5 py-4 text-xs xl:grid-cols-[220px_1fr_260px]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-emerald-400" />
                    <Link
                      className="truncate font-semibold text-sky-300 hover:underline"
                      to={`/agents?agent=${encodeURIComponent(agent.name)}`}
                    >
                      {agent.name}
                    </Link>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1 font-mono text-[10px] text-slate-400">
                      {mode}
                    </span>
                    <span className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1 font-mono text-[10px] text-slate-400">
                      {target}/{env || "unset"}
                    </span>
                  </div>
                  {channels.externalOwned.length > 0 && (
                    <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                      External-owned: {channels.externalOwned.join(", ")}
                    </div>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <AgentMetric
                    label="Deployment"
                    state={record?.status || "missing"}
                    value={record ? record.status : "No record"}
                  />
                  <AgentMetric
                    label="Active"
                    state={activeRuns.length ? "running" : "ready"}
                    value={String(activeRuns.length)}
                  />
                  <AgentMetric
                    label="Long-running"
                    state={longRunningRuns.length ? "running" : "ready"}
                    value={String(longRunningRuns.length)}
                  />
                  <AgentMetric
                    label="Attention"
                    state={
                      cancellationRuns.length
                        ? "cancel_requested"
                        : attentionRuns.length
                          ? "failed"
                          : "ready"
                    }
                    value={String(cancellationRuns.length + attentionRuns.length)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
                    {nextAction}
                  </div>
                  {latestRun && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <Activity className="h-3 w-3" />
                      <span>Latest</span>
                      <Link
                        className="font-mono text-sky-300 hover:underline"
                        to={`/runs/${latestRun.run_id}`}
                      >
                        {latestRun.run_id.slice(0, 8)}
                      </Link>
                      <StateBadge state={latestRun.status} />
                      <span>{formatDate(latestRun.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </Panel>
  );
}

function AgentMetric({
  label,
  state,
  value
}: {
  label: string;
  state: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded border border-slate-800 bg-[#050811] p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <StateBadge state={state} />
      </div>
      <div className="truncate text-[11px] text-slate-300" title={value}>
        {value}
      </div>
    </div>
  );
}

function workloadDeploymentMode(workload: WorkloadInfo): string {
  const spec = objectValue(workload.manifest.spec);
  const deployment = objectValue(spec.deployment);
  return typeof deployment.mode === "string" ? deployment.mode : "managed";
}

function agentSupervisionAction({
  attentionRuns,
  cancellationRuns,
  channels,
  env,
  mode,
  record,
  target
}: {
  attentionRuns: RunStatus[];
  cancellationRuns: RunStatus[];
  channels: ReturnType<typeof agentChannels>;
  env: string;
  mode: string;
  record?: Deployment;
  target: string;
}) {
  if (!record) {
    if (mode === "external" || target === "external") {
      return "Register the external endpoint after verifying the runtime owner, health URL, and credentials.";
    }
    return `Run plan/apply from CLI or CI, then sync the ${target}/${env || "local"} deployment record.`;
  }
  if (cancellationRuns.length > 0) {
    return "Cancellation is pending. Watch the run until the adapter acknowledges canceled or inspect runtime logs.";
  }
  if (attentionRuns.length > 0) {
    return "Open the latest failed/lost run, inspect events and artifacts, then retry from Agent Console when appropriate.";
  }
  if (channels.externalOwned.length > 0) {
    return "Runtime-owned channels are supervised here, but messages stay in the agent connector unless the adapter exposes them.";
  }
  return "Agent is registered for this environment. Use preflight for reachability and Agent Console for sessions.";
}

function runAgeHours(run: RunStatus): number {
  const created = Date.parse(run.created_at);
  if (Number.isNaN(created)) return 0;
  return (Date.now() - created) / 3_600_000;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function deploymentPlanFromOperation(operation: DeploymentOperation): DeploymentPlan | null {
  const plan = operation.metadata.plan;
  if (!plan || typeof plan !== "object") return null;
  const candidate = plan as Partial<DeploymentPlan>;
  if (
    typeof candidate.workload_name !== "string" ||
    typeof candidate.target !== "string" ||
    typeof candidate.mode !== "string" ||
    !Array.isArray(candidate.files) ||
    !Array.isArray(candidate.commands) ||
    !Array.isArray(candidate.notes)
  ) {
    return null;
  }
  return {
    workload_name: candidate.workload_name,
    target: candidate.target,
    mode: candidate.mode,
    service_name: candidate.service_name ?? null,
    endpoint: candidate.endpoint ?? null,
    files: candidate.files.map(String),
    commands: candidate.commands.map(String),
    notes: candidate.notes.map(String)
  };
}

export function Health() {
  const queryClient = useQueryClient();
  const { canOperate, canAdmin } = useAuthProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedWorkload = searchParams.get("workload") || "";
  const [workload, setWorkload] = useState(() => requestedWorkload);
  const [target, setTarget] = useState("local");
  const [planEnv, setPlanEnv] = useState("local");
  const [status, setStatus] = useState("deployed");
  const [endpoint, setEndpoint] = useState("");
  const [metadataDraft, setMetadataDraft] = useState(SAMPLE_DEPLOYMENT_METADATA);
  const [plan, setPlan] = useState<DeploymentPlan | null>(null);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [operation, setOperation] = useState<DeploymentOperation | null>(null);
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    resourceType: "",
    resourceId: ""
  });
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 5000 });
  const ready = useQuery({ queryKey: ["ready"], queryFn: api.ready, refetchInterval: 5000 });
  const deployments = useQuery({
    queryKey: ["deployments", planEnv],
    queryFn: () => api.deployments({ env: planEnv || undefined }),
    refetchInterval: 10000
  });
  const environments = useQuery({
    queryKey: ["environments"],
    queryFn: api.environments,
    refetchInterval: 15000
  });
  const auditEvents = useQuery({
    queryKey: [
      "audit-events",
      auditFilters.action,
      auditFilters.resourceType,
      auditFilters.resourceId
    ],
    queryFn: () =>
      api.auditEvents({
        action: auditFilters.action.trim() || undefined,
        resource_type: auditFilters.resourceType.trim() || undefined,
        resource_id: auditFilters.resourceId.trim() || undefined,
        limit: 25
      }),
    refetchInterval: 15000
  });
  const deploymentOperations = useQuery({
    queryKey: [
      "deployment-operations",
      workload || "all",
      target,
      planEnv,
      canAdmin ? "all" : "mine"
    ],
    queryFn: () =>
      api.deploymentOperations({
        workload_name: workload || undefined,
        target,
        env: planEnv || undefined,
        scope: canAdmin ? "all" : undefined
      }),
    refetchInterval: 10000
  });
  const workloads = useQuery({ queryKey: ["workloads"], queryFn: api.workloads });
  const runs = useQuery({
    queryKey: ["runs", "operations-center"],
    queryFn: () => api.runs(),
    refetchInterval: 5000
  });
  const selectedWorkloadHealth = useQuery({
    queryKey: ["workload-health", workload, planEnv],
    queryFn: () => api.workloadHealth(workload, planEnv || undefined),
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
    enabled: Boolean(operation),
    refetchInterval:
      operation && ["queued", "running"].includes(operation.status) ? 3000 : false
  });
  const preflightMutation = useMutation({
    mutationFn: () => api.preflight(workload, target, planEnv),
    onSuccess: (response) => setPreflight(response)
  });
  const planOperation = useMutation({
    mutationFn: () =>
      api.deploymentOperation({
        action: "plan",
        workload_name: workload,
        target,
        env: planEnv,
        metadata: { source: "moiraweave-ui" }
      }),
    onSuccess: (response) => {
      setOperation(response);
      setPlan(deploymentPlanFromOperation(response));
      queryClient.invalidateQueries({ queryKey: ["deployment-operations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
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
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
  });
  const logsOperation = useMutation({
    mutationFn: () =>
      api.deploymentOperation({
        action: "logs",
        workload_name: workload,
        target,
        env: planEnv,
        metadata: { source: "moiraweave-ui" }
      }),
    onSuccess: (response) => {
      setOperation(response);
      queryClient.invalidateQueries({ queryKey: ["deployment-operations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
  });
  const applyOperation = useMutation({
    mutationFn: () =>
      api.deploymentOperation({
        action: "apply",
        workload_name: workload,
        target,
        env: planEnv,
        executor: target === "kubernetes" ? "controller" : "api",
        metadata: { source: "moiraweave-ui" }
      }),
    onSuccess: (response) => {
      setOperation(response);
      queryClient.invalidateQueries({ queryKey: ["deployment-operations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
  });
  const undeployOperation = useMutation({
    mutationFn: () =>
      api.deploymentOperation({
        action: "undeploy",
        workload_name: workload,
        target,
        env: planEnv,
        executor: target === "kubernetes" ? "controller" : "api",
        metadata: { source: "moiraweave-ui" }
      }),
    onSuccess: (response) => {
      setOperation(response);
      queryClient.invalidateQueries({ queryKey: ["deployment-operations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
  });
  const recordDeployment = useMutation({
    mutationFn: () =>
      api.recordDeployment(workload, {
        target,
        env: planEnv,
        status,
        endpoint: endpoint.trim() || undefined,
        metadata: JSON.parse(metadataDraft) as Record<string, unknown>
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["workload-health", workload] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
  });
  const currentDeployment = (deployments.data || []).find(
    (deployment) =>
      deployment.workload_name === workload &&
      deployment.target === target &&
      deployment.env === planEnv
  );
  const selectedWorkload = (workloads.data || []).find((item) => item.name === workload);

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

  useEffect(() => {
    if (!operation) return;
    const latest = (deploymentOperations.data || []).find(
      (item) => item.operation_id === operation.operation_id
    );
    if (!latest) return;
    if (
      latest.status !== operation.status ||
      latest.updated_at !== operation.updated_at ||
      latest.completed_at !== operation.completed_at
    ) {
      setOperation(latest);
    }
  }, [
    deploymentOperations.data,
    operation?.completed_at,
    operation?.operation_id,
    operation?.status,
    operation?.updated_at
  ]);

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
        <HealthTile
          title="System Health"
          ok={health.isSuccess && hasStatus(health.data, "ok")}
          body={health.data}
        />
        <HealthTile
          title="Gateway Readiness"
          ok={ready.isSuccess && hasStatus(ready.data, "ready")}
          body={ready.data}
        />
      </div>
      <PlatformChecks body={ready.data} />
      <EnvironmentOverviewPanel
        environments={environments.data || []}
        selectedEnv={planEnv}
        isLoading={environments.isLoading}
        error={environments.error}
        onSelect={setPlanEnv}
      />
      <AgentOperationsPanel
        deployments={deployments.data || []}
        env={planEnv}
        isLoading={workloads.isLoading || runs.isLoading || deployments.isLoading}
        runs={runs.data || []}
        target={target}
        workloads={workloads.data || []}
      />
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
              disabled={!canOperate || !workload || planOperation.isPending}
              onClick={() => planOperation.mutate()}
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 disabled:text-slate-600"
              disabled={!canOperate || !workload || logsOperation.isPending}
              onClick={() => logsOperation.mutate()}
            >
              <ScrollText className="h-3.5 w-3.5" />
              Logs
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-all hover:bg-sky-500/20 disabled:text-slate-600"
              disabled={!canOperate || !workload || applyOperation.isPending}
              onClick={() => applyOperation.mutate()}
            >
              <Rocket className="h-3.5 w-3.5" />
              Apply
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:text-slate-600"
              disabled={!canOperate || !workload || undeployOperation.isPending}
              onClick={() => undeployOperation.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Undeploy
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
                aria-label="Workload"
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
                aria-label="Target"
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
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-800 bg-[#050811] p-1">
                {COMMON_ENVIRONMENTS.map((envName) => (
                  <button
                    key={envName}
                    type="button"
                    aria-pressed={planEnv === envName}
                    className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                      planEnv === envName
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                    onClick={() => setPlanEnv(envName)}
                  >
                    {envName}
                  </button>
                ))}
              </div>
              <input
                aria-label="Custom environment"
                className="mt-2 w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={planEnv}
                onChange={(event) => setPlanEnv(event.target.value)}
                placeholder="custom-env"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <select
                aria-label="Status"
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="created">Created</option>
                <option value="deployed">Deployed</option>
                <option value="reachable">Reachable</option>
                <option value="healthy">Healthy</option>
                <option value="failed">Failed</option>
                <option value="unreachable">Unreachable</option>
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
            <OperationsSnapshot
              workloadName={workload}
              target={target}
              env={planEnv}
              deployment={currentDeployment}
              health={selectedWorkloadHealth.data}
              preflight={preflight}
            />
            <PreflightActionGuide
              workloadName={workload}
              target={target}
              env={planEnv}
              preflight={preflight}
              inventory={secretInventory.data}
            />
            <OperationError error={recordDeployment.error} fallback="Deployment record failed. Check JSON and endpoint." />
            <OperationError error={planOperation.error} fallback="Deployment plan failed. Check target and workload deployment mode." />
            <OperationError error={preflightMutation.error} fallback="Preflight failed. Check workload and role." />
            <OperationError error={syncOperation.error} fallback="Deployment sync failed. Check workload and role." />
            <OperationError error={logsOperation.error} fallback="Log guidance failed. Check workload and role." />
            <OperationError error={applyOperation.error} fallback="Apply guidance failed. Check workload and role." />
            <OperationError error={undeployOperation.error} fallback="Undeploy guidance failed. Check workload and role." />
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
          <div className="space-y-3">
            <CommandCompanionPanel
              workload={selectedWorkload}
              target={target}
              env={planEnv}
              deployment={currentDeployment}
            />
            <textarea
              className="min-h-32 w-full resize-y rounded-lg border border-slate-900 bg-[#050811] p-4 font-mono text-[11px] text-emerald-400/90 outline-none focus:ring-1 focus:ring-slate-800"
              value={metadataDraft}
              onChange={(event) => setMetadataDraft(event.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      </Panel>
      {target === "kubernetes" && (
        <ControllerQueuePanel
          operations={deploymentOperations.data || []}
          target={target}
          env={planEnv}
          onSelect={setOperation}
        />
      )}
      <DeploymentsPanel deployments={deployments.data || []} />
      <DeploymentOperationsPanel
        operations={deploymentOperations.data || []}
        selectedOperationId={operation?.operation_id}
        onSelect={setOperation}
      />
      <AuditEventsPanel
        events={auditEvents.data || []}
        filters={auditFilters}
        isLoading={auditEvents.isLoading}
        error={auditEvents.error}
        onFiltersChange={setAuditFilters}
      />
    </div>
  );
}
