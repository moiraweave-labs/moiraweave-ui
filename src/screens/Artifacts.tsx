import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { ArtifactDetails } from "../components/ArtifactDetails";
import { ErrorMessage, Panel } from "../components/common";
import { COMMON_ENVIRONMENTS } from "../constants";
import { formatDate } from "../utils";

export function Artifacts() {
  const workloads = useQuery({ queryKey: ["workloads"], queryFn: api.workloads });
  const [searchParams, setSearchParams] = useSearchParams();
  const [workload, setWorkload] = useState(() => searchParams.get("workload_name") || "");
  const [env, setEnv] = useState(() => searchParams.get("env") || "");
  const [sessionId, setSessionId] = useState(() => searchParams.get("session_id") || "");
  const [runId, setRunId] = useState(() => searchParams.get("run_id") || "");
  const [contentType, setContentType] = useState(() => searchParams.get("content_type") || "");
  const [createdFrom, setCreatedFrom] = useState(() => searchParams.get("created_from") || "");
  const [createdTo, setCreatedTo] = useState(() => searchParams.get("created_to") || "");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams();
    if (workload) next.set("workload_name", workload);
    if (env) next.set("env", env);
    if (sessionId) next.set("session_id", sessionId);
    if (runId) next.set("run_id", runId);
    if (contentType) next.set("content_type", contentType);
    if (createdFrom) next.set("created_from", createdFrom);
    if (createdTo) next.set("created_to", createdTo);
    setSearchParams(next, { replace: true });
  }, [contentType, createdFrom, createdTo, env, runId, sessionId, setSearchParams, workload]);

  const artifacts = useInfiniteQuery({
    queryKey: [
      "artifact-library",
      workload,
      env,
      sessionId,
      runId,
      contentType,
      createdFrom,
      createdTo
    ],
    queryFn: ({ pageParam }) =>
      api.artifactLibrary({
        workload_name: workload || undefined,
        env: env || undefined,
        session_id: sessionId || undefined,
        run_id: runId || undefined,
        content_type: contentType || undefined,
        created_from: normalizeDateFilter(createdFrom, "from"),
        created_to: normalizeDateFilter(createdTo, "to"),
        limit: 100,
        offset: pageParam
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 100 ? pages.length * 100 : undefined,
    refetchInterval: 5000
  });
  const discoveredArtifacts = useMemo(
    () => artifacts.data?.pages.flatMap((page) => page) || [],
    [artifacts.data]
  );
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
        <div className="space-y-4 p-5">
          {workloads.error && (
            <ErrorMessage
              error={workloads.error}
              fallback="Unable to load workload filters."
            />
          )}
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Environment</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                value={env}
                onChange={(event) => setEnv(event.target.value)}
                aria-label="Environment"
              >
                <option value="">All environments</option>
                {COMMON_ENVIRONMENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
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
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Created From</label>
              <input
                className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                type="datetime-local"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Created To</label>
              <input
                className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                type="datetime-local"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
              />
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel title="Discovered Artifacts">
          <div className="divide-y divide-slate-800/50">
            {discoveredArtifacts.map((artifact) => (
              <div
                key={artifact.id}
                className={`grid w-full items-start gap-3 p-5 text-left text-sm transition-colors lg:grid-cols-[1.3fr_1fr_1fr] ${
                  selectedArtifact?.id === artifact.id
                    ? "bg-emerald-500/5"
                    : "hover:bg-slate-800/10"
                }`}
              >
                <button
                  className="min-w-0 text-left"
                  onClick={() => setSelectedArtifactId(artifact.id)}
                  type="button"
                >
                  <span className="block break-words text-xs font-bold text-slate-200">
                    {artifact.name}
                  </span>
                  <span className="mt-1 block break-all font-mono text-[10px] text-slate-500">
                    {artifact.uri}
                  </span>
                  <span className="mt-2 inline-flex rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-400">
                    {artifact.content_type || "unknown type"}
                  </span>
                </button>

                <div className="grid gap-2 text-[11px] text-slate-400">
                  <ArtifactContextRow label="Workload">
                    {artifact.workload_name ? (
                      <Link
                        className="font-semibold text-sky-300 hover:underline"
                        to={`/operations?workload=${encodeURIComponent(
                          artifact.workload_name
                        )}`}
                      >
                        {artifact.workload_name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </ArtifactContextRow>
                  <ArtifactContextRow label="Session">
                    {artifact.workload_name && artifact.session_id ? (
                      <Link
                        className="font-mono text-sky-300 hover:underline"
                        to={`/agents?agent=${encodeURIComponent(
                          artifact.workload_name
                        )}&session_id=${encodeURIComponent(artifact.session_id)}`}
                      >
                        {artifact.session_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </ArtifactContextRow>
                  <ArtifactContextRow label="Created">
                    {formatDate(artifact.created_at)}
                  </ArtifactContextRow>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link
                    className="rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
                    to={`/runs/${artifact.run_id}`}
                  >
                    Run {artifact.run_id.slice(0, 8)}
                  </Link>
                  {artifact.workload_name && artifact.session_id && (
                    <Link
                      className="rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
                      to={`/artifacts?workload_name=${encodeURIComponent(
                        artifact.workload_name
                      )}&session_id=${encodeURIComponent(artifact.session_id)}${
                        env ? `&env=${encodeURIComponent(env)}` : ""
                      }`}
                    >
                      Session artifacts
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {artifacts.isLoading && discoveredArtifacts.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                Loading artifact metadata...
              </div>
            )}
            {artifacts.error && (
              <div className="p-5">
                <ErrorMessage
                  error={artifacts.error}
                  fallback="Unable to load artifact library."
                />
              </div>
            )}
            {!artifacts.isLoading && !artifacts.error && discoveredArtifacts.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No artifacts match the current filters
              </div>
            )}
            {artifacts.hasNextPage && (
              <div className="p-5">
                <button
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 disabled:opacity-50"
                  disabled={artifacts.isFetchingNextPage}
                  onClick={() => artifacts.fetchNextPage()}
                  type="button"
                >
                  {artifacts.isFetchingNextPage ? "Loading artifacts..." : "Load more artifacts"}
                </button>
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

function ArtifactContextRow({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-900 bg-[#090d16]/50 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

function normalizeDateFilter(value: string, boundary: "from" | "to"): string | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:${boundary === "to" ? "59" : "00"}`
    : value;
}
