import { useMutation, useQuery } from "@tanstack/react-query";
import { Clipboard, Download, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Artifact } from "../api";
import { formatBytes, formatDate, isServedArtifactUri } from "../utils";
import { Metric, Panel, StateBadge } from "./common";

export function ArtifactDetails({ artifact }: { artifact: Artifact }) {
  const metadata = artifact.metadata || {};
  const metadataText = JSON.stringify(metadata, null, 2);
  const hasMetadata = Object.keys(metadata).length > 0;
  const canServeContent = isServedArtifactUri(artifact.uri);
  const run = useQuery({
    queryKey: ["run", artifact.run_id],
    queryFn: () => api.run(artifact.run_id),
    retry: false
  });
  const workloadName =
    run.data?.workload_name || metadataString(metadata, ["workload_name", "source"]);
  const sessionId = run.data?.session_id || metadataString(metadata, ["session_id"]);
  const agentSessionPath =
    workloadName && sessionId
      ? `/agents?agent=${encodeURIComponent(workloadName)}&session_id=${encodeURIComponent(
          sessionId
        )}`
      : "";
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
          <Metric
            label="Workload"
            value={
              workloadName ? (
                agentSessionPath ? (
                  <Link className="font-semibold text-sky-300 hover:underline" to={agentSessionPath}>
                    {workloadName}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-200">{workloadName}</span>
                )
              ) : (
                "-"
              )
            }
          />
          <Metric
            label="Agent Session"
            value={
              agentSessionPath && sessionId ? (
                <Link className="font-mono text-sky-300 hover:underline" to={agentSessionPath}>
                  {sessionId.slice(0, 8)}
                </Link>
              ) : (
                "-"
              )
            }
          />
          <Metric
            label="Run State"
            value={
              run.data ? (
                <StateBadge state={run.data.status} />
              ) : run.isLoading ? (
                <StateBadge state="checking" />
              ) : (
                "-"
              )
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

function metadataString(
  metadata: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
