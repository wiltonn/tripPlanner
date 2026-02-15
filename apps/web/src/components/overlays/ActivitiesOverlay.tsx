"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/store/plan-store";
import { selectCTAs } from "@trip-planner/core";
import CTABar from "./CTABar";

export default function ActivitiesOverlay() {
  const context = usePlanStore((s) => s.context);
  const setMapFocus = usePlanStore((s) => s.setMapFocus);

  const ctas = useMemo(() => selectCTAs(context, "activities"), [context]);

  const unassigned = context.activities.filter((a) => a.dayIndex === null);
  const assigned = context.activities.filter((a) => a.dayIndex !== null);

  return (
    <div className="activities-overlay">
      {context.activities.length === 0 ? (
        <div className="overlay-section">
          <p className="overlay-empty-text">
            No activities yet. Add your must-do activities to start planning.
          </p>
        </div>
      ) : (
        <>
          {assigned.length > 0 && (
            <div className="overlay-section">
              <h4 className="overlay-section-subtitle">
                Assigned ({assigned.length})
              </h4>
              {assigned.map((a) => (
                <button
                  key={a.id}
                  className="overlay-day-row"
                  onClick={() =>
                    setMapFocus({
                      type: "activity",
                      id: a.id,
                      coordinates: a.location.value,
                    })
                  }
                >
                  <span className="overlay-day-label">{a.name.value}</span>
                  <span className="overlay-day-meta">
                    Day {(a.dayIndex?.value ?? 0) + 1}
                    {a.priority && ` \u00B7 ${a.priority.value}`}
                  </span>
                </button>
              ))}
            </div>
          )}
          {unassigned.length > 0 && (
            <div className="overlay-section">
              <h4 className="overlay-section-subtitle">
                Unassigned ({unassigned.length})
              </h4>
              {unassigned.map((a) => (
                <button
                  key={a.id}
                  className="overlay-day-row"
                  onClick={() =>
                    setMapFocus({
                      type: "activity",
                      id: a.id,
                      coordinates: a.location.value,
                    })
                  }
                >
                  <span className="overlay-day-label">{a.name.value}</span>
                  <span className="overlay-day-meta">{a.priority.value}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <CTABar ctas={ctas} onAction={() => {}} />
    </div>
  );
}
