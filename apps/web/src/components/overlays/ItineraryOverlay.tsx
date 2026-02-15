"use client";

import { useState, useCallback, useMemo } from "react";
import { usePlanStore } from "@/store/plan-store";
import { selectCTAs, computeCompleteness } from "@trip-planner/core";
import CTABar from "./CTABar";

export default function ItineraryOverlay() {
  const context = usePlanStore((s) => s.context);
  const setTripDates = usePlanStore((s) => s.setTripDates);
  const setTripName = usePlanStore((s) => s.setTripName);
  const setMapFocus = usePlanStore((s) => s.setMapFocus);

  const [activeCTAForm, setActiveCTAForm] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [tripName, setTripNameLocal] = useState("");

  const ctas = useMemo(() => selectCTAs(context, "itinerary"), [context]);
  const completeness = useMemo(() => computeCompleteness(context), [context]);

  const handleCTAAction = useCallback((ctaId: string) => {
    setActiveCTAForm(ctaId);
  }, []);

  const handleSaveDates = useCallback(() => {
    if (dateStart && dateEnd) {
      setTripDates(dateStart, dateEnd);
      setActiveCTAForm(null);
    }
  }, [dateStart, dateEnd, setTripDates]);

  const handleSaveName = useCallback(() => {
    if (tripName.trim()) {
      setTripName(tripName.trim());
      setActiveCTAForm(null);
      setTripNameLocal("");
    }
  }, [tripName, setTripName]);

  // Compute day count from dates
  const dayCount = useMemo(() => {
    const start = context.skeleton.startDate?.value;
    const end = context.skeleton.endDate?.value;
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
  }, [context.skeleton.startDate, context.skeleton.endDate]);

  const handleDayClick = useCallback(
    (dayIndex: number) => {
      const base = context.bases.find((b) => {
        // Find base associated with this day
        const schedule = context.dailySchedules.find(
          (ds) => ds.dayIndex === dayIndex
        );
        return schedule && schedule.baseId === b.id;
      });

      if (base) {
        setMapFocus({
          type: "day",
          coordinates: base.location.value,
        });
      }
    },
    [context.bases, context.dailySchedules, setMapFocus]
  );

  return (
    <div className="itinerary-overlay">
      {/* Trip name */}
      <div className="overlay-section">
        <h3 className="overlay-section-title">
          {context.skeleton.name?.value ?? "Untitled Trip"}
        </h3>
        {context.skeleton.startDate && context.skeleton.endDate && (
          <p className="overlay-section-meta">
            {context.skeleton.startDate.value} &mdash;{" "}
            {context.skeleton.endDate.value} ({dayCount} days)
          </p>
        )}
      </div>

      {/* Open decisions */}
      {completeness.openDecisions.length > 0 && (
        <div className="overlay-section">
          <h4 className="overlay-section-subtitle">Open Decisions</h4>
          <ul className="overlay-decisions">
            {completeness.openDecisions.map((d, i) => (
              <li key={i} className="overlay-decision-item">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Day list */}
      {dayCount > 0 && (
        <div className="overlay-section">
          <h4 className="overlay-section-subtitle">Days</h4>
          {Array.from({ length: dayCount }, (_, i) => {
            const schedule = context.dailySchedules.find(
              (ds) => ds.dayIndex === i
            );
            const activityCount = schedule
              ? schedule.morning.length +
                schedule.afternoon.length +
                schedule.evening.length
              : 0;

            return (
              <button
                key={i}
                className="overlay-day-row"
                onClick={() => handleDayClick(i)}
              >
                <span className="overlay-day-label">Day {i + 1}</span>
                <span className="overlay-day-meta">
                  {activityCount > 0
                    ? `${activityCount} activities`
                    : "No activities yet"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* CTA Bar */}
      <CTABar ctas={ctas} onAction={handleCTAAction} />

      {/* Inline forms */}
      {activeCTAForm === "set-trip-dates" && (
        <div className="overlay-inline-form">
          <h4 className="overlay-form-title">Set Travel Dates</h4>
          <div className="overlay-form-row">
            <label className="overlay-form-label">
              Start
              <input
                type="date"
                className="overlay-form-input"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </label>
            <label className="overlay-form-label">
              End
              <input
                type="date"
                className="overlay-form-input"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="overlay-form-actions">
            <button className="overlay-form-save" onClick={handleSaveDates}>
              Save
            </button>
            <button
              className="overlay-form-cancel"
              onClick={() => setActiveCTAForm(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeCTAForm === "add-first-base" && (
        <div className="overlay-inline-form">
          <h4 className="overlay-form-title">Name Your Trip</h4>
          <input
            type="text"
            className="overlay-form-input"
            placeholder="e.g. NYC Summer Trip"
            value={tripName}
            onChange={(e) => setTripNameLocal(e.target.value)}
          />
          <div className="overlay-form-actions">
            <button className="overlay-form-save" onClick={handleSaveName}>
              Save
            </button>
            <button
              className="overlay-form-cancel"
              onClick={() => setActiveCTAForm(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
