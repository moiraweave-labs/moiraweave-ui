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
        exposedChannels: ["ui", "api"],
        externalOwnedChannels: ["telegram"]
      }
    }
  }
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
        api_key_id: null
      });
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
        }
      ]);
      return;
    }

    if (path === "/v1/workloads" && method === "GET") {
      await json(workloads);
      return;
    }

    if (path === "/v1/workloads/from-template" && method === "POST") {
      if (!workloads.some((item) => item.name === demoWorkload.name)) {
        workloads.push(demoWorkload);
      }
      await json(demoWorkload, 201);
      return;
    }

    if (path === "/v1/deployments" && method === "GET") {
      await json([]);
      return;
    }

    if (path === "/v1/deployment-operations" && method === "GET") {
      await json([]);
      return;
    }

    if (path === "/v1/secrets" && method === "GET") {
      await json({ status: "ok", total: 0, missing: 0, secrets: [] });
      return;
    }

    if (path === "/v1/audit-events" && method === "GET") {
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

    if (path === "/v1/artifacts" && method === "GET") {
      await json([
        {
          id: "artifact-1",
          run_id: "run-1",
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
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Created demo-agent")).toBeVisible();

  await page.getByRole("link", { name: "Open agent console" }).click();
  await expect(page).toHaveURL(/\/agents\?agent=demo-agent/);
  await expect(page.getByText("No sessions yet")).toBeVisible();

  await page.getByRole("button", { name: "Start session" }).first().click();
  await expect(page.getByRole("heading", { name: "Chat Session: session1" })).toBeVisible();
  await expect(page.getByText("Session Health")).toBeVisible();
  await expect(page.getByText("Latest Run")).toBeVisible();
  await page.getByPlaceholder("Message demo-agent...").fill("hello");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Run Activity")).toBeVisible();
  await expect(page.getByText("1 active")).toBeVisible();
  await expect(page.getByText("executor.agent.done").first()).toBeVisible();
  await expect(page.getByText("1 artifact")).toBeVisible();

  await page.getByRole("link", { name: "Artifacts" }).last().click();
  await expect(page).toHaveURL(/\/artifacts\?run_id=run-1/);
  await expect(page.getByText("demo-reply.json").first()).toBeVisible();
  await expect(page.getByText('"source": "demo-agent"')).toBeVisible();
  await expect(page.getByText('"reply": "Demo agent received: hello"')).toBeVisible();
  await page.getByRole("link", { name: "session1" }).click();
  await expect(page).toHaveURL(/\/agents\?agent=demo-agent&session_id=session1/);
  await expect(page.getByRole("heading", { name: "Chat Session: session1" })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Artifacts" }).click();
  await expect(page).toHaveURL(/\/artifacts/);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "File" }).click();
  expect((await download).suggestedFilename()).toBe("demo-reply.json");

  await page.goto("/operations?workload=demo-agent");
  await expect(page.getByRole("heading", { name: "Operations Center" })).toBeVisible();
  await expect(page.getByText("Operational Snapshot")).toBeVisible();
  await expect(page.getByText("local/local", { exact: true })).toBeVisible();
  await expect(page.getByText("Platform Checks")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
  await expect(page.getByText("agent.message")).toBeVisible();
  await expect(page.getByText("session1").last()).toBeVisible();
});
