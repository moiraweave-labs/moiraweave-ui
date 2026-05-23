export type WorkloadInfo = {
  name: string;
  type: string;
  execution_mode: string;
  image?: string | null;
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

export type RunEvent = {
  id: string;
  run_id: string;
  timestamp: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
};

export type Artifact = {
  id: string;
  run_id: string;
  name: string;
  uri: string;
  content_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type AgentSession = {
  session_id: string;
  agent_name: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type AgentMessage = {
  message_id: string;
  session_id: string;
  role: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type Deployment = {
  deployment_id: string;
  workload_name: string;
  target: string;
  status: string;
  user: string;
  created_at: string;
  updated_at?: string | null;
  endpoint?: string | null;
  metadata: Record<string, unknown>;
};

export type WorkloadHealth = {
  workload_name: string;
  status: string;
  reason: string;
  deployments: Deployment[];
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

export const api = {
  login: (username: string, password: string) =>
    request<TokenResponse>("/auth/token", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  workloads: () => request<WorkloadInfo[]>("/v1/workloads"),
  workload: (name: string) => request<WorkloadInfo>(`/v1/workloads/${name}`),
  registerWorkload: (manifest: Record<string, unknown>) =>
    request<WorkloadInfo>("/v1/workloads", {
      method: "POST",
      body: JSON.stringify(manifest)
    }),
  deployments: (workload?: string) =>
    request<Deployment[]>(`/v1/deployments${workload ? `?workload_name=${workload}` : ""}`),
  workloadHealth: (name: string) => request<WorkloadHealth>(`/v1/workloads/${name}/health`),
  recordDeployment: (
    workload: string,
    body: { target: string; status: string; endpoint?: string; metadata?: Record<string, unknown> }
  ) =>
    request<Deployment>(`/v1/workloads/${workload}/deployments`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  runs: (workload?: string) =>
    request<RunStatus[]>(`/v1/runs${workload ? `?workload_name=${workload}` : ""}`),
  run: (id: string) => request<RunStatus>(`/v1/runs/${id}`),
  cancelRun: (id: string) => request<RunStatus>(`/v1/runs/${id}/cancel`, { method: "POST" }),
  events: (id: string) => request<RunEvent[]>(`/v1/runs/${id}/events`),
  artifacts: (id: string) => request<Artifact[]>(`/v1/runs/${id}/artifacts`),
  health: () => request<Record<string, unknown>>("/health"),
  ready: () => request<Record<string, unknown>>("/ready"),
  createSession: (agent: string) =>
    request<AgentSession>(`/v1/agents/${agent}/sessions`, {
      method: "POST",
      body: JSON.stringify({ metadata: {} })
    }),
  sessions: (agent: string) => request<AgentSession[]>(`/v1/agents/${agent}/sessions`),
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
  onError?: (error: unknown) => void
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
