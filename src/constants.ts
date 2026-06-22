export const COMMON_ENVIRONMENTS = ["local", "dev", "staging", "prod"];

export const SAMPLE_WORKLOAD = `{
  "apiVersion": "moiraweave.io/v1alpha1",
  "kind": "Workload",
  "metadata": { "name": "hermes" },
  "spec": {
    "type": "agent-service",
    "image": "ghcr.io/nousresearch/hermes-agent:latest",
    "execution": { "mode": "session", "timeoutSeconds": 172800 },
    "ports": [{ "name": "http", "port": 8000 }],
    "persistence": { "enabled": true, "mountPath": "/data" },
    "secrets": ["OPENAI_API_KEY"],
    "agent": {
      "adapter": "hermes",
      "requiredSecrets": ["OPENAI_API_KEY"],
      "workspaceMount": "/workspace",
      "exposedChannels": ["ui", "api"]
    }
  }
}`;

export const SAMPLE_RUN_PAYLOAD = `{
  "prompt": "Summarize the current workspace status"
}`;

export const SAMPLE_DEPLOYMENT_METADATA = `{
  "source": "moiraweave-ui"
}`;
