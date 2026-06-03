import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, streamRunEvents } from "../api";
import type { RunEvent } from "../api";
import { useAuthProfile } from "../auth";
import { ArtifactDetails } from "../components/ArtifactDetails";
import {
  ProducedArtifactsPanel,
  RunDiagnosticsPanel,
  RunEventTimeline,
  RunLiveEventsPanel,
  RunPayloadPanel,
  RunSummaryPanel,
  type RunStreamStatus
} from "../components/runs";
import { mergeEvents } from "../utils";

export function RunDetail() {
  const { runId = "" } = useParams();
  const queryClient = useQueryClient();
  const { canOperate } = useAuthProfile();
  const [streamedEvents, setStreamedEvents] = useState<RunEvent[]>([]);
  const [streamStatus, setStreamStatus] = useState<RunStreamStatus>({
    status: "connecting",
    message: "Opening live event stream..."
  });
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
    setStreamStatus({
      status: "connecting",
      message: "Opening live event stream..."
    });
    const controller = streamRunEvents(
      runId,
      (event) => {
        setStreamedEvents((current) =>
          current.some((item) => item.id === event.id) ? current : [...current, event]
        );
        setStreamStatus({
          status: "live",
          message: "Receiving live runtime events from the API gateway.",
          lastEventAt: event.timestamp
        });
      },
      (error) => {
        setStreamStatus({
          status: "degraded",
          message: streamErrorMessage(error)
        });
      },
      () => {
        setStreamStatus((currentStatus) =>
          currentStatus.status === "connecting"
            ? {
                status: "connected",
                message: "Live stream connected. Waiting for new runtime events."
              }
            : currentStatus
        );
      }
    );
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <RunSummaryPanel
          runId={runId}
          current={current}
          canOperate={canOperate}
          onCancel={() => cancel.mutate()}
        />
        <RunDiagnosticsPanel
          current={current}
          events={timeline}
          artifactCount={producedArtifacts.length}
        />
        <RunLiveEventsPanel
          stream={streamStatus}
          storedCount={events.data?.length || 0}
          streamedCount={streamedEvents.length}
        />
        <RunEventTimeline events={timeline} />
      </div>

      <div className="space-y-6">
        <RunPayloadPanel
          payload={current?.payload || undefined}
          result={current?.result}
          error={current?.error}
        />
        <ProducedArtifactsPanel
          artifacts={producedArtifacts}
          selectedArtifactId={selectedArtifact?.id}
          onSelect={setSelectedArtifactId}
        />
        {selectedArtifact && <ArtifactDetails artifact={selectedArtifact} />}
      </div>
    </div>
  );
}

function streamErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `Live event stream degraded: ${error.message}. Persisted events still refresh from the API.`;
  }
  return "Live event stream degraded. Persisted events still refresh from the API.";
}
