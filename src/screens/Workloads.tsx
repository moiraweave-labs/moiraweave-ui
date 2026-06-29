import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Clipboard, Plus, Server } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { WorkloadTemplate } from "../api";
import { useAuthProfile } from "../auth";
import { SAMPLE_WORKLOAD } from "../constants";
import {
  ChannelPills,
  ErrorMessage,
  Panel,
  PermissionNotice,
  RowMessage,
  WorkloadHealthBadge
} from "../components/common";
import {
  agentAdapter,
  agentChannels,
  agentRuntimeSummary,
  stringList
} from "../utils";

export function Workloads() {
  const queryClient = useQueryClient();
  const { canAdmin } = useAuthProfile();
  const [draft, setDraft] = useState(SAMPLE_WORKLOAD);
  const [templateId, setTemplateId] = useState("demo-agent");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [teamId, setTeamId] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["workloads"],
    queryFn: api.workloads
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: api.templates
  });
  const teams = useQuery({
    queryKey: ["teams", "workload-scope"],
    queryFn: api.teams,
    enabled: canAdmin
  });
  const selectedTemplate = useMemo(
    () => (templates.data || []).find((item) => item.id === templateId),
    [templateId, templates.data]
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    const defaults: Record<string, string> = {};
    selectedTemplate.parameters.forEach((parameter) => {
      defaults[parameter.name] = String(parameter.default ?? "");
    });
    setTemplateParams(defaults);
  }, [selectedTemplate]);

  const register = useMutation({
    mutationFn: () => api.registerWorkload(JSON.parse(draft) as Record<string, unknown>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workloads"] })
  });
  const createFromTemplate = useMutation({
    mutationFn: () => api.createWorkloadFromTemplate(templateId, templateParams, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workloads"] });
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    }
  });
  const createdWorkload = createFromTemplate.data;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Panel title="Registered Workloads">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#0b0f19]/40 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Scope</th>
                <th className="px-5 py-3">Image</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Health</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading && <RowMessage colSpan={8} text="Loading workloads..." />}
              {error && (
                <tr>
                  <td className="px-5 py-5" colSpan={8}>
                    <ErrorMessage
                      error={error}
                      fallback="Unable to load workloads."
                    />
                  </td>
                </tr>
              )}
              {data.map((workload) => {
                const adapter = agentAdapter(workload.manifest);
                return (
                  <tr key={workload.name} className="hover:bg-slate-800/10 transition-colors align-top">
                    <td className="px-5 py-4 font-bold text-slate-200">{workload.name}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-300">
                      <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700/50">{workload.type}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">{workload.execution_mode}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {workload.team_id ? (
                        <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                          Team: {workload.team_id}
                        </span>
                      ) : (
                        <span className="rounded border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-slate-500">
                          Shared
                        </span>
                      )}
                    </td>
                    <td className="max-w-md truncate px-5 py-4 text-xs text-slate-500 font-mono">
                      {workload.image || "-"}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {adapter ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                          <Bot className="h-3 w-3" />
                          {adapter}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      <WorkloadHealthBadge name={workload.name} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-1 font-semibold text-slate-300 hover:bg-slate-800/60"
                          to={`/operations?workload=${encodeURIComponent(workload.name)}`}
                        >
                          <Server className="h-3 w-3" />
                          Operations
                        </Link>
                        {workload.type === "agent-service" && (
                          <Link
                            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-200 hover:bg-emerald-500/15"
                            to={`/agents?agent=${encodeURIComponent(workload.name)}`}
                          >
                            <Bot className="h-3 w-3" />
                            Console
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && !isLoading && !error && (
                <RowMessage colSpan={8} text="No workloads registered" />
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel
          title="Create Workload"
          action={
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !canAdmin ||
                !selectedTemplate ||
                templates.isLoading ||
                createFromTemplate.isPending
              }
              onClick={() => createFromTemplate.mutate()}
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          }
        >
          <div className="space-y-4 p-5">
            {!canAdmin && (
              <PermissionNotice minimumRole="admin" action="Creating workloads" />
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Template</label>
              <select
                aria-label="Workload template"
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                disabled={!canAdmin || templates.isLoading || templates.isError}
              >
                {(templates.data || []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            {templates.isLoading && (
              <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
                Loading workload templates...
              </p>
            )}
            {templates.error && (
              <ErrorMessage
                error={templates.error}
                fallback="Unable to load workload templates."
              />
            )}
            {selectedTemplate && (
              <TemplateSummary template={selectedTemplate} />
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Team scope
              </label>
              <select
                aria-label="Workload team"
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              >
                <option value="">Shared platform workload</option>
                {(teams.data || []).map((team) => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.name} ({team.team_id})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Team-scoped workloads are only visible and runnable by that team's members.
              </p>
              {teams.error && (
                <div className="mt-2">
                  <ErrorMessage
                    error={teams.error}
                    fallback="Unable to load team scopes."
                  />
                </div>
              )}
            </div>
            <div className="grid gap-3">
              {(selectedTemplate?.parameters || []).map((parameter) => (
                <div key={parameter.name}>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {parameter.label}
                  </label>
                  {parameter.options.length > 0 ? (
                    <select
                      aria-label={parameter.label}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                      value={templateParams[parameter.name] || ""}
                      onChange={(event) =>
                        setTemplateParams((current) => ({
                          ...current,
                          [parameter.name]: event.target.value
                        }))
                      }
                    >
                      {parameter.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      aria-label={parameter.label}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                      type={parameter.type === "number" ? "number" : "text"}
                      value={templateParams[parameter.name] || ""}
                      onChange={(event) =>
                        setTemplateParams((current) => ({
                          ...current,
                          [parameter.name]: event.target.value
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            {createFromTemplate.error && (
              <ErrorMessage error={createFromTemplate.error} fallback="Workload creation failed." />
            )}
            {createdWorkload && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <div className="font-semibold text-emerald-300">
                  Created {createdWorkload.name}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-200 hover:bg-emerald-500/15"
                    to={`/operations?workload=${encodeURIComponent(createdWorkload.name)}`}
                  >
                    <Server className="h-3 w-3" />
                    Run preflight
                  </Link>
                  {createdWorkload.type === "agent-service" && (
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-200 hover:bg-emerald-500/15"
                      to={`/agents?agent=${encodeURIComponent(createdWorkload.name)}`}
                    >
                      <Bot className="h-3 w-3" />
                      Open agent console
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Advanced Manifest"
          action={
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => register.mutate()}
              disabled={!canAdmin}
            >
              <Plus className="h-3.5 w-3.5" />
              Register
            </button>
          }
        >
          {!canAdmin && (
            <div className="p-4">
              <PermissionNotice minimumRole="admin" action="Registering manifests" />
            </div>
          )}
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <button
                onClick={() => setDraft(SAMPLE_WORKLOAD)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
                title="Reset to default"
              >
                Reset
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(draft)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
                title="Copy manifest code"
              >
                <Clipboard className="h-3 w-3 inline mr-1" /> Copy
              </button>
            </div>
            <textarea
              className="min-h-[320px] w-full resize-y bg-[#050811] p-4 font-mono text-[11px] text-emerald-400/90 border-0 outline-none rounded-b-xl focus:ring-1 focus:ring-slate-800"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
            />
          </div>
          {register.error && (
            <div className="border-t border-slate-800 p-4 bg-red-500/5">
              <ErrorMessage error={register.error} fallback="Manifest registration failed." />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TemplateSummary({ template }: { template: WorkloadTemplate }) {
  const details = templateDetails(template.manifest);
  return (
    <div
      className="rounded-lg border border-slate-800/80 bg-[#0b0f19]/50 p-3"
      data-testid="template-summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          {template.workload_type}
        </span>
        {template.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded border border-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{template.description}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <TemplateDetail label="Image" value={details.image || "-"} />
        <TemplateDetail label="Execution" value={details.execution || "-"} />
        <TemplateDetail label="Endpoint" value={details.endpoint || "-"} />
        <TemplateDetail label="Adapter" value={details.adapter || "-"} />
        <TemplateDetail label="Health" value={details.health || "-"} />
        <TemplateDetail label="Tool Owner" value={details.toolOwnership || "runtime"} />
        <TemplateDetail label="Ports" value={details.ports || "-"} />
        <TemplateDetail label="Secrets" value={details.secrets || "none"} />
        <TemplateDetail label="Persistence" value={details.persistence || "disabled"} />
        <TemplateDetail label="Workspace" value={details.workspace || "ephemeral"} />
        <TemplateDetail label="Runtime Boundaries" value={details.runtimeBoundaries || "-"} />
      </div>
      {details.hasChannels && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#050811] p-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              MoiraWeave Channels
            </span>
            <ChannelPills channels={details.channels.exposed} empty="None" tone="emerald" />
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#050811] p-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Runtime-Owned
            </span>
            <ChannelPills channels={details.channels.externalOwned} empty="None" tone="amber" />
          </div>
        </div>
      )}
      {details.runtimeCapabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {details.runtimeCapabilities.map((capability) => (
            <span
              key={capability.label}
              className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                capability.enabled
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-800 bg-slate-900/40 text-slate-500"
              }`}
            >
              {capability.label}: {capability.enabled ? "runtime" : "off"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#050811] p-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words font-mono text-[11px] text-slate-300">{value}</div>
    </div>
  );
}

function templateDetails(manifest?: Record<string, unknown> | null) {
  const spec = objectValue(manifest?.spec);
  const agent = objectValue(spec.agent);
  const runtime = agentRuntimeSummary(manifest || undefined);
  const deployment = objectValue(spec.deployment);
  const execution = objectValue(spec.execution);
  const ports = Array.isArray(spec.ports)
    ? spec.ports
        .map((item) => {
          const port = objectValue(item);
          const name = typeof port.name === "string" ? port.name : "port";
          return port.port ? `${name}:${port.port}` : "";
        })
        .filter(Boolean)
        .join(", ")
    : "";
  const firstPort = Array.isArray(spec.ports) ? objectValue(spec.ports[0]) : {};
  const serviceName =
    typeof deployment.serviceName === "string"
      ? deployment.serviceName
      : typeof manifest?.metadata === "object" &&
          manifest.metadata !== null &&
          "name" in manifest.metadata
        ? String((manifest.metadata as Record<string, unknown>).name)
        : "";
  const endpoint =
    typeof spec.endpoint === "string"
      ? spec.endpoint
      : typeof agent.baseUrl === "string"
        ? agent.baseUrl
        : serviceName && firstPort.port
          ? `http://${serviceName}:${firstPort.port}`
          : "";
  const secrets = [
    ...stringList(spec.secrets),
    ...stringList(agent.requiredSecrets)
  ].filter((secret, index, all) => all.indexOf(secret) === index);
  const persistence = objectValue(spec.persistence);
  const readinessProbe = objectValue(spec.readinessProbe);
  const channels = agentChannels(manifest || undefined);
  const persistenceLabel =
    persistence.enabled === true
      ? String(persistence.mountPath || "enabled")
      : "";
  const workspace =
    typeof agent.workspaceMount === "string"
      ? agent.workspaceMount
      : runtime.fields.find((field) => field.label === "Workspace")?.value || "";
  const executionMode = typeof execution.mode === "string" ? execution.mode : "";
  const deploymentMode = typeof deployment.mode === "string" ? deployment.mode : "";
  const health =
    typeof agent.statusPath === "string"
      ? agent.statusPath
      : readinessProbe.httpGet
        ? "readinessProbe:http"
        : readinessProbe.tcpSocket
          ? "readinessProbe:tcp"
          : "";

  return {
    image: typeof spec.image === "string" ? spec.image : "",
    execution: [executionMode, deploymentMode].filter(Boolean).join(" / "),
    endpoint,
    adapter: typeof agent.adapter === "string" ? agent.adapter : "",
    health,
    toolOwnership: runtime.toolOwnership,
    ports,
    secrets: secrets.join(", "),
    persistence: persistenceLabel,
    workspace,
    runtimeBoundaries: runtime.boundaryLabels.join(", "),
    runtimeCapabilities: runtime.capabilities,
    channels,
    hasChannels: channels.exposed.length > 0 || channels.externalOwned.length > 0
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
