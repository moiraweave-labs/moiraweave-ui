import type {
  AuditEvent,
  Deployment,
  DeploymentOperation,
  DeploymentOperationEvent,
  DeploymentPlan,
  EnvironmentInfo,
  PreflightCheck,
  PreflightResponse,
  SecretInventory,
  WorkloadHealth,
  WorkloadInfo
} from "../api";
import { formatDate, formatError } from "../utils";
import { ErrorMessage, Metric, Panel, PermissionNotice, StateBadge } from "./common";

export function EnvironmentOverviewPanel({
  environments,
  selectedEnv,
  isLoading,
  error,
  onSelect
}: {
  environments: EnvironmentInfo[];
  selectedEnv: string;
  isLoading: boolean;
  error: unknown;
  onSelect: (env: string) => void;
}) {
  return (
    <Panel title="Environments">
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {isLoading && (
            <div className="rounded-lg border border-slate-800 bg-[#050811] p-4 text-xs text-slate-500 md:col-span-4">
              Loading environments...
            </div>
          )}
          {!isLoading && environments.length === 0 && (
            <div className="rounded-lg border border-slate-800 bg-[#050811] p-4 text-xs text-slate-500 md:col-span-4">
              No environment records yet.
            </div>
          )}
          {environments.map((environment) => {
            const active = selectedEnv === environment.name;
            const populated =
              environment.workload_count +
              environment.deployment_count +
              environment.operation_count;
            return (
              <button
                key={environment.name}
                type="button"
                className={`rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-slate-800 bg-[#050811] hover:border-slate-700"
                }`}
                onClick={() => onSelect(environment.name)}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {environment.name}
                  </span>
                  <StateBadge state={active ? "selected" : populated ? "active" : "empty"} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <EnvironmentMetric label="Workloads" value={environment.workload_count} />
                  <EnvironmentMetric label="Deploys" value={environment.deployment_count} />
                  <EnvironmentMetric label="Ops" value={environment.operation_count} />
                </div>
              </button>
            );
          })}
        </div>
        {Boolean(error) && (
          <ErrorMessage error={error} fallback="Unable to load environments." />
        )}
        <div className="grid gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-[11px] text-sky-100 md:grid-cols-[1fr_auto]">
          <div>
            Use <span className="font-mono text-sky-200">local</span> for `moira up`,
            and keep cluster or external runtimes in explicit environments such as
            <span className="font-mono text-sky-200"> dev</span>,
            <span className="font-mono text-sky-200"> staging</span>, or
            <span className="font-mono text-sky-200"> prod</span>.
          </div>
          <code className="rounded border border-slate-800 bg-slate-950/70 px-2 py-1 text-[10px] text-sky-300">
            moira env list
          </code>
        </div>
      </div>
    </Panel>
  );
}

function EnvironmentMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-xs text-slate-200">{value}</div>
    </div>
  );
}

export function CommandCompanionPanel({
  workload,
  target,
  env,
  deployment
}: {
  workload?: WorkloadInfo;
  target: string;
  env: string;
  deployment?: Deployment;
}) {
  const workloadName = workload?.name || "<workload>";
  const serviceName = deploymentServiceName(workload, deployment);
  const commands = operationCommands({
    workload,
    workloadName,
    serviceName,
    target,
    env
  });
  const notes = operationNotes({ workload, target });

  return (
    <div className="space-y-3 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Command Companion
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            {workloadName} / {target}/{env || "unset"}
          </div>
        </div>
        <StateBadge state={workload ? target : "select_workload"} />
      </div>
      {!workload && (
        <div className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
          Select a workload to generate local, Kubernetes, or external runtime commands.
        </div>
      )}
      <div className="space-y-2">
        {commands.map((item) => (
          <div key={item.command} className="rounded border border-slate-800 bg-[#050811] p-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {item.label}
            </div>
            <code className="block whitespace-pre-wrap text-[10px] text-sky-300">
              {item.command}
            </code>
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <div className="space-y-1">
          {notes.map((note) => (
            <div key={note} className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CommandItem = {
  label: string;
  command: string;
};

function operationCommands({
  workload,
  workloadName,
  serviceName,
  target,
  env
}: {
  workload?: WorkloadInfo;
  workloadName: string;
  serviceName: string;
  target: string;
  env: string;
}): CommandItem[] {
  if (!workload) return [];
  const commands: CommandItem[] = [
    {
      label: "Preflight",
      command: `moira workload preflight ${workloadName} --target ${target} --env ${env || "local"}`
    },
    { label: "Status", command: `moira workload status ${workloadName}` }
  ];

  if (target === "kubernetes") {
    commands.push(
      {
        label: "Generate And Register",
        command: `moira deploy k8s --env ${env || "dev"} --register`
      },
      {
        label: "Runtime Pods",
        command: `kubectl get pods -n moiraweave -l moiraweave.io/workload=${workloadName}`
      },
      {
        label: "Runtime Logs",
        command: `kubectl logs -n moiraweave -l moiraweave.io/workload=${workloadName} --tail=200`
      }
    );
    return commands;
  }

  if (target === "external") {
    commands.push(
      { label: "Register Manifest", command: `moira workload deploy ${workloadName}` },
      { label: "List Environments", command: "moira env list" }
    );
    return commands;
  }

  commands.push(
    { label: "Start Local Stack", command: "moira up" },
    { label: "Generate And Register", command: "moira deploy local --register" },
    { label: "Runtime Logs", command: `docker compose logs ${serviceName}` }
  );
  if (workload.type === "agent-service") {
    commands.push({
      label: "Agent Smoke Test",
      command: `moira agent chat ${workloadName} "hello" --watch`
    });
  }
  return commands;
}

function operationNotes({
  workload,
  target
}: {
  workload?: WorkloadInfo;
  target: string;
}): string[] {
  if (!workload) return [];
  const notes: string[] = [];
  if (target === "external") {
    notes.push("For external runtimes, verify the endpoint and credentials with the runtime owner, then use Record or Sync in Operations.");
  }
  if (workload.type === "agent-service") {
    notes.push("MoiraWeave supervises sessions, runs, events, and artifacts; runtime tools stay inside the agent.");
  }
  return notes;
}

function deploymentServiceName(workload?: WorkloadInfo, deployment?: Deployment): string {
  const metadataService = deployment?.metadata.service_name;
  if (typeof metadataService === "string" && metadataService) return metadataService;
  const spec = objectRecord(workload?.manifest.spec);
  const deploymentSpec = objectRecord(spec.deployment);
  const serviceName = deploymentSpec.serviceName;
  if (typeof serviceName === "string" && serviceName) return serviceName;
  return workload?.name || "<service>";
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function WorkloadHealthSummary({ health }: { health: WorkloadHealth }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workload Health</span>
        <StateBadge state={health.status} />
      </div>
      <div className="text-slate-400">{health.reason}</div>
      {health.recommendations.length > 0 && (
        <div className="space-y-1">
          {health.recommendations.map((item) => (
            <div key={item} className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SecretInventorySummary({
  canAdmin,
  inventory,
  isLoading,
  error
}: {
  canAdmin: boolean;
  inventory?: SecretInventory;
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secret Inventory</span>
        {inventory && <StateBadge state={inventory.status} />}
      </div>
      {!canAdmin && (
        <PermissionNotice minimumRole="admin" action="Viewing secret inventory" />
      )}
      {isLoading && <div className="text-slate-500">Loading required names...</div>}
      {Boolean(error) && <div className="text-red-400">{formatError(error, "Unable to load secret inventory.")}</div>}
      {inventory && inventory.secrets.length === 0 && (
        <div className="text-slate-500">No required secrets declared.</div>
      )}
      {inventory && inventory.secrets.length > 0 && (
        <div className="space-y-1.5">
          {inventory.secrets.map((secret) => (
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
  );
}

export function OperationsSnapshot({
  workloadName,
  target,
  env,
  deployment,
  health,
  preflight
}: {
  workloadName: string;
  target: string;
  env: string;
  deployment?: Deployment;
  health?: WorkloadHealth;
  preflight?: PreflightResponse | null;
}) {
  const deploymentRecord = preflight?.checks.find((check) => check.name === "deployment_record");
  const reachability = preflight?.checks.find((check) => check.name === "runtime_reachability");
  const firstBlockedCheck = preflight?.checks.find((check) => check.status !== "passed");
  const nextAction = operationNextAction({
    workloadName,
    target,
    env,
    deployment,
    health,
    preflight,
    firstBlockedCheck
  });

  const items = [
    {
      label: "Created",
      state: workloadName ? "created" : "missing",
      detail: workloadName || "No workload selected"
    },
    {
      label: "Deployed",
      state: deploymentState(deployment, deploymentRecord),
      detail: deployment
        ? `${deployment.target}/${deployment.env}`
        : `No ${target}/${env} record`
    },
    {
      label: "Reachable",
      state: reachabilityState(reachability),
      detail: reachability?.message || deployment?.endpoint || "Run preflight"
    },
    {
      label: "Healthy",
      state: health?.status || "unknown",
      detail: health?.reason || "Health has not been loaded yet"
    }
  ];

  return (
    <div className="space-y-3 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Operational Snapshot
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            {target}/{env || "unset"}
          </div>
        </div>
        <StateBadge state={preflight?.status || health?.status || "unknown"} />
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 rounded border border-slate-800 bg-[#050811] p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {item.label}
              </span>
              <StateBadge state={item.state} />
            </div>
            <div className="truncate text-[11px] text-slate-300" title={item.detail}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
        {nextAction}
      </div>
    </div>
  );
}

export function PreflightActionGuide({
  workloadName,
  target,
  env,
  preflight,
  inventory
}: {
  workloadName: string;
  target: string;
  env: string;
  preflight?: PreflightResponse | null;
  inventory?: SecretInventory;
}) {
  if (!workloadName) return null;

  const blockers = preflight?.checks.filter((check) => check.status !== "passed") || [];
  const missingSecrets = missingSecretNames(preflight, inventory);
  const guideItems =
    preflight?.action_guide && preflight.action_guide.length > 0
      ? preflight.action_guide
      : actionGuideItems({
          blockers,
          missingSecrets,
          target,
          env
        });
  const state = !preflight
    ? "not_checked"
    : guideItems.length === 0
      ? "ready"
      : preflight.status;

  return (
    <div
      className="space-y-3 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2"
      data-testid="preflight-action-guide"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Deployment Readiness Guide
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {workloadName} / {target} / {env || "unset"}
          </div>
        </div>
        <StateBadge state={state} />
      </div>
      {!preflight && (
        <div className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
          Run preflight to check secrets, deployment records, worker dispatch,
          runtime reachability, and runtime boundary declarations.
        </div>
      )}
      {preflight && guideItems.length === 0 && (
        <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
          This workload is ready from the control-plane perspective. Continue
          with deploy/apply guidance or start a session from Agent Console.
        </div>
      )}
      {guideItems.length > 0 && (
        <div className="grid gap-2">
          {guideItems.map((item) => (
            <div key={item.title} className="rounded border border-slate-800 bg-[#050811] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-200">{item.title}</div>
                <StateBadge state={item.state} />
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {item.detail}
              </div>
              {item.command && (
                <code className="mt-2 block whitespace-pre-wrap rounded border border-slate-800 bg-slate-950/70 px-2 py-1 text-[10px] text-sky-300">
                  {item.command}
                </code>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ActionGuideItem = {
  title: string;
  detail: string;
  state: string;
  command?: string;
};

function actionGuideItems({
  blockers,
  missingSecrets,
  target,
  env
}: {
  blockers: PreflightCheck[];
  missingSecrets: string[];
  target: string;
  env: string;
}): ActionGuideItem[] {
  const items: ActionGuideItem[] = [];
  if (missingSecrets.length > 0) {
    const names = missingSecrets.join(", ");
    const localSecretLines = missingSecrets.map((name) => `${name}=...`).join("\\n");
    const kubernetesSecretArgs = missingSecrets
      .map((name) => `--from-literal=${name}=...`)
      .join(" ");
    items.push({
      title: "Set Missing Secrets",
      detail:
        `Required secret names are missing: ${names}. Values stay outside the UI and API.`,
      state: "missing",
      command:
        target === "kubernetes"
          ? `kubectl create secret generic moiraweave-secrets ${kubernetesSecretArgs}`
          : `printf '${localSecretLines}\\n' >> .env`
    });
  }

  for (const check of blockers) {
    if (check.name === "secrets" && missingSecrets.length > 0) continue;
    if (check.name === "deployment_record") {
      items.push({
        title: "Sync Deployment Record",
        detail:
          check.remediation ||
          `Register or sync the ${target}/${env} deployment record after the runtime is deployed.`,
        state: check.status,
        command:
          target === "kubernetes"
            ? `moira deploy k8s --env ${env || "dev"} --register`
            : "moira deploy local --register"
      });
      continue;
    }
    if (check.name === "worker_dispatch") {
      items.push({
        title: "Restore Worker Dispatch",
        detail:
          check.remediation ||
          "The API cannot see an attached worker consumer for queued runs.",
        state: check.status,
        command: "docker compose logs worker"
      });
      continue;
    }
    if (check.name === "runtime_reachability") {
      items.push({
        title: "Fix Runtime Reachability",
        detail:
          check.remediation ||
          "The registered endpoint or probe did not respond from the control plane.",
        state: check.status,
        command: target === "kubernetes" ? "kubectl logs deploy/<workload>" : "docker compose logs <workload>"
      });
      continue;
    }
    if (check.name === "agent_adapter") {
      items.push({
        title: "Check Agent Adapter",
        detail:
          check.remediation ||
          "The workload adapter is not supported or is missing required configuration.",
        state: check.status
      });
      continue;
    }
    items.push({
      title: preflightCheckLabel(check.name),
      detail: check.remediation || check.message,
      state: check.status
    });
  }
  return items;
}

function missingSecretNames(
  preflight?: PreflightResponse | null,
  inventory?: SecretInventory
): string[] {
  const names = new Set<string>();
  inventory?.secrets
    .filter((secret) => !secret.present)
    .forEach((secret) => names.add(secret.name));
  const secretCheck = preflight?.checks.find((check) => check.name === "secrets");
  const missing = secretCheck?.metadata.missing;
  if (Array.isArray(missing)) {
    missing.forEach((name) => names.add(String(name)));
  }
  return [...names].sort();
}

function deploymentState(
  deployment: Deployment | undefined,
  deploymentRecord: PreflightCheck | undefined
): string {
  const badDeploymentStates = new Set(["failed", "lost", "unhealthy", "unreachable"]);
  if (deployment) {
    return badDeploymentStates.has(deployment.status) ? deployment.status : "deployed";
  }
  if (!deploymentRecord) return "missing";
  if (deploymentRecord.status === "passed") return "deployed";
  if (deploymentRecord.status === "failed") return "failed";
  return deploymentRecord.status;
}

function reachabilityState(reachability: PreflightCheck | undefined): string {
  if (!reachability) return "not_checked";
  if (reachability.status === "passed") return "reachable";
  if (reachability.status === "failed") return "unreachable";
  return reachability.status;
}

function operationNextAction({
  workloadName,
  target,
  env,
  deployment,
  health,
  preflight,
  firstBlockedCheck
}: {
  workloadName: string;
  target: string;
  env: string;
  deployment?: Deployment;
  health?: WorkloadHealth;
  preflight?: PreflightResponse | null;
  firstBlockedCheck?: PreflightCheck;
}): string {
  if (!workloadName) {
    return "Select a workload to inspect deployment state.";
  }
  if (!deployment) {
    return `Deploy or connect the runtime, then sync a ${target}/${env} deployment record.`;
  }
  if (firstBlockedCheck) {
    return firstBlockedCheck.remediation || firstBlockedCheck.message;
  }
  if (preflight && preflight.status !== "passed" && preflight.recommendations.length > 0) {
    return preflight.recommendations[0];
  }
  if (health && health.status !== "healthy" && health.recommendations.length > 0) {
    return health.recommendations[0];
  }
  if (!preflight) {
    return "Run preflight to verify secrets, worker dispatch, deployment records, and runtime reachability.";
  }
  return "No blocking action detected for the selected environment.";
}

export function PreflightSummary({ preflight }: { preflight: PreflightResponse }) {
  return (
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
              <span className="font-semibold text-slate-300">{preflightCheckLabel(check.name)}</span>
              <StateBadge state={check.status} />
            </div>
            <div className="mt-1 text-slate-400">{check.message}</div>
            <PreflightMetadata check={check} />
            {check.remediation && (
              <div className="mt-1 text-amber-300">{check.remediation}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const PREFLIGHT_CHECK_LABELS: Record<string, string> = {
  manifest: "Manifest",
  deployment_target: "Deployment Target",
  deployment_record: "Deployment Record",
  runtime_location: "Runtime Location",
  secrets: "Secrets",
  agent_adapter: "Agent Adapter",
  postgres: "Postgres",
  redis: "Redis",
  worker_dispatch: "Worker Dispatch",
  runtime_reachability: "Runtime Reachability",
  runtime_boundaries: "Runtime Boundaries"
};

function preflightCheckLabel(name: string): string {
  return PREFLIGHT_CHECK_LABELS[name] || name.split("_").map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

function PreflightMetadata({ check }: { check: PreflightCheck }) {
  const entries = preflightMetadataEntries(check);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([label, value]) => (
        <span key={`${label}:${value}`} className="rounded border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-300">
          <span className="text-slate-500">{label}</span> {value}
        </span>
      ))}
    </div>
  );
}

function preflightMetadataEntries(check: PreflightCheck): Array<[string, string]> {
  const metadata = check.metadata || {};
  if (check.name === "secrets") {
    return [
      ["required", listCount(metadata.required)],
      ["missing", listValue(metadata.missing)]
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }
  if (check.name === "worker_dispatch") {
    return [
      ["consumers", scalarValue(metadata.consumers)],
      ["pending", scalarValue(metadata.pending)],
      ["lag", scalarValue(metadata.lag)]
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }
  if (check.name === "runtime_reachability") {
    return [["endpoints", listValue(metadata.endpoints)]].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }
  if (check.name === "deployment_record") {
    return [
      ["target", scalarValue(metadata.target)],
      ["env", scalarValue(metadata.env)],
      ["status", scalarValue(metadata.status)],
      ["endpoint", scalarValue(metadata.endpoint)]
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }
  if (check.name === "runtime_boundaries") {
    return [
      ["owner", scalarValue(metadata.toolOwnership)],
      ["egress", scalarValue(metadata.networkEgress)],
      ["workspace", scalarValue(metadata.workspaceMount)],
      ["browser", scalarValue(metadata.browserMode)],
      ["terminal", scalarValue(metadata.terminalMode)],
      ["channels", listValue(metadata.exposedChannels)],
      ["external", listValue(metadata.externalOwnedChannels)]
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }
  return [];
}

function scalarValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function listValue(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value.map(String).join(", ");
}

function listCount(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  return String(value.length);
}

export function DeploymentPlanSummary({ plan }: { plan: DeploymentPlan }) {
  return (
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
  );
}

export function DeploymentOperationSummary({
  operation,
  events
}: {
  operation: DeploymentOperation;
  events: DeploymentOperationEvent[];
}) {
  const commands = [
    ...commandList(operation.metadata.log_commands),
    ...commandList(operation.metadata.action_commands)
  ];
  const nextActions = commandList(operation.metadata.next_actions);
  return (
    <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Operation" value={<span className="font-mono text-slate-300">{operation.operation_id.slice(0, 8)}</span>} />
        <Metric label="Action" value={<span className="text-slate-300">{operation.action}</span>} />
        <Metric label="Status" value={<StateBadge state={operation.status} />} />
      </div>
      {typeof operation.metadata.blocked_reason === "string" && (
        <div className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {operation.metadata.blocked_reason}
        </div>
      )}
      {commands.length > 0 && (
        <div className="space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Commands</span>
          {commands.map((command) => (
            <code key={command} className="block whitespace-pre-wrap rounded border border-slate-800 bg-[#050811] px-2 py-1 text-[10px] text-sky-300">
              {command}
            </code>
          ))}
        </div>
      )}
      {nextActions.length > 0 && (
        <div className="space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Next Actions</span>
          {nextActions.map((action) => (
            <div key={action} className="rounded border border-slate-800 bg-[#050811] px-2 py-1 text-[10px] text-slate-300">
              {action}
            </div>
          ))}
        </div>
      )}
      {events.map((event) => (
        <div key={event.id} className="rounded border border-slate-800 bg-[#050811] px-2 py-1 text-[10px] text-slate-400">
          <span className="font-semibold text-sky-300">{event.type}</span>
          <span className="mx-2 text-slate-700">/</span>
          {event.message}
        </div>
      ))}
    </div>
  );
}

function commandList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((item) => item.length > 0);
}

export function DeploymentsPanel({ deployments }: { deployments: Deployment[] }) {
  return (
    <Panel title="Deployments">
      <div className="divide-y divide-slate-800/50">
        {deployments.map((deployment) => (
          <div
            key={deployment.deployment_id}
            className="grid gap-3 p-5 text-sm md:grid-cols-[1fr_100px_100px_120px_1fr]"
          >
            <span className="font-bold text-slate-200">{deployment.workload_name}</span>
            <span className="text-xs text-slate-400">{deployment.target}</span>
            <span className="text-xs text-slate-400">{deployment.env}</span>
            <StateBadge state={deployment.status} />
            <span className="break-all font-mono text-[10px] text-slate-500">{deployment.endpoint || "-"}</span>
          </div>
        ))}
        {deployments.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">No deployment records yet</div>
        )}
      </div>
    </Panel>
  );
}

export function DeploymentOperationsPanel({
  operations,
  selectedOperationId,
  onSelect
}: {
  operations: DeploymentOperation[];
  selectedOperationId?: string;
  onSelect: (operation: DeploymentOperation) => void;
}) {
  return (
    <Panel title="Deployment Operations">
      <div className="divide-y divide-slate-800/50">
        {operations.map((item) => (
          <button
            key={item.operation_id}
            className={`grid w-full gap-3 p-5 text-left text-sm transition-colors md:grid-cols-[110px_1fr_90px_90px_100px_120px_160px] ${
              selectedOperationId === item.operation_id
                ? "bg-emerald-500/5"
                : "hover:bg-slate-800/10"
            }`}
            onClick={() => onSelect(item)}
          >
            <span className="font-mono text-[10px] font-semibold text-sky-300">
              {item.operation_id.slice(0, 8)}
            </span>
            <span className="font-bold text-slate-200">{item.workload_name}</span>
            <span className="text-xs text-slate-400">{item.target}</span>
            <span className="text-xs text-slate-400">{item.env}</span>
            <span className="text-xs text-slate-400">{item.action}</span>
            <StateBadge state={item.status} />
            <span className="text-[10px] text-slate-500">{formatDate(item.created_at)}</span>
          </button>
        ))}
        {operations.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">
            No deployment operations recorded
          </div>
        )}
      </div>
    </Panel>
  );
}

export function ControllerQueuePanel({
  operations,
  target,
  env,
  onSelect
}: {
  operations: DeploymentOperation[];
  target: string;
  env: string;
  onSelect: (operation: DeploymentOperation) => void;
}) {
  const controllerOperations = operations.filter(
    (operation) =>
      isControllerOperation(operation) &&
      ["queued", "running"].includes(operation.status)
  );
  const queued = controllerOperations.filter((operation) => operation.status === "queued");
  const running = controllerOperations.filter((operation) => operation.status === "running");
  const controllerTarget = target || controllerOperations[0]?.target || "kubernetes";
  const controllerEnv = env || controllerOperations[0]?.env || "dev";
  const namespace = controllerEnv === "local" ? "moiraweave" : `moiraweave-${controllerEnv}`;
  const cliCommand = `moira deploy controller run --target ${controllerTarget} --env ${controllerEnv} --watch`;
  const secretCommand = `kubectl create secret generic moiraweave-controller-token --from-literal=MOIRA_TOKEN=<admin-token> --namespace ${namespace}`;
  const helmCommand = `helm upgrade --install moiraweave oci://ghcr.io/moiraweave-labs/charts/moiraweave --namespace ${namespace} --create-namespace --set deploymentController.enabled=true`;

  return (
    <Panel title="Controller Queue">
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Queued" value={<span className="font-mono text-slate-300">{queued.length}</span>} />
          <Metric label="Running" value={<span className="font-mono text-slate-300">{running.length}</span>} />
          <Metric label="Target / Env" value={<span className="text-slate-300">{controllerTarget} / {controllerEnv}</span>} />
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-[11px] text-sky-100">
          <div>
            Kubernetes Apply, Logs, and Undeploy operations stay queued until a CLI
            controller or in-cluster controller processes them.
          </div>
          <div className="mt-3 grid gap-2">
            <ControllerCommand label="Operator shell" command={cliCommand} />
            <ControllerCommand label="Token secret" command={secretCommand} />
            <ControllerCommand label="In-cluster controller" command={helmCommand} />
          </div>
        </div>
        <div className="divide-y divide-slate-800/50 rounded-lg border border-slate-800 bg-[#050811]">
          {controllerOperations.map((operation) => (
            <button
              key={operation.operation_id}
              type="button"
              className="grid w-full gap-3 p-3 text-left text-xs transition-colors hover:bg-slate-800/30 md:grid-cols-[90px_1fr_80px_80px_120px]"
              onClick={() => onSelect(operation)}
            >
              <span className="font-mono text-[10px] font-semibold text-sky-300">
                {operation.operation_id.slice(0, 8)}
              </span>
              <span className="font-semibold text-slate-200">{operation.workload_name}</span>
              <span className="text-slate-400">{operation.action}</span>
              <StateBadge state={operation.status} />
              <span className="text-[10px] text-slate-500">{formatDate(operation.updated_at || operation.created_at)}</span>
            </button>
          ))}
          {controllerOperations.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">
              No queued or running controller operations for the selected filters.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ControllerCommand({ label, command }: { label: string; command: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[130px_1fr] md:items-start">
      <span className="text-[10px] font-semibold uppercase text-sky-200">
        {label}
      </span>
      <code className="whitespace-pre-wrap break-words rounded border border-slate-800 bg-slate-950/70 px-2 py-1 text-[10px] text-sky-300">
        {command}
      </code>
    </div>
  );
}

function isControllerOperation(operation: DeploymentOperation): boolean {
  return (
    operation.metadata.executor === "controller" ||
    operation.metadata.controller_required === true ||
    typeof operation.metadata.controller === "object"
  );
}

export type AuditEventFilters = {
  action: string;
  resourceType: string;
  resourceId: string;
};

export function AuditEventsPanel({
  events,
  filters,
  isLoading,
  error,
  onFiltersChange
}: {
  events: AuditEvent[];
  filters: AuditEventFilters;
  isLoading: boolean;
  error: unknown;
  onFiltersChange: (filters: AuditEventFilters) => void;
}) {
  return (
    <Panel title="Audit Trail">
      <div className="grid gap-3 border-b border-slate-800/50 p-5 md:grid-cols-3">
        <AuditFilterInput
          label="Action"
          placeholder="run.cancel"
          value={filters.action}
          onChange={(action) => onFiltersChange({ ...filters, action })}
        />
        <AuditFilterInput
          label="Resource Type"
          placeholder="run, artifact..."
          value={filters.resourceType}
          onChange={(resourceType) => onFiltersChange({ ...filters, resourceType })}
        />
        <AuditFilterInput
          label="Resource ID"
          placeholder="id"
          value={filters.resourceId}
          onChange={(resourceId) => onFiltersChange({ ...filters, resourceId })}
        />
      </div>
      {Boolean(error) && (
        <div className="p-5">
          <ErrorMessage error={error} fallback="Unable to load audit events." />
        </div>
      )}
      <div className="divide-y divide-slate-800/50">
        {events.map((event) => (
          <div
            key={event.event_id}
            className="grid gap-3 p-5 text-sm md:grid-cols-[160px_1fr_150px_1fr]"
          >
            <div>
              <div className="font-mono text-[10px] font-semibold text-sky-300">
                {event.event_id}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {formatDate(event.timestamp)}
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">{event.action}</div>
              <div className="mt-1 break-all font-mono text-[10px] text-slate-500">
                {event.actor}
              </div>
            </div>
            <div>
              <StateBadge state={event.resource_type} />
              <div className="mt-1 break-all font-mono text-[10px] text-slate-500">
                {event.resource_id}
              </div>
            </div>
            <pre className="max-h-24 overflow-auto rounded border border-slate-900 bg-[#050811] p-2 text-[10px] text-emerald-400/80">
              {JSON.stringify(event.metadata || {}, null, 2)}
            </pre>
          </div>
        ))}
        {events.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">
            {isLoading ? "Loading audit events..." : "No audit events match the current filters"}
          </div>
        )}
      </div>
    </Panel>
  );
}

function AuditFilterInput({
  label,
  placeholder,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function OperationError({
  error,
  fallback
}: {
  error: unknown;
  fallback: string;
}) {
  if (!error) return null;
  return (
    <div className="sm:col-span-2">
      <ErrorMessage error={error} fallback={fallback} />
    </div>
  );
}
