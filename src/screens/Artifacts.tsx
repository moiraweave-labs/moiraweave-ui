import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { ArtifactDetails } from "../components/ArtifactDetails";
import { Panel } from "../components/common";

export function Artifacts() {
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
