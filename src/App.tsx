import logoUrl from "./logo.svg";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  Bot,
  Box,
  CheckCircle2,
  CircleStop,
  Download,
  FileText,
  LogIn,
  LogOut,
  Play,
  Plus,
  RefreshCcw,
  Send,
  Server,
  XCircle,
  Clock,
  Terminal,
  Layers,
  MessageSquare,
  Clipboard,
  Cpu,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import {
  WorkloadTemplate,
  api,
  clearToken,
  getToken,
  setToken,
  streamRunEvents
} from "./api";
import type {
  Artifact,
  AgentSession,
  DeploymentOperation,
  DeploymentPlan,
  PreflightResponse,
  RunEvent,
  RunResponse,
  RunStatus
} from "./api";
import { useAuthProfile } from "./auth";
import {
  SAMPLE_DEPLOYMENT_METADATA,
  SAMPLE_RUN_PAYLOAD,
  SAMPLE_WORKLOAD
} from "./constants";
import {
  ChannelPills,
  ErrorMessage,
  HealthTile,
  Metric,
  Panel,
  PermissionNotice,
  RowMessage,
  StateBadge,
  WorkloadHealthBadge
} from "./components/common";
import { MessageBubble } from "./components/MessageBubble";
import {
  agentAdapter,
  agentChannels,
  formatBytes,
  formatDate,
  formatError,
  isServedArtifactUri,
  mergeEvents
} from "./utils";

function Shell() {
  const [token, updateToken] = useState(getToken());
  const auth = useAuthProfile();
  const nav = [
    { to: "/", label: "Workloads", icon: Box },
    { to: "/runs", label: "Runs", icon: Activity },
    { to: "/agents", label: "Agents", icon: Bot },
    { to: "/artifacts", label: "Artifacts", icon: Archive },
    { to: "/health", label: "Operations", icon: Server }
  ];

  function onTokenChange(next: string) {
    updateToken(next);
    setToken(next);
  }

  function logout() {
    clearToken();
    updateToken("");
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md md:block z-30">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6">
          <img src={logoUrl} className="h-8 w-8 object-contain" alt="MoiraWeave Logo" />
          <div>
            <span className="block text-sm font-bold tracking-wider text-white">MoiraWeave</span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-tight uppercase">Control Plane</span>
          </div>
        </div>
        <nav className="space-y-1.5 p-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/5 border-l-2 border-emerald-500 text-emerald-400 shadow-glow"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <main className="md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 bg-[#070a13]/80 px-6 py-3 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 md:hidden">
              <img src={logoUrl} className="h-7 w-7 object-contain" alt="MoiraWeave Logo" />
              <span className="font-bold text-white">MoiraWeave</span>
            </div>
            <div className="hidden text-xs font-medium text-slate-400 md:block">
              Self-hosted AI workload and agent operations platform
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {token && (
              <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-1.5 text-xs text-slate-300 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="truncate font-semibold text-slate-200">
                  {auth.subject || "Checking token"}
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {auth.role || "..."}
                </span>
                {auth.profile.data?.credential_type === "api_key" && (
                  <KeyRound className="h-3.5 w-3.5 text-sky-400" />
                )}
              </div>
            )}
            <div className="relative flex min-w-0 max-w-xl flex-1 items-center md:flex-none md:w-80">
              <input
                className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                value={token}
                onChange={(event) => onTokenChange(event.target.value)}
                placeholder="Bearer token"
              />
            </div>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#0e1322] text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              onClick={logout}
              title="Clear token"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="mx-auto max-w-7xl p-6">
          {!token ? (
            <Login onLogin={onTokenChange} />
          ) : auth.profile.error ? (
            <Panel title="Invalid Credential">
              <div className="space-y-3 p-6 text-sm text-slate-300">
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>The current bearer token could not be resolved. Sign in again or paste a valid API key.</span>
                </div>
              </div>
            </Panel>
          ) : (
            <Routes>
              <Route path="/" element={<Workloads />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:runId" element={<RunDetail />} />
              <Route path="/agents" element={<AgentConsole />} />
              <Route path="/artifacts" element={<Artifacts />} />
              <Route path="/health" element={<Health />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: (token) => onLogin(token.access_token)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <div className="mx-auto max-w-md mt-12">
      <Panel title="Sign In to MoiraWeave">
        <form className="space-y-4 p-6" onSubmit={submit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </div>
          {login.error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>Login failed. Please check credentials.</span>
            </div>
          )}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-500/10">
            <LogIn className="h-4 w-4" />
            Sign in
          </button>
        </form>
      </Panel>
    </div>
  );
}

function Workloads() {
  const queryClient = useQueryClient();
  const { canAdmin } = useAuthProfile();
  const [draft, setDraft] = useState(SAMPLE_WORKLOAD);
  const [templateId, setTemplateId] = useState("demo-agent");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["workloads"],
    queryFn: api.workloads
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: api.templates
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
    mutationFn: () => api.createWorkloadFromTemplate(templateId, templateParams),
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
                <th className="px-5 py-3">Image</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading && <RowMessage colSpan={6} text="Loading workloads..." />}
              {error && <RowMessage colSpan={6} text="Request failed" />}
              {data.map((workload) => (
                <tr key={workload.name} className="hover:bg-slate-800/10 transition-colors align-top">
                  <td className="px-5 py-4 font-bold text-slate-200">{workload.name}</td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-300">
                    <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700/50">{workload.type}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">{workload.execution_mode}</td>
                  <td className="max-w-md truncate px-5 py-4 text-xs text-slate-500 font-mono">
                    {workload.image || "-"}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {agentAdapter(workload.manifest) ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                        <Bot className="h-3 w-3" />
                        {agentAdapter(workload.manifest)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    <WorkloadHealthBadge name={workload.name} />
                  </td>
                </tr>
              ))}
              {data.length === 0 && !isLoading && <RowMessage colSpan={6} text="No workloads registered" />}
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
              disabled={!canAdmin || !templateId || createFromTemplate.isPending}
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
                className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {(templates.data || []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedTemplate && (
              <TemplateSummary template={selectedTemplate} />
            )}
            <div className="grid gap-3">
              {(selectedTemplate?.parameters || []).map((parameter) => (
                <div key={parameter.name}>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {parameter.label}
                  </label>
                  {parameter.options.length > 0 ? (
                    <select
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
                    to={`/health?workload=${encodeURIComponent(createdWorkload.name)}`}
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
  return (
    <div className="rounded-lg border border-slate-800/80 bg-[#0b0f19]/50 p-3">
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
    </div>
  );
}

function Runs() {
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
    const active = data.filter(r => ["running", "starting"].includes(r.status)).length;
    const succeeded = data.filter(r => r.status === "succeeded").length;
    const failed = data.filter(r => ["failed", "lost"].includes(r.status)).length;
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

      {/* Metrics Summary widgets */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Runs</span>
            <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/20 text-blue-400">
              <Layers className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.total}</div>
        </div>
        
        <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</span>
            <div className="rounded-lg bg-sky-500/10 p-2 border border-sky-500/20 text-sky-400">
              <Cpu className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-100">{metrics.active}</div>
            {metrics.active > 0 && (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-ping" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Succeeded</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.succeeded}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1322]/40 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed</span>
            <div className="rounded-lg bg-red-500/10 p-2 border border-red-500/20 text-red-400">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.failed}</div>
        </div>
      </div>

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

function RunsTable({ runs }: { runs: RunStatus[] }) {
  return (
    <Panel title="Runs History">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#0b0f19]/40 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Run ID</th>
              <th className="px-5 py-3.5">Workload</th>
              <th className="px-5 py-3.5">State</th>
              <th className="px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">Last Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {runs.map((run) => (
              <tr key={run.run_id} className="hover:bg-slate-800/10 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs">
                  <Link 
                    className="text-steel font-semibold hover:text-sky-300 hover:underline transition-colors" 
                    to={`/runs/${run.run_id}`}
                  >
                    {run.run_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-300">{run.workload_name}</td>
                <td className="px-5 py-3.5">
                  <StateBadge state={run.status} />
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(run.created_at)}</td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(run.heartbeat_at)}</td>
              </tr>
            ))}
            {runs.length === 0 && <RowMessage colSpan={5} text="No runs found" />}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RunDetail() {
  const { runId = "" } = useParams();
  const queryClient = useQueryClient();
  const { canOperate } = useAuthProfile();
  const [streamedEvents, setStreamedEvents] = useState<RunEvent[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  
  const run = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.run(runId),
    enabled: Boolean(runId),
    refetchInterval: 3000
  });
  const events = useQuery({
    queryKey: ["events", runId],
    queryFn: () => api.events(runId),
    enabled: Boolean(runId)
  });
  const artifacts = useQuery({
    queryKey: ["artifacts", runId],
    queryFn: () => api.artifacts(runId),
    enabled: Boolean(runId)
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelRun(runId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["run", runId] })
  });

  useEffect(() => {
    if (!runId) return undefined;
    setStreamedEvents([]);
    const controller = streamRunEvents(runId, (event) => {
      setStreamedEvents((current) =>
        current.some((item) => item.id === event.id) ? current : [...current, event]
      );
    });
    return () => controller.abort();
  }, [runId]);

  const timeline = mergeEvents(events.data || [], streamedEvents);
  const current = run.data;
  const producedArtifacts = artifacts.data || [];
  const selectedArtifact = useMemo(
    () =>
      producedArtifacts.find((artifact) => artifact.id === selectedArtifactId) ||
      producedArtifacts[0] ||
      null,
    [producedArtifacts, selectedArtifactId]
  );

  useEffect(() => {
    if (producedArtifacts.length === 0) {
      setSelectedArtifactId(null);
      return;
    }
    if (!producedArtifacts.some((artifact) => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(producedArtifacts[0].id);
    }
  }, [producedArtifacts, selectedArtifactId]);

  // Custom function to return styled icons for each event type
  const getEventIcon = (type: string) => {
    if (type.includes("start") || type.includes("init")) return <Play className="h-3 w-3 text-sky-400" />;
    if (type.includes("error") || type.includes("fail")) return <XCircle className="h-3 w-3 text-red-400" />;
    if (type.includes("success") || type.includes("complete")) return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (type.includes("message")) return <MessageSquare className="h-3 w-3 text-indigo-400" />;
    return <Clock className="h-3 w-3 text-slate-400" />;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <Panel
          title={`Run: ${runId.slice(0, 8)}`}
          action={
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => cancel.mutate()}
              disabled={!canOperate || !current || ["succeeded", "failed", "canceled", "lost"].includes(current.status)}
            >
              <CircleStop className="h-3.5 w-3.5" />
              Cancel Execution
            </button>
          }
        >
          <div className="grid gap-4 p-5 grid-cols-2 md:grid-cols-4 bg-[#0b0f19]/30">
            <Metric label="State" value={current ? <StateBadge state={current.status} /> : "-"} />
            <Metric label="Workload" value={current ? <span className="font-semibold text-slate-200">{current.workload_name}</span> : "-"} />
            <Metric label="Created" value={<span className="text-xs text-slate-400">{formatDate(current?.created_at)}</span>} />
            <Metric label="Heartbeat" value={<span className="text-xs text-slate-400">{formatDate(current?.heartbeat_at)}</span>} />
          </div>
        </Panel>

        <Panel title="Event Timeline">
          <div className="p-6">
            <div className="relative border-l-2 border-slate-800/80 ml-2.5 space-y-6">
              {timeline.map((event) => (
                <div key={event.id} className="relative pl-7 group">
                  {/* Timeline Dot with Icon */}
                  <div className="absolute -left-[14px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-[#070a13] group-hover:border-slate-600 transition-colors">
                    {getEventIcon(event.type)}
                  </div>
                  
                  <div className="grid gap-1 md:grid-cols-[160px_1fr]">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">{event.type}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(event.timestamp)}</span>
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-900/20 rounded-lg p-2.5 border border-slate-800/40">
                      {event.message}
                    </div>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-500">No events recorded for this run</div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Payload & Result JSON">
          <div className="p-4 bg-[#050811] rounded-b-xl border-t border-slate-900">
            <pre className="max-h-96 overflow-auto font-mono text-[10px] text-sky-400/90 leading-normal scrollbar-thin">
              {JSON.stringify(
                { payload: current?.payload || {}, result: current?.result || {}, error: current?.error },
                null,
                2
              )}
            </pre>
          </div>
        </Panel>

        <Panel title="Produced Artifacts">
          <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
            {producedArtifacts.map((artifact) => (
              <button
                key={artifact.id}
                className={`block w-full p-4 text-left transition-colors ${
                  selectedArtifact?.id === artifact.id
                    ? "bg-emerald-500/5"
                    : "hover:bg-slate-800/10"
                }`}
                onClick={() => setSelectedArtifactId(artifact.id)}
              >
                <div className="font-semibold text-xs text-slate-200">{artifact.name}</div>
                <div className="break-all font-mono text-[10px] text-slate-500 mt-1">{artifact.uri}</div>
              </button>
            ))}
            {producedArtifacts.length === 0 && (
              <div className="p-5 text-center text-xs text-slate-500">No artifacts generated</div>
            )}
          </div>
        </Panel>
        {selectedArtifact && <ArtifactDetails artifact={selectedArtifact} />}
      </div>
    </div>
  );
}

function AgentConsole() {
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
      {/* Session list panel */}
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

      {/* Chat workspace panel */}
      <Panel title={selected ? `Chat Session: ${selected.session_id.slice(0, 8)}` : "Chat Workspace"}>
        <div className="flex min-h-[500px] flex-col bg-[#0b0f19]/25 rounded-b-xl border-t border-slate-900">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[460px]">
            {(history.data || []).map((item) => (
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

function Artifacts() {
  const workloads = useQuery({ queryKey: ["workloads"], queryFn: api.workloads });
  const [searchParams, setSearchParams] = useSearchParams();
  const [workload, setWorkload] = useState(() => searchParams.get("workload_name") || "");
  const [sessionId, setSessionId] = useState(() => searchParams.get("session_id") || "");
  const [runId, setRunId] = useState(() => searchParams.get("run_id") || "");
  const [contentType, setContentType] = useState(() => searchParams.get("content_type") || "");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  useEffect(() => {
    const next = new URLSearchParams();
    if (workload) next.set("workload_name", workload);
    if (sessionId) next.set("session_id", sessionId);
    if (runId) next.set("run_id", runId);
    if (contentType) next.set("content_type", contentType);
    setSearchParams(next, { replace: true });
  }, [contentType, runId, sessionId, setSearchParams, workload]);
  const artifacts = useQuery({
    queryKey: ["artifact-library", workload, sessionId, runId, contentType],
    queryFn: () =>
      api.artifactLibrary({
        workload_name: workload || undefined,
        session_id: sessionId || undefined,
        run_id: runId || undefined,
        content_type: contentType || undefined
      }),
    refetchInterval: 5000
  });
  const discoveredArtifacts = artifacts.data || [];
  const selectedArtifact = useMemo(
    () =>
      discoveredArtifacts.find((artifact) => artifact.id === selectedArtifactId) ||
      discoveredArtifacts[0] ||
      null,
    [discoveredArtifacts, selectedArtifactId]
  );
  useEffect(() => {
    if (discoveredArtifacts.length === 0) {
      setSelectedArtifactId(null);
      return;
    }
    if (!discoveredArtifacts.some((artifact) => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(discoveredArtifacts[0].id);
    }
  }, [discoveredArtifacts, selectedArtifactId]);
  return (
    <div className="space-y-6">
      <Panel title="Artifact Library Filters">
        <div className="grid gap-3 p-5 md:grid-cols-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Workload</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
              value={workload}
              onChange={(event) => setWorkload(event.target.value)}
            >
              <option value="">All workloads</option>
              {(workloads.data || []).map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Session ID</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="optional"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Run ID</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
              value={runId}
              onChange={(event) => setRunId(event.target.value)}
              placeholder="optional"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Content Type</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              placeholder="application/json"
            />
          </div>
        </div>
      </Panel>
      
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel title="Discovered Artifacts">
          <div className="divide-y divide-slate-800/50">
            {discoveredArtifacts.map((artifact) => (
              <button
                key={artifact.id}
                className={`grid w-full items-center gap-2 p-5 text-left text-sm transition-colors md:grid-cols-[180px_120px_140px_1fr] ${
                  selectedArtifact?.id === artifact.id
                    ? "bg-emerald-500/5"
                    : "hover:bg-slate-800/10"
                }`}
                onClick={() => setSelectedArtifactId(artifact.id)}
              >
                <span className="font-bold text-xs text-slate-200">{artifact.name}</span>
                <span className="font-mono text-[10px] font-semibold text-sky-300">
                  {artifact.run_id.slice(0, 8)}
                </span>
                <span className="text-[10px] text-slate-500">{artifact.content_type || "-"}</span>
                <span className="break-all font-mono text-[10px] text-slate-500">{artifact.uri}</span>
              </button>
            ))}
            {discoveredArtifacts.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No artifacts match the current filters
              </div>
            )}
          </div>
        </Panel>
        <div className="space-y-6">
          {selectedArtifact ? (
            <ArtifactDetails artifact={selectedArtifact} />
          ) : (
            <Panel title="Artifact Details">
              <div className="p-6 text-center text-xs text-slate-500">
                Select an artifact to inspect metadata
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactDetails({ artifact }: { artifact: Artifact }) {
  const metadata = artifact.metadata || {};
  const metadataText = JSON.stringify(metadata, null, 2);
  const hasMetadata = Object.keys(metadata).length > 0;
  const canServeContent = isServedArtifactUri(artifact.uri);
  const preview = useQuery({
    queryKey: ["artifact-preview", artifact.run_id, artifact.id],
    queryFn: () => api.artifactPreview(artifact.run_id, artifact.id),
    enabled: canServeContent,
    retry: false
  });
  const download = useMutation({
    mutationFn: () => api.downloadArtifact(artifact.run_id, artifact.id),
    onSuccess: (blob) => {
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = artifact.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    }
  });
  return (
    <Panel
      title="Artifact Details"
      action={
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
            onClick={() => void navigator.clipboard.writeText(artifact.uri)}
          >
            <Clipboard className="h-3 w-3" />
            URI
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
            onClick={() => void navigator.clipboard.writeText(metadataText)}
          >
            <Clipboard className="h-3 w-3" />
            Metadata
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            onClick={() => download.mutate()}
            disabled={!canServeContent || download.isPending}
          >
            <Download className="h-3 w-3" />
            File
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5 text-xs">
        <div>
          <div className="font-bold text-slate-200">{artifact.name}</div>
          <div className="mt-1 break-all font-mono text-[10px] text-slate-500">{artifact.uri}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            label="Run"
            value={
              <Link className="font-mono text-sky-300 hover:underline" to={`/runs/${artifact.run_id}`}>
                {artifact.run_id.slice(0, 8)}
              </Link>
            }
          />
          <Metric label="Type" value={<span className="text-slate-300">{artifact.content_type || "-"}</span>} />
          <Metric label="Size" value={<span className="text-slate-300">{formatBytes(artifact.size_bytes)}</span>} />
          <Metric label="Created" value={<span className="text-slate-400">{formatDate(artifact.created_at)}</span>} />
        </div>
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Metadata Preview
          </span>
          {hasMetadata ? (
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-900 bg-[#050811] p-4 font-mono text-[10px] leading-normal text-emerald-400/90">
              {metadataText}
            </pre>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-[#050811] p-4 text-center text-xs text-slate-500">
              No artifact metadata recorded
            </div>
          )}
        </div>
        <div>
          <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <FileText className="h-3 w-3" />
            Content Preview
          </span>
          {!canServeContent ? (
            <div className="rounded-lg border border-slate-800 bg-[#050811] p-4 text-center text-xs text-slate-500">
              This artifact URI is not served by the API. Use the runtime or
              external storage owner to inspect it.
            </div>
          ) : preview.isLoading ? (
            <div className="rounded-lg border border-slate-800 bg-[#050811] p-4 text-center text-xs text-slate-500">
              Loading preview...
            </div>
          ) : preview.data ? (
            <div className="space-y-2">
              <pre className="max-h-72 overflow-auto rounded-lg border border-slate-900 bg-[#050811] p-4 font-mono text-[10px] leading-normal text-sky-300/90">
                {preview.data.text}
              </pre>
              {preview.data.truncated && (
                <div className="text-[10px] text-amber-300">
                  Preview truncated. Full file size:{" "}
                  {formatBytes(preview.data.size_bytes)}.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-[#050811] p-4 text-center text-xs text-slate-500">
              Preview unavailable for this file. The content may be binary,
              missing, or outside the configured artifact storage.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Health() {
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

export default function App() {
  return <Shell />;
}
