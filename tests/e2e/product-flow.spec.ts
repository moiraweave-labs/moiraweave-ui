import { expect, type Page, test } from "@playwright/test";

type Workload = {
  name: string;
  type: string;
  execution_mode: string;
  image: string;
  manifest: Record<string, unknown>;
};

const demoWorkload: Workload = {
  name: "demo-agent",
  type: "agent-service",
  execution_mode: "session",
  image: "python:3.13-slim",
  manifest: {
    apiVersion: "moiraweave.io/v1alpha1",
    kind: "Workload",
    metadata: { name: "demo-agent" },
    spec: {
      type: "agent-service",
      image: "python:3.13-slim",
      execution: { mode: "session" },
      agent: {
        adapter: "generic-http",
        toolOwnership: "runtime",
        runtimeRequirements: {
          filesystem: { persistentWorkspace: false },
          network: { egress: "restricted" },
          webSearch: { enabled: false },
          browser: { mode: "none" },
          terminal: { mode: "none" },
          messaging: { enabled: false }
        },
        exposedChannels: ["ui", "api"],
        externalOwnedChannels: ["telegram"]
      }
    }
  }
};

const hermesManifest = {
  apiVersion: "moiraweave.io/v1alpha1",
  kind: "Workload",
  metadata: { name: "hermes" },
  spec: {
    type: "agent-service",
    image: "ghcr.io/nousresearch/hermes-agent:latest",
    deployment: {
      mode: "managed",
      targets: ["local", "kubernetes"],
      serviceName: "hermes"
    },
    execution: { mode: "session", timeoutSeconds: 172800 },
    ports: [{ name: "http", port: 8642 }],
    persistence: { enabled: true, mountPath: "/workspace" },
    readinessProbe: { httpGet: { path: "/", port: "http" } },
    secrets: ["OPENAI_API_KEY"],
    agent: {
      adapter: "hermes",
      toolOwnership: "runtime",
      requiredSecrets: ["OPENAI_API_KEY"],
      workspaceMount: "/workspace",
      authTokenEnv: "HERMES_API_SERVER_KEY",
      exposedChannels: ["ui", "api"],
      externalOwnedChannels: ["telegram"],
      runtimeRequirements: {
        filesystem: { persistentWorkspace: true, workspaceMount: "/workspace" },
        network: { egress: "enabled" },
        webSearch: { enabled: true },
        browser: { mode: "runtime-managed" },
        terminal: { mode: "runtime-managed", approval: "runtime" },
        mcp: { enabled: true },
        messaging: { enabled: true }
      }
    }
  }
};

const hermesWorkload: Workload = {
  name: "hermes",
  type: "agent-service",
  execution_mode: "session",
  image: "ghcr.io/nousresearch/hermes-agent:latest",
  manifest: hermesManifest
};

const openClawManifest = {
  apiVersion: "moiraweave.io/v1alpha1",
  kind: "Workload",
  metadata: { name: "openclaw" },
  spec: {
    type: "agent-service",
    image: "ghcr.io/moiraweave-labs/openclaw-gateway:latest",
    deployment: {
      mode: "managed",
      targets: ["local", "kubernetes"],
      serviceName: "openclaw"
    },
    execution: { mode: "session", timeoutSeconds: 172800 },
    ports: [{ name: "gateway", port: 18789 }],
    persistence: { enabled: true, mountPath: "/workspace" },
    readinessProbe: { tcpSocket: { port: "gateway" } },
    agent: {
      adapter: "openclaw",
      toolOwnership: "runtime",
      workspaceMount: "/workspace",
      exposedChannels: ["ui", "api"],
      externalOwnedChannels: ["telegram"],
      runtimeRequirements: {
        filesystem: { persistentWorkspace: true, workspaceMount: "/workspace" },
        network: { egress: "enabled" },
        webSearch: { enabled: true },
        browser: { mode: "runtime-managed" },
        terminal: { mode: "runtime-managed", approval: "runtime" },
        mcp: { enabled: true },
        messaging: { enabled: true }
      }
    }
  }
};

const openClawWorkload: Workload = {
  name: "openclaw",
  type: "agent-service",
  execution_mode: "session",
  image: "ghcr.io/moiraweave-labs/openclaw-gateway:latest",
  manifest: openClawManifest
};

async function mockApi(page: Page) {
  const workloads: Workload[] = [];
  const sessions: Array<{
    session_id: string;
    agent_name: string;
    status: string;
    created_at: string;
  }> = [];
  const history: Array<Record<string, unknown>> = [];
  const deploymentOperations: Array<Record<string, unknown>> = [];
  const deploymentOperationEvents: Record<string, Array<Record<string, unknown>>> = {};
  const apiKeys: Array<Record<string, unknown>> = [];
  const users: Array<Record<string, unknown>> = [];
  const teams: Array<Record<string, unknown>> = [];
  const teamMembers: Record<string, Array<Record<string, unknown>>> = {};
  const deadLetters: Array<Record<string, unknown>> = [
    {
      message_id: "1700000000-0",
      source_stream: "moiraweave:runs",
      source_id: "1-0",
      reason: "runtime_unavailable",
      payload: {
        run_id: "run-1",
        workload_name: "demo-agent",
        payload: { message: "hello" }
      },
      created_at: "2026-05-26T08:02:00+00:00"
    }
  ];

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const resourceType = request.resourceType();
    const isHealthApiRequest =
      (path === "/health" || path === "/ready") &&
      (resourceType === "fetch" || resourceType === "xhr");

    if (
      !path.startsWith("/auth") &&
      !path.startsWith("/v1") &&
      !isHealthApiRequest
    ) {
      await route.continue();
      return;
    }

    const json = async (body: unknown, status = 200) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body)
      });
    };

    if (path === "/auth/token" && method === "POST") {
      await json({
        access_token: "ui-admin-token",
        token_type: "bearer",
        subject: "admin",
        role: "admin"
      });
      return;
    }

    if (path === "/auth/me" && method === "GET") {
      await json({
        subject: "admin",
        role: "admin",
        credential_type: "jwt",
        api_key_id: null,
        team_id: null,
        teams: []
      });
      return;
    }

    if (path === "/auth/api-keys" && method === "GET") {
      await json(apiKeys);
      return;
    }

    if (path === "/auth/api-keys" && method === "POST") {
      const body = request.postDataJSON() as {
        name: string;
        subject: string;
        role: string;
        team_id?: string | null;
      };
      const key = {
        key_id: `key-${apiKeys.length + 1}`,
        name: body.name,
        subject: body.subject,
        role: body.role,
        team_id: body.team_id ?? null,
        secret_prefix: "mwk_e2e...",
        created_by: "admin",
        created_at: "2026-05-26T08:00:00+00:00",
        last_used_at: null,
        revoked_at: null
      };
      apiKeys.unshift(key);
      await json({ ...key, secret: "mwk_e2e_created_secret" }, 201);
      return;
    }

    if (path.startsWith("/auth/api-keys/") && path.endsWith("/rotate") && method === "POST") {
      const keyId = path.split("/")[3];
      const key = apiKeys.find((item) => item.key_id === keyId);
      if (!key) {
        await json({ detail: "API key not found" }, 404);
        return;
      }
      if (key.revoked_at) {
        await json({ detail: "API key is already revoked" }, 409);
        return;
      }
      key.revoked_at = "2026-05-26T08:04:00+00:00";
      const replacement = {
        key_id: `key-${apiKeys.length + 1}`,
        name: key.name,
        subject: key.subject,
        role: key.role,
        team_id: key.team_id ?? null,
        secret_prefix: "mwk_rot...",
        created_by: "admin",
        created_at: "2026-05-26T08:04:00+00:00",
        last_used_at: null,
        revoked_at: null
      };
      apiKeys.unshift(replacement);
      await json({ ...replacement, secret: "mwk_e2e_rotated_secret" }, 201);
      return;
    }

    if (path.startsWith("/auth/api-keys/") && method === "DELETE") {
      const keyId = path.split("/").pop();
      const key = apiKeys.find((item) => item.key_id === keyId);
      if (!key) {
        await json({ detail: "API key not found" }, 404);
        return;
      }
      key.revoked_at = "2026-05-26T08:03:00+00:00";
      await json(key);
      return;
    }

    if (path === "/auth/users" && method === "GET") {
      await json(users);
      return;
    }

    if (path === "/auth/users" && method === "POST") {
      const body = request.postDataJSON() as {
        subject: string;
        display_name?: string | null;
        role: string;
      };
      const user = {
        subject: body.subject,
        display_name: body.display_name ?? null,
        role: body.role,
        created_by: "admin",
        created_at: "2026-05-26T08:00:00+00:00",
        updated_at: "2026-05-26T08:00:00+00:00",
        disabled_at: null
      };
      const index = users.findIndex((item) => item.subject === body.subject);
      if (index >= 0) users[index] = user;
      else users.unshift(user);
      await json(user, 201);
      return;
    }

    if (path.startsWith("/auth/users/") && method === "DELETE") {
      const subject = decodeURIComponent(path.split("/").pop() || "");
      const user = users.find((item) => item.subject === subject);
      if (!user) {
        await json({ detail: "User not found" }, 404);
        return;
      }
      user.disabled_at = "2026-05-26T08:09:00+00:00";
      await json(user);
      return;
    }

    if (path.startsWith("/auth/users/") && path.endsWith("/enable") && method === "POST") {
      const subject = decodeURIComponent(path.split("/")[3]);
      const user = users.find((item) => item.subject === subject);
      if (!user) {
        await json({ detail: "User not found" }, 404);
        return;
      }
      user.disabled_at = null;
      user.updated_at = "2026-05-26T08:10:00+00:00";
      await json(user);
      return;
    }

    if (path.startsWith("/auth/users/") && path.endsWith("/password/reset") && method === "POST") {
      const subject = decodeURIComponent(path.split("/")[3]);
      const user = users.find((item) => item.subject === subject);
      if (!user) {
        await json({ detail: "User not found" }, 404);
        return;
      }
      user.updated_at = "2026-05-26T08:11:00+00:00";
      await json(user);
      return;
    }

    if (path === "/auth/teams" && method === "GET") {
      await json(teams);
      return;
    }

    if (path === "/auth/teams" && method === "POST") {
      const body = request.postDataJSON() as {
        team_id: string;
        name: string;
        description?: string | null;
      };
      const team = {
        team_id: body.team_id,
        name: body.name,
        description: body.description ?? null,
        created_by: "admin",
        created_at: "2026-05-26T08:00:00+00:00",
        updated_at: "2026-05-26T08:00:00+00:00"
      };
      const index = teams.findIndex((item) => item.team_id === body.team_id);
      if (index >= 0) teams[index] = team;
      else teams.unshift(team);
      teamMembers[body.team_id] ||= [];
      await json(team, 201);
      return;
    }

    const teamMembersMatch = path.match(/^\/auth\/teams\/([^/]+)\/members$/);
    if (teamMembersMatch && method === "GET") {
      await json(teamMembers[decodeURIComponent(teamMembersMatch[1])] || []);
      return;
    }

    if (teamMembersMatch && method === "POST") {
      const teamId = decodeURIComponent(teamMembersMatch[1]);
      const body = request.postDataJSON() as { subject: string; role: string };
      const member = {
        team_id: teamId,
        subject: body.subject,
        role: body.role,
        created_by: "admin",
        created_at: "2026-05-26T08:00:00+00:00"
      };
      teamMembers[teamId] ||= [];
      const index = teamMembers[teamId].findIndex(
        (item) => item.subject === body.subject
      );
      if (index >= 0) teamMembers[teamId][index] = member;
      else teamMembers[teamId].unshift(member);
      await json(member, 201);
      return;
    }

    if (path === "/health" && method === "GET") {
      await json({ status: "ok", version: "e2e" });
      return;
    }

    if (path === "/ready" && method === "GET") {
      await json({
        status: "ready",
        checks: {
          postgres: { status: "passed", message: "Postgres is reachable." },
          redis: { status: "passed", message: "Redis is reachable." },
          worker_dispatch: {
            status: "passed",
            message: "Worker consumer is attached.",
            metadata: { consumers: 1, pending: 0, lag: 0 }
          },
          ui: {
            status: "warning",
            message: "UI container status has not been confirmed."
          }
        }
      });
      return;
    }

    if (path === "/v1/templates" && method === "GET") {
      await json([
        {
          id: "demo-agent",
          name: "Demo Agent",
          category: "agent",
          description: "Local no-secret mock agent.",
          workload_type: "agent-service",
          tags: ["demo", "local"],
          parameters: [
            {
              name: "name",
              label: "Name",
              type: "string",
              required: true,
              default: "demo-agent",
              options: []
            }
          ],
          manifest: demoWorkload.manifest
        },
        {
          id: "hermes",
          name: "Hermes Agent",
          category: "agent",
          description: "Managed Hermes runtime with persistence, secrets, and UI/API sessions.",
          workload_type: "agent-service",
          tags: ["hermes", "managed", "long-running"],
          parameters: [],
          manifest: hermesManifest
        },
        {
          id: "openclaw",
          name: "OpenClaw",
          category: "agent",
          description: "Managed OpenClaw gateway runtime with session-oriented dispatch.",
          workload_type: "agent-service",
          tags: ["openclaw", "managed", "browser"],
          parameters: [],
          manifest: openClawManifest
        }
      ]);
      return;
    }

    if (path === "/v1/workloads" && method === "GET") {
      await json(workloads);
      return;
    }

    if (path === "/v1/workloads/from-template" && method === "POST") {
      const payload = await request.postDataJSON();
      const templateWorkload =
        payload.template_id === "hermes"
          ? hermesWorkload
          : payload.template_id === "openclaw"
            ? openClawWorkload
            : demoWorkload;
      if (!workloads.some((item) => item.name === templateWorkload.name)) {
        workloads.push(templateWorkload);
      }
      await json(templateWorkload, 201);
      return;
    }

    if (path === "/v1/deployments" && method === "GET") {
      await json([]);
      return;
    }

    if (path === "/v1/environments" && method === "GET") {
      await json([
        { name: "local", deployment_count: 0, operation_count: 0, workload_count: 0 },
        { name: "dev", deployment_count: 0, operation_count: 0, workload_count: 0 },
        { name: "staging", deployment_count: 0, operation_count: 0, workload_count: 0 },
        { name: "prod", deployment_count: 0, operation_count: 0, workload_count: 0 }
      ]);
      return;
    }

    if (path === "/v1/operations/alerts" && method === "GET") {
      await json([]);
      return;
    }

    if (path === "/v1/runs/dead-letter" && method === "GET") {
      await json(deadLetters);
      return;
    }

    const deadLetterReplayMatch = path.match(/^\/v1\/runs\/dead-letter\/(.+)\/replay$/);
    if (deadLetterReplayMatch && method === "POST") {
      const messageId = decodeURIComponent(deadLetterReplayMatch[1]);
      const index = deadLetters.findIndex((entry) => entry.message_id === messageId);
      if (index < 0) {
        await json({ detail: "Dead-letter entry not found" }, 404);
        return;
      }
      const [entry] = deadLetters.splice(index, 1);
      await json(
        {
          message_id: entry.message_id,
          replayed_message_id: "2-0",
          run_id: "run-1",
          workload_name: "demo-agent",
          reason: entry.reason
        },
        202
      );
      return;
    }

    const deadLetterPurgeMatch = path.match(/^\/v1\/runs\/dead-letter\/(.+)$/);
    if (deadLetterPurgeMatch && method === "DELETE") {
      const messageId = decodeURIComponent(deadLetterPurgeMatch[1]);
      const index = deadLetters.findIndex((entry) => entry.message_id === messageId);
      if (index < 0) {
        await json({ detail: "Dead-letter entry not found" }, 404);
        return;
      }
      const [entry] = deadLetters.splice(index, 1);
      await json(entry);
      return;
    }

    if (path === "/v1/deployment-operations" && method === "GET") {
      await json(deploymentOperations);
      return;
    }

    if (path === "/v1/deployment-operations" && method === "POST") {
      const payload = await request.postDataJSON();
      const operationId = `operation-${deploymentOperations.length + 1}`;
      const usesController = payload.executor === "controller";
      const plan = {
        workload_name: payload.workload_name,
        target: payload.target || "local",
        mode: "managed",
        service_name: payload.workload_name,
        endpoint: `http://${payload.workload_name}:8000`,
        files: [".moiraweave/deploy/docker-compose.workloads.yml"],
        commands: [
          "docker compose -f docker-compose.yml -f .moiraweave/deploy/docker-compose.workloads.yml up -d"
        ],
        notes: ["Run moira up for local execution."]
      };
      const operation = {
        operation_id: operationId,
        action: payload.action,
        workload_name: payload.workload_name,
        target: payload.target || "local",
        env: payload.env || "local",
        status: usesController ? "queued" : "succeeded",
        user: "admin",
        created_at: "2026-05-26T08:02:00+00:00",
        updated_at: "2026-05-26T08:02:00+00:00",
        completed_at: usesController ? null : "2026-05-26T08:02:00+00:00",
        metadata: usesController
          ? {
              plan,
              executor: "controller",
              controller_required: true,
              action_commands: ["helm upgrade --install moiraweave infra/helm/moiraweave"],
              next_actions: ["Run the CLI deployment controller from a trusted shell."]
            }
          : { plan }
      };
      deploymentOperations.unshift(operation);
      deploymentOperationEvents[operationId] = [
        {
          id: "event-plan-1",
          operation_id: operationId,
          timestamp: "2026-05-26T08:02:00+00:00",
          type: usesController ? "operation.queued" : "operation.plan",
          message: usesController
            ? "Deployment operation queued for a deployment controller."
            : "Deployment plan generated.",
          data: { plan }
        }
      ];
      await json(operation, 202);
      return;
    }

    if (
      path.startsWith("/v1/deployment-operations/") &&
      path.endsWith("/events") &&
      method === "GET"
    ) {
      const operationId = path.split("/")[3];
      await json(deploymentOperationEvents[operationId] || []);
      return;
    }

    if (path === "/v1/secrets" && method === "GET") {
      const workloadName = url.searchParams.get("workload_name");
      if (workloadName === "hermes") {
        await json({
          status: "missing",
          total: 1,
          missing: 1,
          secrets: [
            {
              name: "OPENAI_API_KEY",
              present: false,
              source: "environment",
              workloads: ["hermes"],
              references: ["spec.secrets", "spec.agent.requiredSecrets"],
              remediation:
                "Add OPENAI_API_KEY to local .env, Kubernetes Secret, or external secret manager before deploying."
            }
          ]
        });
        return;
      }
      await json({ status: "ok", total: 0, missing: 0, secrets: [] });
      return;
    }

    if (path === "/v1/audit-events" && method === "GET") {
      if (url.searchParams.get("env") === "prod") {
        await json([
          {
            event_id: "prod-audit-1",
            timestamp: "2026-05-26T09:01:00+00:00",
            actor: "admin",
            action: "deployment_operation.apply",
            resource_type: "deployment_operation",
            resource_id: "operation-prod",
            metadata: { env: "prod", workload_name: "demo-agent" }
          }
        ]);
        return;
      }
      await json([
        {
          event_id: "1",
          timestamp: "2026-05-26T08:01:00+00:00",
          actor: "admin",
          action: "agent.message",
          resource_type: "agent_session",
          resource_id: "session1",
          metadata: { agent_name: "demo-agent", run_id: "run-1" }
        }
      ]);
      return;
    }

    if (path === "/v1/workloads/demo-agent/health" && method === "GET") {
      await json({
        workload_name: "demo-agent",
        status: "healthy",
        reason: "Runtime is reachable.",
        deployments: [],
        recommendations: []
      });
      return;
    }

    if (path === "/v1/workloads/hermes/health" && method === "GET") {
      await json({
        workload_name: "hermes",
        status: "degraded",
        reason: "Required secrets are missing before the runtime can be healthy.",
        deployments: [],
        recommendations: ["Set OPENAI_API_KEY, deploy the runtime, then run preflight again."]
      });
      return;
    }

    if (path === "/v1/workloads/hermes/preflight" && method === "POST") {
      await json({
        workload_name: "hermes",
        target: "local",
        status: "warning",
        checks: [
          {
            name: "manifest",
            status: "passed",
            message: "Manifest is valid.",
            remediation: null,
            metadata: {}
          },
          {
            name: "secrets",
            status: "warning",
            message: "Missing secret references: OPENAI_API_KEY.",
            remediation: "Add missing names to local .env or Kubernetes secrets.",
            metadata: {
              required: ["OPENAI_API_KEY"],
              missing: ["OPENAI_API_KEY"]
            }
          },
          {
            name: "deployment_record",
            status: "failed",
            message: "No local/local deployment record exists for hermes.",
            remediation: "Deploy or connect the runtime, then sync a local/local deployment record.",
            metadata: { target: "local", env: "local" }
          },
          {
            name: "worker_dispatch",
            status: "passed",
            message: "Worker consumer is attached.",
            remediation: null,
            metadata: { consumers: 1, pending: 0, lag: 0 }
          }
        ],
        recommendations: [
          "Set OPENAI_API_KEY before deploying Hermes.",
          "Run moira deploy local --register after the runtime is started."
        ],
        action_guide: [
          {
            title: "Set Missing Secrets",
            state: "missing",
            detail:
              "Required secret names are missing: OPENAI_API_KEY. Values stay outside the API and UI.",
            command: "printf 'OPENAI_API_KEY=...\\n' >> .env"
          },
          {
            title: "Sync Deployment Record",
            state: "warning",
            detail:
              "Deploy or connect the runtime, then sync a local/local deployment record.",
            command: "moira deploy local --register"
          }
        ]
      });
      return;
    }

    if (path === "/v1/agents/demo-agent/sessions" && method === "GET") {
      await json(sessions);
      return;
    }

    if (path === "/v1/agents/demo-agent/sessions" && method === "POST") {
      const session = {
        session_id: "session1",
        agent_name: "demo-agent",
        status: "active",
        created_at: "2026-05-26T08:00:00+00:00"
      };
      sessions.splice(0, sessions.length, session);
      await json(session, 201);
      return;
    }

    if (
      path === "/v1/agents/demo-agent/sessions/session1/health" &&
      method === "GET"
    ) {
      await json({
        session_id: "session1",
        agent_name: "demo-agent",
        status: "healthy",
        latest_run_status: history.length > 0 ? "running" : null,
        message_count: history.length
      });
      return;
    }

    if (
      path === "/v1/agents/demo-agent/sessions/session1/messages" &&
      method === "GET"
    ) {
      await json(history);
      return;
    }

    if (
      path === "/v1/agents/demo-agent/sessions/session1/messages" &&
      method === "POST"
    ) {
      const payload = await request.postDataJSON();
      history.splice(0, history.length, {
        message_id: "message-1",
        session_id: "session1",
        role: "user",
        message: payload.message,
        context: { run_id: "run-1" },
        created_at: "2026-05-26T08:01:00+00:00",
        run_id: "run-1",
        run_status: "running",
        latest_event: {
          id: "event-1",
          run_id: "run-1",
          timestamp: "2026-05-26T08:01:01+00:00",
          type: "executor.agent.call",
          message: "Dispatching message to agent runtime",
          data: {}
        },
        artifact_count: 1
      });
      await json({
        message_id: "message-1",
        run_id: "run-1",
        session_id: "session1",
        status: "queued",
        created_at: "2026-05-26T08:01:00+00:00"
      }, 202);
      return;
    }

    if (path === "/v1/runs" && method === "GET") {
      const env = url.searchParams.get("env");
      if (env === "prod") {
        await json([
          {
            run_id: "run-prod",
            workload_name: "demo-agent",
            status: "succeeded",
            user: "admin",
            created_at: "2026-05-26T09:01:00+00:00",
            session_id: "session-prod"
          }
        ]);
        return;
      }
      await json([
        {
          run_id: "run-1",
          workload_name: "demo-agent",
          status: "running",
          user: "admin",
          created_at: "2026-05-26T08:01:00+00:00",
          session_id: "session1"
        }
      ]);
      return;
    }

    if (path === "/v1/runs/run-1" && method === "GET") {
      await json({
        run_id: "run-1",
        workload_name: "demo-agent",
        status: "running",
        user: "admin",
        created_at: "2026-05-26T08:01:00+00:00",
        heartbeat_at: "2026-05-26T08:01:02+00:00",
        session_id: "session1",
        payload: { session_id: "session1", message: "hello" },
        result: null,
        error: null
      });
      return;
    }

    if (path === "/v1/runs/run-1/events" && method === "GET") {
      await json([
        {
          id: "event-1",
          run_id: "run-1",
          timestamp: "2026-05-26T08:01:01+00:00",
          type: "executor.agent.call",
          message: "Dispatching message to agent runtime",
          data: { adapter: "demo" }
        }
      ]);
      return;
    }

    if (path === "/v1/runs/run-1/events/stream" && method === "GET") {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body:
          "data: " +
          JSON.stringify({
            id: "event-2",
            run_id: "run-1",
            timestamp: "2026-05-26T08:01:02+00:00",
            type: "executor.agent.done",
            message: "Runtime replied with artifact",
            data: {}
          }) +
          "\n\n"
      });
      return;
    }

    if (path === "/v1/runs/run-1/artifacts" && method === "GET") {
      await json([
        {
          id: "artifact-1",
          run_id: "run-1",
          workload_name: "demo-agent",
          session_id: "session1",
          name: "demo-reply.json",
          uri: "local://demo-reply.json",
          content_type: "application/json",
          size_bytes: 48,
          created_at: "2026-05-26T08:01:03+00:00",
          metadata: { source: "demo-agent", session_id: "session1" }
        }
      ]);
      return;
    }

    if (path === "/v1/artifacts" && method === "GET") {
      const env = url.searchParams.get("env");
      if (env === "prod") {
        await json([
          {
            id: "artifact-prod",
            run_id: "run-prod",
            workload_name: "demo-agent",
            session_id: "session-prod",
            name: "prod-reply.json",
            uri: "local://reports/prod-reply.json",
            content_type: "application/json",
            size_bytes: 42,
            created_at: "2026-05-26T09:01:03+00:00",
            metadata: { source: "demo-agent", session_id: "session-prod" }
          }
        ]);
        return;
      }
      await json([
        {
          id: "artifact-1",
          run_id: "run-1",
          workload_name: "demo-agent",
          session_id: "session1",
          name: "demo-reply.json",
          uri: "local://reports/demo-reply.json",
          content_type: "application/json",
          size_bytes: 38,
          created_at: "2026-05-26T08:01:03+00:00",
          metadata: { source: "demo-agent", session_id: "session1" }
        }
      ]);
      return;
    }

    if (
      path === "/v1/runs/run-prod/artifacts/artifact-prod/preview" &&
      method === "GET"
    ) {
      await json({
        artifact_id: "artifact-prod",
        run_id: "run-prod",
        name: "prod-reply.json",
        content_type: "application/json",
        text: '{ "reply": "Production demo response" }',
        truncated: false,
        size_bytes: 42
      });
      return;
    }

    if (
      path === "/v1/runs/run-1/artifacts/artifact-1/preview" &&
      method === "GET"
    ) {
      await json({
        artifact_id: "artifact-1",
        run_id: "run-1",
        name: "demo-reply.json",
        content_type: "application/json",
        text: '{ "reply": "Demo agent received: hello" }',
        truncated: false,
        size_bytes: 38
      });
      return;
    }

    if (
      path === "/v1/runs/run-1/artifacts/artifact-1/download" &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-disposition": 'attachment; filename="demo-reply.json"'
        },
        body: '{ "reply": "Demo agent received: hello" }'
      });
      return;
    }

    await json({ detail: `Unhandled mock route ${method} ${path}` }, 500);
  });
}

test("onboards a demo agent, starts chat, and inspects artifacts", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("admin").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Workload" })).toBeVisible();
  await expect(page.getByText("Tool Owner")).toBeVisible();
  await expect(page.getByText("egress:restricted")).toBeVisible();
  await expect(page.getByText("Web Search: off").first()).toBeVisible();
  await expect(page.getByText("Messaging: off").first()).toBeVisible();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Created demo-agent")).toBeVisible();

  await page.getByRole("link", { name: "Open agent console" }).click();
  await expect(page).toHaveURL(/\/agents\?agent=demo-agent/);
  await expect(page.getByText("No sessions yet")).toBeVisible();
  await expect(page.getByText("Runtime Boundary")).toBeVisible();
  await expect(page.getByText("egress:restricted")).toBeVisible();
  await expect(page.getByText("External-owned channels:")).toBeVisible();
  await expect(page.getByText("telegram stay in the agent runtime")).toBeVisible();

  await page.getByRole("button", { name: "Start session" }).first().click();
  await expect(page.getByRole("heading", { name: "Chat Session: session1" })).toBeVisible();
  await expect(page.getByText("Session Health")).toBeVisible();
  await expect(page.getByText("Latest Run")).toBeVisible();
  await page.getByPlaceholder("Message demo-agent...").fill("hello");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Run Activity")).toBeVisible();
  await expect(page.getByText("Focused Turn")).toBeVisible();
  await expect(page.getByText("1 active")).toBeVisible();
  await expect(page.getByText("executor.agent.done").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Inspect" })).toBeVisible();
  await expect(page.getByText("1 artifact")).toBeVisible();
  await expect(page.getByText("Turn Details")).toBeVisible();
  await expect(page.getByText("Recent Events")).toBeVisible();
  await expect(page.getByText("Produced Artifacts")).toBeVisible();
  await expect(page.getByText("Dispatching message to agent runtime")).toBeVisible();
  await expect(page.getByText("demo-reply.json")).toBeVisible();

  await page.getByRole("link", { name: "Open Run" }).click();
  await expect(page).toHaveURL(/\/runs\/run-1/);
  await expect(page.getByRole("heading", { name: "Run Diagnostics" })).toBeVisible();
  await expect(page.getByText("Runtime Active")).toBeVisible();
  await expect(page.getByText("Latest Timeline Signal")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Live Event Feed" })).toBeVisible();
  await expect(page.getByText("Receiving live runtime events from the API gateway.")).toBeVisible();
  await expect(page.getByText("Runtime replied with artifact").first()).toBeVisible();
  await expect(page.getByText('"adapter": "demo"')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Chat Session: session1" })).toBeVisible();

  await page.getByRole("link", { name: "Artifacts" }).last().click();
  await expect(page).toHaveURL(/\/artifacts\?run_id=run-1/);
  await expect(page.getByText("demo-reply.json").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "demo-agent" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "session1" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Session artifacts" })).toBeVisible();
  await expect(page.getByText('"source": "demo-agent"')).toBeVisible();
  await expect(page.getByText('"reply": "Demo agent received: hello"')).toBeVisible();
  await page.getByRole("link", { name: "session1" }).first().click();
  await expect(page).toHaveURL(/\/agents\?agent=demo-agent&session_id=session1/);
  await expect(page.getByRole("heading", { name: "Chat Session: session1" })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Artifacts" }).click();
  await expect(page).toHaveURL(/\/artifacts/);
  await page.getByLabel("Environment").selectOption("prod");
  await expect(page).toHaveURL(/\/artifacts\?env=prod/);
  await expect(page.getByText("prod-reply.json").first()).toBeVisible();
  await expect(page.getByText('"reply": "Production demo response"')).toBeVisible();
  await page.getByLabel("Environment").selectOption("");
  await expect(page.getByText("demo-reply.json").first()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "File" }).click();
  expect((await download).suggestedFilename()).toBe("demo-reply.json");

  await page.getByRole("navigation").getByRole("link", { name: "Runs" }).click();
  await page.getByLabel("Filter runs by environment").selectOption("prod");
  await expect(page).toHaveURL(/\/runs\?env=prod/);
  await expect(page.getByRole("link", { name: "run-prod" })).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "run-prod" }).getByText("succeeded")
  ).toBeVisible();

  await page.goto("/operations?workload=demo-agent");
  await expect(page.getByRole("heading", { name: "Operations Center" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Environments" })).toBeVisible();
  await expect(page.getByText("moira env list")).toBeVisible();
  await expect(page.getByText("Command Companion")).toBeVisible();
  await expect(
    page.getByText("moira workload preflight demo-agent --target local --env local")
  ).toBeVisible();
  await expect(page.getByText('moira agent chat demo-agent "hello" --watch')).toBeVisible();
  await expect(page.getByText("local", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Operational Snapshot")).toBeVisible();
  await expect(page.getByText("local/local", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Platform Checks")).toBeVisible();
  await expect(page.getByText("docker compose logs ui")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dead-letter Queue" })).toBeVisible();
  await expect(page.getByText("runtime_unavailable")).toBeVisible();
  await expect(
    page.getByText("moira run dead-letter replay 1700000000-0")
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(
    page.getByText("No failed dispatch messages are waiting for operator review.")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agent Runtime Supervision" })).toBeVisible();
  await expect(page.getByRole("link", { name: "demo-agent" }).first()).toBeVisible();
  await expect(page.getByText("Run plan/apply from CLI or CI")).toBeVisible();
  await expect(page.getByText("Latest")).toBeVisible();
  await page.getByRole("button", { name: "Plan" }).click();
  await expect(page.getByText("operation.plan")).toBeVisible();
  await expect(page.getByText("Deployment plan generated.")).toBeVisible();
  await expect(page.getByText("guidance-only").first()).toBeVisible();
  await expect(
    page.getByText("MoiraWeave generated plan, log, or apply guidance.")
  ).toBeVisible();
  await expect(
    page.getByText(".moiraweave/deploy/docker-compose.workloads.yml", {
      exact: true
    })
  ).toBeVisible();
  await expect(page.getByText("Run moira up for local execution.")).toBeVisible();
  await page.getByRole("button", { name: "Sync" }).click();
  await expect(page.getByText("control-plane").first()).toBeVisible();
  await expect(
    page.getByText("The API control plane records metadata and synchronizes status")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
  await expect(page.getByText("agent.message")).toBeVisible();
  await expect(page.getByText("session1").last()).toBeVisible();

  await page.goto("/operations?workload=demo-agent&env=prod");
  await expect(page.getByLabel("Custom environment")).toHaveValue("prod");
  await expect(page).toHaveURL(/\/operations\?workload=demo-agent&env=prod/);
  await expect(page.getByText("deployment_operation.apply")).toBeVisible();
  await expect(page.getByText("operation-prod")).toBeVisible();
  await expect(page.getByRole("link", { name: "run-prod" })).toBeVisible();
  await expect(page.getByRole("link", { name: "run-1" })).toHaveCount(0);
});

test("explains real agent template requirements before creation", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByLabel("Workload template").selectOption("hermes");
  const summary = page.getByTestId("template-summary");
  await expect(summary.getByText("Managed Hermes runtime with persistence")).toBeVisible();
  await expect(summary.getByText("ghcr.io/nousresearch/hermes-agent:latest")).toBeVisible();
  await expect(summary.getByText("session / managed")).toBeVisible();
  await expect(summary.getByText("http://hermes:8642")).toBeVisible();
  await expect(summary.getByText("OPENAI_API_KEY")).toBeVisible();
  await expect(summary.getByText("workspace:persistent")).toBeVisible();
  await expect(summary.getByText("Web Search: runtime")).toBeVisible();
  await expect(summary.getByText("MCP: runtime")).toBeVisible();
  await expect(summary.getByText("Messaging: runtime")).toBeVisible();
  await expect(summary.getByText("telegram")).toBeVisible();

  await page.getByLabel("Workload template").selectOption("openclaw");
  await expect(summary.getByText("Managed OpenClaw gateway runtime")).toBeVisible();
  await expect(summary.getByText("ghcr.io/moiraweave-labs/openclaw-gateway:latest")).toBeVisible();
  await expect(summary.getByText("http://openclaw:18789")).toBeVisible();
  await expect(summary.getByText("readinessProbe:tcp")).toBeVisible();
  await expect(summary.getByText("gateway:18789")).toBeVisible();
  await expect(summary.getByText("browser:runtime-managed")).toBeVisible();
});

test("guides real agent preflight blockers with concrete next actions", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByLabel("Workload template").selectOption("hermes");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Created hermes")).toBeVisible();

  await page.getByRole("link", { name: "Run preflight" }).click();
  await expect(page).toHaveURL(/\/operations\?workload=hermes/);
  const guide = page.getByTestId("preflight-action-guide");
  await expect(guide.getByText("Deployment Readiness Guide")).toBeVisible();
  await expect(guide.getByText("Required secret names are missing: OPENAI_API_KEY")).toBeVisible();
  await expect(guide.getByText("Values stay outside the UI and API.")).toBeVisible();
  await expect(guide.getByText("printf 'OPENAI_API_KEY=...\\n' >> .env")).toBeVisible();

  await page.getByRole("button", { name: "Preflight" }).click();
  await expect(page.getByText("Missing secret references: OPENAI_API_KEY.")).toBeVisible();
  await expect(guide.getByText("Set Missing Secrets")).toBeVisible();
  await expect(guide.getByText("Sync Deployment Record")).toBeVisible();
  await expect(guide.getByText("moira deploy local --register")).toBeVisible();
  await expect(page.getByText("No local/local deployment record exists for hermes.")).toBeVisible();
});

test("queues kubernetes deployment operations for the cli controller", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByLabel("Workload template").selectOption("hermes");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Created hermes")).toBeVisible();

  await page.goto("/operations?workload=hermes");
  await page.getByLabel("Target").selectOption("kubernetes");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByRole("heading", { name: "Controller Queue" })).toBeVisible();
  await expect(
    page.getByText("moira deploy controller run --target kubernetes --env local --watch")
  ).toBeVisible();
  await expect(
    page.getByText("kubectl create secret generic moiraweave-controller-token")
  ).toBeVisible();
  await expect(
    page.getByText(
      "helm upgrade --install moiraweave oci://ghcr.io/moiraweave-labs/charts/moiraweave"
    )
  ).toBeVisible();
  await expect(
    page.getByText("Deployment operation queued for a deployment controller.")
  ).toBeVisible();
  await expect(page.getByText("controller-executed").first()).toBeVisible();
  await expect(
    page.getByText("A trusted CLI or in-cluster deployment controller claims this operation")
  ).toBeVisible();
  await expect(
    page.getByText("helm upgrade --install moiraweave infra/helm/moiraweave")
  ).toBeVisible();
});

test("manages API keys from the security console", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("link", { name: "Security" }).click();
  await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();
  await page.getByLabel("User subject").fill("team-bot");
  await page.getByLabel("User display name").fill("Team Bot");
  await page.getByLabel("User password").fill("correct-horse");
  await page.getByLabel("User role").selectOption("operator");
  await page.getByRole("button", { name: "Create User" }).click();
  await expect(page.getByRole("table").getByText("team-bot")).toBeVisible();
  await page.getByTitle("Disable user").click();
  await expect(page.getByRole("table").getByText("disabled")).toBeVisible();
  await page.getByTitle("Enable user").click();
  await expect(page.getByRole("table").getByText("active")).toBeVisible();
  await page.getByLabel("Reset subject").fill("team-bot");
  await page.getByLabel("Temporary password").fill("temporary-reset-123");
  await page.getByRole("button", { name: "Reset Password" }).click();
  await expect(page.getByText("Password reset applied.")).toBeVisible();

  await page.getByLabel("Team ID").fill("agents");
  await page.getByLabel("Team name").fill("Agent Operators");
  await page.getByLabel("Team description").fill("Production agent operators");
  await page.getByRole("button", { name: "Create Team" }).click();
  await expect(
    page.getByRole("table").getByText("Agent Operators", { exact: true })
  ).toBeVisible();

  await page.getByLabel("Member subject").fill("team-bot");
  await page.getByLabel("Member role").selectOption("operator");
  await page.getByRole("button", { name: "Add Member" }).click();
  await expect(page.getByRole("table").getByText("team-bot").last()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Create API Key" })).toBeVisible();
  await page.getByLabel("API key name").fill("ci deploy");
  await page.getByLabel("API key subject").fill("team-bot");
  await page.getByLabel("API key role").selectOption("operator");
  await page.getByLabel("API key team").selectOption("agents");
  await page.getByRole("button", { name: "Create Key" }).click();

  await expect(page.getByText("mwk_e2e_created_secret")).toBeVisible();
  await expect(page.getByRole("table").getByText("ci deploy")).toBeVisible();
  await expect(page.getByText("agents").first()).toBeVisible();
  await page.getByTitle("Rotate API key").click();
  await expect(page.getByText("mwk_e2e_rotated_secret")).toBeVisible();
  await expect(page.getByRole("table").getByText("revoked")).toBeVisible();
  await page.getByTitle("Revoke API key").first().click();
  await expect(page.getByText("revoked")).toBeVisible();
});
