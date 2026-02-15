"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/store/plan-store";
import { selectCTAs } from "@trip-planner/core";
import CTABar from "./CTABar";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters: number): string {
  const mi = meters / 1609.34;
  return `${mi.toFixed(1)} mi`;
}

export default function DrivingSummaryOverlay() {
  const context = usePlanStore((s) => s.context);

  const ctas = useMemo(() => selectCTAs(context, "driving"), [context]);

  const totalDuration = context.driveLegs.reduce(
    (sum, dl) => sum + (dl.duration?.value ?? 0),
    0
  );
  const totalDistance = context.driveLegs.reduce(
    (sum, dl) => sum + (dl.distance?.value ?? 0),
    0
  );

  const maxDay = useMemo(() => {
    if (context.driveLegs.length === 0) return null;
    const byDay = new Map<number, number>();
    for (const dl of context.driveLegs) {
      // Associate drive legs with schedule days via fromId
      const schedule = context.dailySchedules.find(
        (ds) =>
          ds.morning.includes(dl.fromId) ||
          ds.afternoon.includes(dl.fromId) ||
          ds.evening.includes(dl.fromId)
      );
      const dayIdx = schedule?.dayIndex ?? 0;
      byDay.set(dayIdx, (byDay.get(dayIdx) ?? 0) + (dl.duration?.value ?? 0));
    }
    let max = 0;
    let maxIdx = 0;
    for (const [idx, dur] of byDay) {
      if (dur > max) {
        max = dur;
        maxIdx = idx;
      }
    }
    return { dayIndex: maxIdx, duration: max };
  }, [context.driveLegs, context.dailySchedules]);

  return (
    <div className="driving-overlay">
      {context.driveLegs.length === 0 ? (
        <div className="overlay-section">
          <p className="overlay-empty-text">
            No drive legs computed yet. Build a daily schedule first, then
            calculate drive times.
          </p>
        </div>
      ) : (
        <>
          <div className="overlay-section">
            <div className="overlay-summary-row">
              Total: {formatDistance(totalDistance)} &middot;{" "}
              {formatDuration(totalDuration)}
            </div>
            {maxDay && maxDay.duration > 4 * 3600 && (
              <div className="overlay-warning">
                Day {maxDay.dayIndex + 1} has {formatDuration(maxDay.duration)}{" "}
                of driving — consider adjusting
              </div>
            )}
          </div>
          <div className="overlay-section">
            <h4 className="overlay-section-subtitle">Drive Legs</h4>
            {context.driveLegs.map((dl) => (
              <div key={dl.id} className="overlay-day-row">
                <span className="overlay-day-label">
                  {dl.fromId} &rarr; {dl.toId}
                </span>
                <span className="overlay-day-meta">
                  {dl.distance ? formatDistance(dl.distance.value) : "—"}{" "}
                  &middot;{" "}
                  {dl.duration ? formatDuration(dl.duration.value) : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <CTABar ctas={ctas} onAction={() => {}} />
    </div>
  );
}
