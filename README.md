# MoiraWeave UI

Ops dashboard for MoiraWeave, the self-hosted AI workload and agent operations
platform.

The UI talks only to the MoiraWeave API Gateway. It does not connect directly to
Redis, Postgres, Kubernetes, or agent runtimes.

## Features

- Workload registry and manifest registration
- Run list, run detail, events, artifacts, and cancellation
- Agent sessions and chat
- Inbound channel simulation for Telegram, Slack, Discord, and webhooks
- Deployment and gateway health views

## Development

```bash
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` when the API Gateway is not served from the same origin:

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Build

```bash
npm run build
```

The production image serves the built Vite app with nginx and supports runtime
API base URL injection through `nginx.conf.template`.

## Related Repositories

- [moiraweave-core](https://github.com/moiraweave-labs/moiraweave-core)
- [moiraweave-cli](https://github.com/moiraweave-labs/moiraweave-cli)
- [moiraweave-docs](https://github.com/moiraweave-labs/moiraweave-docs)
