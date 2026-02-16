"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/store/plan-store";
import { selectCTAs } from "@trip-planner/core";
import CTABar from "./CTABar";

export default function LodgingOverlay() {
  const context = usePlanStore((s) => s.context);
  const setMapFocus = usePlanStore((s) => s.setMapFocus);

  const ctas = useMemo(() => selectCTAs(context, "lodging"), [context]);

  const totalCost = context.bases.reduce((sum, b) => {
    const perNight = b.costPerNight?.value ?? 0;
    const nights = b.nights.value;
    return sum + perNight * nights;
  }, 0);

  return (
    <div className="lodging-overlay">
      {context.bases.length === 0 ? (
        <div className="overlay-section">
          <p className="overlay-empty-text">
            No lodging bases yet. Add where you'll stay to anchor your schedule.
          </p>
        </div>
      ) : (
        <div className="overlay-section">
          <h4 className="overlay-section-subtitle">
            Bases ({context.bases.length})
          </h4>
          {context.bases.map((b) => (
            <button
              key={b.id}
              className="overlay-day-row"
              onClick={() =>
                setMapFocus({
                  type: "base",
                  id: b.id,
                  coordinates: b.location.value,
                })
              }
            >
              <span className="overlay-day-label">{b.name.value}</span>
              <span className="overlay-day-meta">
                {b.nights.value} nights
                {b.costPerNight && ` \u00B7 $${b.costPerNight.value}/night`}
                {b.booked.value ? " \u2713 Booked" : ""}
              </span>
            </button>
          ))}
          {totalCost > 0 && (
            <div className="overlay-summary-row">
              Total lodging: ${totalCost.toLocaleString()}
            </div>
          )}
        </div>
      )}
      <CTABar ctas={ctas} onAction={() => {}} />
    </div>
  );
}
