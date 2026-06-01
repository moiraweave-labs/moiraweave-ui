import type {
  Deployment,
  DeploymentOperation,
  DeploymentOperationEvent,
  DeploymentPlan,
  PreflightResponse,
  SecretInventory,
  WorkloadHealth
} from "../api";
import { formatDate, formatError } from "../utils";
import { ErrorMessage, Metric, Panel, PermissionNotice, StateBadge } from "./common";

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
  );
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
  return (
    <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#0b0f19]/60 p-3 text-xs sm:col-span-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Operation" value={<span className="font-mono text-slate-300">{operation.operation_id.slice(0, 8)}</span>} />
        <Metric label="Action" value={<span className="text-slate-300">{operation.action}</span>} />
        <Metric label="Status" value={<StateBadge state={operation.status} />} />
      </div>
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

export function DeploymentsPanel({ deployments }: { deployments: Deployment[] }) {
  return (
    <Panel title="Deployments">
      <div className="divide-y divide-slate-800/50">
        {deployments.map((deployment) => (
          <div key={deployment.deployment_id} className="grid gap-3 p-5 text-sm md:grid-cols-[1fr_120px_120px_1fr]">
            <span className="font-bold text-slate-200">{deployment.workload_name}</span>
            <span className="text-xs text-slate-400">{deployment.target}</span>
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
            className={`grid w-full gap-3 p-5 text-left text-sm transition-colors md:grid-cols-[110px_1fr_120px_120px_160px] ${
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
