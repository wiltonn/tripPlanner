"use client";

import type { NormalizedSummary } from "@trip-planner/map";

interface RouteAlternativesPanelProps {
  summaries: NormalizedSummary[];
  selectedAlt: number;
  onAltChange: (altIndex: number) => void;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

export default function RouteAlternativesPanel({
  summaries,
  selectedAlt,
  onAltChange,
}: RouteAlternativesPanelProps) {
  if (summaries.length <= 1) return null;

  const fastestDuration = Math.min(...summaries.map((s) => s.totalDuration));

  return (
    <div className="route-alt-panel">
      {summaries.map((summary, i) => {
        const isSelected = i === selectedAlt;
        const isFastest = summary.totalDuration === fastestDuration;
        const delta = summary.totalDuration - fastestDuration;

        return (
          <button
            key={i}
            className={`route-alt-card${isSelected ? " selected" : ""}`}
            onClick={() => onAltChange(i)}
          >
            <div className="route-alt-label">
              Route {i + 1}
              {isFastest && <span className="route-alt-tag">Fastest</span>}
            </div>
            <div className="route-alt-stats">
              <span>{formatDistance(summary.totalDistance)}</span>
              <span>{formatDuration(summary.totalDuration)}</span>
            </div>
            {delta > 0 && (
              <div className="route-alt-delta">
                +{formatDuration(delta)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
