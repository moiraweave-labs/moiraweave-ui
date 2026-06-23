export type WorkloadInfo = {
  name: string;
  type: string;
  execution_mode: string;
  image?: string | null;
  owner_subject?: string | null;
  team_id?: string | null;
  manifest: Record<string, unknown>;
};

export type RunStatus = {
  run_id: string;
  workload_name: string;
  status: string;
  user: string;
  created_at: string;
  updated_at?: string | null;
  heartbeat_at?: string | null;
  completed_at?: string | null;
  session_id?: string | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
};

export type RunResponse = {
  run_id: string;
  workload_name: string;
  status: string;
  created_at: string;
};

export type RunEvent = {
  id: string;
  run_id: string;
  timestamp: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
};

export type DeadLetterEntry = {
  message_id: string;
  source_stream: string;
  source_id: string;
  reason: string;
  payload: Record<string, unknown>;
  created_at?: string | null;
};

export type DeadLetterReplay = {
  message_id: string;
  replayed_message_id: string;
  run_id: string;
  workload_name: string;
  reason: string;
};

export type Artifact = {
  id: string;
  run_id: string;
  workload_name?: string | null;
  session_id?: string | null;
  name: string;
  uri: string;
  content_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type ArtifactPreview = {
  artifact_id: string;
  run_id: string;
  name: string;
  content_type?: string | null;
  text: string;
  truncated: boolean;
  size_bytes: number;
};

export type AgentSession = {
  session_id: string;
  agent_name: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type AgentSessionHealth = {
  session_id: string;
  agent_name: string;
  status: string;
  latest_run_status?: string | null;
  message_count: number;
};

export type AgentMessage = {
  message_id: string;
  session_id: string;
  role: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
  run_id?: string | null;
  run_status?: string | null;
  latest_event?: RunEvent | null;
  artifact_count?: number;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  subject: string;
  role: string;
};

export type AuthProfile = {
  subject: string;
  role: string;
  credential_type: string;
  api_key_id?: string | null;
  team_id?: string | null;
  teams: string[];
};

export type ApiKey = {
  key_id: string;
  name: string;
  subject: string;
  role: string;
  secret_prefix: string;
  created_by: string;
  created_at: string;
  team_id?: string | null;
  last_used_at?: string | null;
  revoked_at?: string | null;
};

export type ApiKeyCreateResponse = ApiKey & {
  secret: string;
};

export type UserAccount = {
  subject: string;
  display_name?: string | null;
  role: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  disabled_at?: string | null;
};

export type Team = {
  team_id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  team_id: string;
  subject: string;
  role: string;
  created_by: string;
  created_at: string;
};

export type EnvironmentInfo = {
  name: string;
  deployment_count: number;
  operation_count: number;
  workload_count: number;
};

export type Deployment = {
  deployment_id: string;
  workload_name: string;
  target: string;
  env: string;
  status: string;
  user: string;
  created_at: string;
  updated_at?: string | null;
  endpoint?: string | null;
  metadata: Record<string, unknown>;
};

export type DeploymentPlan = {
  workload_name: string;
  target: string;
  mode: string;
  service_name?: string | null;
  endpoint?: string | null;
  files: string[];
  commands: string[];
  notes: string[];
};

export type WorkloadHealth = {
  workload_name: string;
  status: string;
  reason: string;
  deployments: Deployment[];
  recommendations: string[];
};

export type WorkloadTemplateParameter = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string | null;
  options: string[];
};

export type WorkloadTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  workload_type: string;
  tags: string[];
  parameters: WorkloadTemplateParameter[];
  manifest?: Record<string, unknown> | null;
};

export type PreflightCheck = {
  name: string;
  status: string;
  message: string;
  remediation?: string | null;
  metadata: Record<string, unknown>;
};

export type PreflightAction = {
  title: string;
  state: string;
  detail: string;
  command?: string | null;
};

export type PreflightResponse = {
  workload_name: string;
  target: string;
  status: string;
  checks: PreflightCheck[];
  recommendations: string[];
  action_guide?: PreflightAction[];
};

export type SecretInventoryItem = {
  name: string;
  present: boolean;
  source: string;
  workloads: string[];
  references: string[];
  remediation?: string | null;
};

export type SecretInventory = {
  status: string;
  total: number;
  missing: number;
  secrets: SecretInventoryItem[];
};

export type DeploymentOperation = {
  operation_id: string;
  action: string;
  workload_name: string;
  target: string;
  env: string;
  status: string;
  user: string;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
  lease_expires_at?: string | null;
  controller_id?: string | null;
  heartbeat_at?: string | null;
  timeout_seconds?: number | null;
  stdout_summary?: string | null;
  stderr_summary?: string | null;
  metadata: Record<string, unknown>;
};

export type OperationsAlert = {
  id: string;
  severity: "info" | "warning" | "critical" | string;
  title: string;
  detail: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  env?: string | null;
  count: number;
  command?: string | null;
  metadata: Record<string, unknown>;
};

export type DeploymentOperationEvent = {
  id: string;
  operation_id: string;
  timestamp: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
};

export type AuditEvent = {
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function getToken(): string {
  return window.localStorage.getItem("moiraweave.token") || "";
}

export function setToken(token: string): void {
  window.localStorage.setItem("moiraweave.token", token);
}

export function clearToken(): void {
  window.localStorage.removeItem("moiraweave.token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return (await response.json()) as T;
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.blob();
}

export const api = {
  login: (username: string, password: string) =>
    request<TokenResponse>("/auth/token", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  me: () => request<AuthProfile>("/auth/me"),
  apiKeys: () => request<ApiKey[]>("/auth/api-keys"),
  createApiKey: (body: { name: string; subject: string; role: string; team_id?: string | null }) =>
    request<ApiKeyCreateResponse>("/auth/api-keys", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  rotateApiKey: (keyId: string) =>
    request<ApiKeyCreateResponse>(`/auth/api-keys/${encodeURIComponent(keyId)}/rotate`, {
      method: "POST"
    }),
  revokeApiKey: (keyId: string) =>
    request<ApiKey>(`/auth/api-keys/${encodeURIComponent(keyId)}`, {
      method: "DELETE"
    }),
  users: () => request<UserAccount[]>("/auth/users"),
  createUser: (body: {
    subject: string;
    password: string;
    role: string;
    display_name?: string | null;
  }) =>
    request<UserAccount>("/auth/users", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  disableUser: (subject: string) =>
    request<UserAccount>(`/auth/users/${encodeURIComponent(subject)}`, {
      method: "DELETE"
    }),
  enableUser: (subject: string) =>
    request<UserAccount>(`/auth/users/${encodeURIComponent(subject)}/enable`, {
      method: "POST"
    }),
  resetUserPassword: (subject: string, newPassword: string) =>
    request<UserAccount>(
      `/auth/users/${encodeURIComponent(subject)}/password/reset`,
      {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword })
      }
    ),
  teams: () => request<Team[]>("/auth/teams"),
  createTeam: (body: { team_id: string; name: string; description?: string | null }) =>
    request<Team>("/auth/teams", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  teamMembers: (teamId: string) =>
    request<TeamMember[]>(`/auth/teams/${encodeURIComponent(teamId)}/members`),
  addTeamMember: (teamId: string, body: { subject: string; role: string }) =>
    request<TeamMember>(`/auth/teams/${encodeURIComponent(teamId)}/members`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  removeTeamMember: (teamId: string, subject: string) =>
    request<TeamMember>(
      `/auth/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(subject)}`,
      { method: "DELETE" }
    ),
  workloads: () => request<WorkloadInfo[]>("/v1/workloads"),
  workload: (name: string) => request<WorkloadInfo>(`/v1/workloads/${name}`),
  templates: () => request<WorkloadTemplate[]>("/v1/templates"),
  secrets: (workload?: string) =>
    request<SecretInventory>(
      `/v1/secrets${workload ? `?workload_name=${encodeURIComponent(workload)}` : ""}`
    ),
  createWorkloadFromTemplate: (
    templateId: string,
    parameters: Record<string, unknown>,
    teamId?: string
  ) =>
    request<WorkloadInfo>("/v1/workloads/from-template", {
      method: "POST",
      body: JSON.stringify({
        template_id: templateId,
        parameters,
        ...(teamId ? { team_id: teamId } : {})
      })
    }),
  registerWorkload: (manifest: Record<string, unknown>) =>
    request<WorkloadInfo>("/v1/workloads", {
      method: "POST",
      body: JSON.stringify(manifest)
    }),
  deployments: (filters: { workload_name?: string; env?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<Deployment[]>(`/v1/deployments${suffix}`);
  },
  environments: () => request<EnvironmentInfo[]>("/v1/environments"),
  workloadHealth: (name: string, env?: string) =>
    request<WorkloadHealth>(
      `/v1/workloads/${name}/health${env ? `?env=${encodeURIComponent(env)}` : ""}`
    ),
  preflight: (workload: string, target: string, env = "dev") =>
    request<PreflightResponse>(`/v1/workloads/${workload}/preflight`, {
      method: "POST",
      body: JSON.stringify({ target, env })
    }),
  deploymentPlan: (workload: string, target: string, env = "dev") =>
    request<DeploymentPlan>(
      `/v1/workloads/${workload}/deployment-plan?target=${encodeURIComponent(
        target
      )}&env=${encodeURIComponent(env)}`
    ),
  recordDeployment: (
    workload: string,
    body: {
      target: string;
      env?: string;
      status: string;
      endpoint?: string;
      metadata?: Record<string, unknown>;
    }
  ) =>
    request<Deployment>(`/v1/workloads/${workload}/deployments`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  deploymentOperation: (body: {
    action: string;
    workload_name: string;
    target: string;
    env?: string;
    executor?: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<DeploymentOperation>("/v1/deployment-operations", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  deploymentOperations: (filters: {
    workload_name?: string;
    target?: string;
    env?: string;
    status?: string;
    action?: string;
    scope?: string;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<DeploymentOperation[]>(`/v1/deployment-operations${suffix}`);
  },
  deploymentOperationEvents: (id: string) =>
    request<DeploymentOperationEvent[]>(`/v1/deployment-operations/${id}/events`),
  operationsAlerts: (filters: { env?: string; scope?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<OperationsAlert[]>(`/v1/operations/alerts${suffix}`);
  },
  auditEvents: (filters: {
    action?: string;
    resource_type?: string;
    resource_id?: string;
    env?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<AuditEvent[]>(`/v1/audit-events${suffix}`);
  },
  runs: (filters: { workload_name?: string; env?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<RunStatus[]>(`/v1/runs${suffix}`);
  },
  submitRun: (workload: string, payload: Record<string, unknown>) =>
    request<RunResponse>(`/v1/workloads/${workload}/runs`, {
      method: "POST",
      body: JSON.stringify({ payload })
    }),
  deadLetters: (limit = 50) =>
    request<DeadLetterEntry[]>(`/v1/runs/dead-letter?limit=${limit}`),
  replayDeadLetter: (messageId: string) =>
    request<DeadLetterReplay>(
      `/v1/runs/dead-letter/${encodeURIComponent(messageId)}/replay`,
      { method: "POST" }
    ),
  purgeDeadLetter: (messageId: string) =>
    request<DeadLetterEntry>(
      `/v1/runs/dead-letter/${encodeURIComponent(messageId)}`,
      { method: "DELETE" }
    ),
  run: (id: string) => request<RunStatus>(`/v1/runs/${id}`),
  cancelRun: (id: string) => request<RunStatus>(`/v1/runs/${id}/cancel`, { method: "POST" }),
  events: (id: string) => request<RunEvent[]>(`/v1/runs/${id}/events`),
  artifacts: (id: string) => request<Artifact[]>(`/v1/runs/${id}/artifacts`),
  artifactPreview: (runId: string, artifactId: string, maxBytes = 65536) =>
    request<ArtifactPreview>(
      `/v1/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(
        artifactId
      )}/preview?max_bytes=${maxBytes}`
    ),
  downloadArtifact: (runId: string, artifactId: string) =>
    requestBlob(
      `/v1/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(
        artifactId
      )}/download`
    ),
  artifactLibrary: (filters: {
    workload_name?: string;
    env?: string;
    session_id?: string;
    run_id?: string;
    content_type?: string;
    created_from?: string;
    created_to?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<Artifact[]>(`/v1/artifacts${suffix}`);
  },
  health: () => request<Record<string, unknown>>("/health"),
  ready: () => request<Record<string, unknown>>("/ready"),
  createSession: (agent: string) =>
    request<AgentSession>(`/v1/agents/${agent}/sessions`, {
      method: "POST",
      body: JSON.stringify({ metadata: {} })
    }),
  sessions: (agent: string) => request<AgentSession[]>(`/v1/agents/${agent}/sessions`),
  sessionHealth: (agent: string, sessionId: string) =>
    request<AgentSessionHealth>(`/v1/agents/${agent}/sessions/${sessionId}/health`),
  message: (agent: string, sessionId: string, message: string) =>
    request<Record<string, unknown>>(`/v1/agents/${agent}/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, context: {} })
    }),
  channelMessage: (channel: string, agent: string, externalUserId: string, message: string) =>
    request<Record<string, unknown>>(`/v1/channels/${channel}/agents/${agent}/messages`, {
      method: "POST",
      body: JSON.stringify({
        external_user_id: externalUserId,
        message,
        metadata: {}
      })
    }),
  history: (agent: string, sessionId: string) =>
    request<AgentMessage[]>(`/v1/agents/${agent}/sessions/${sessionId}/messages`)
};

export function streamRunEvents(
  runId: string,
  onEvent: (event: RunEvent) => void,
  onError?: (error: unknown) => void,
  onOpen?: () => void
): AbortController {
  const controller = new AbortController();
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  void fetch(`${API_BASE}/v1/runs/${runId}/events/stream`, {
    headers,
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok || !response.body) throw new Error(response.statusText);
      onOpen?.();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          onEvent(JSON.parse(dataLine.slice(6)) as RunEvent);
        }
      }
    })
    .catch((error) => {
      if (!controller.signal.aborted) onError?.(error);
    });

  return controller;
}
