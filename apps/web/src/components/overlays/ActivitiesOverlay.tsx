"use client";

import { useMemo, useState, useCallback } from "react";
import { usePlanStore } from "@/store/plan-store";
import { selectCTAs, tracked } from "@trip-planner/core";
import type { Activity, SearchResult } from "@trip-planner/core";
import CTABar from "./CTABar";
import ActivitySearch from "@/components/ActivitySearch";

type TimeBlock = "morning" | "afternoon" | "evening" | "flexible";
type Priority = "must-do" | "nice-to-have" | "if-time";

interface AddFormState {
  name: string;
  coordinates: [number, number] | null;
  dayIndex: number | null;
  timeBlock: TimeBlock;
  priority: Priority;
  duration: string;
}

const EMPTY_FORM: AddFormState = {
  name: "",
  coordinates: null,
  dayIndex: null,
  timeBlock: "flexible",
  priority: "nice-to-have",
  duration: "",
};

export default function ActivitiesOverlay() {
  const context = usePlanStore((s) => s.context);
  const setMapFocus = usePlanStore((s) => s.setMapFocus);
  const addActivity = usePlanStore((s) => s.addActivity);
  const assignActivityToDay = usePlanStore((s) => s.assignActivityToDay);
  const removeActivity = usePlanStore((s) => s.removeActivity);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);

  const ctas = useMemo(() => selectCTAs(context, "activities"), [context]);

  const unassigned = context.activities.filter((a) => a.dayIndex === null);
  const assigned = context.activities.filter((a) => a.dayIndex !== null);

  // Count days from skeleton or daily schedules
  const dayCount = useMemo(() => {
    const start = context.skeleton.startDate?.value;
    const end = context.skeleton.endDate?.value;
    if (start && end) {
      const diff = Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / 86400000
      );
      return Math.max(diff + 1, 1);
    }
    return Math.max(context.dailySchedules.length, 2);
  }, [context.skeleton.startDate, context.skeleton.endDate, context.dailySchedules.length]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    setForm((f) => ({
      ...f,
      name: result.name,
      coordinates: result.coordinates,
    }));
    setShowForm(true);
  }, []);

  const handleSubmit = () => {
    if (!form.name || !form.coordinates) return;
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const activity: Activity = {
      id,
      name: tracked(form.name),
      location: tracked(form.coordinates),
      dayIndex: form.dayIndex !== null ? tracked(form.dayIndex) : null,
      timeBlock: tracked(form.timeBlock),
      priority: tracked(form.priority),
      duration: form.duration ? tracked(Number(form.duration)) : null,
      cost: null,
    };
    addActivity(activity);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleDayAssign = (activityId: string, dayIdx: number | null) => {
    assignActivityToDay(activityId, dayIdx);
  };

  return (
    <div className="activities-overlay">
      {/* Search bar */}
      <div className="overlay-section">
        <ActivitySearch onSelect={handleSearchSelect} />
      </div>

      {/* Add Activity form */}
      {showForm && (
        <div className="overlay-inline-form">
          <div className="overlay-form-title">Add Activity</div>

          <div className="overlay-form-row">
            <label className="overlay-form-label">
              Name
              <input
                className="overlay-form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
          </div>

          <div className="overlay-form-row">
            <label className="overlay-form-label">
              Day
              <select
                className="overlay-form-input"
                value={form.dayIndex ?? "unassigned"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dayIndex: e.target.value === "unassigned" ? null : Number(e.target.value),
                  }))
                }
              >
                <option value="unassigned">Unassigned</option>
                {Array.from({ length: dayCount }, (_, i) => (
                  <option key={i} value={i}>
                    Day {i + 1}
                  </option>
                ))}
              </select>
            </label>

            <label className="overlay-form-label">
              Time
              <select
                className="overlay-form-input"
                value={form.timeBlock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timeBlock: e.target.value as TimeBlock }))
                }
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
          </div>

          <div className="overlay-form-row">
            <label className="overlay-form-label">
              Priority
              <select
                className="overlay-form-input"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Priority }))
                }
              >
                <option value="must-do">Must-do</option>
                <option value="nice-to-have">Nice-to-have</option>
                <option value="if-time">If time</option>
              </select>
            </label>

            <label className="overlay-form-label">
              Duration (min)
              <input
                className="overlay-form-input"
                type="number"
                placeholder="Optional"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              />
            </label>
          </div>

          {form.coordinates && (
            <div className="activity-form-coords">
              {form.coordinates[1].toFixed(4)}, {form.coordinates[0].toFixed(4)}
            </div>
          )}

          <div className="overlay-form-actions">
            <button className="overlay-form-save" onClick={handleSubmit}>
              Add Activity
            </button>
            <button className="overlay-form-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activity list */}
      {context.activities.length === 0 && !showForm ? (
        <div className="overlay-section">
          <p className="overlay-empty-text">
            No activities yet. Search for places above or add your must-do activities.
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
                <div key={a.id} className="overlay-day-row activity-row">
                  <button
                    className="activity-row-main"
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
                      {a.priority && ` · ${a.priority.value}`}
                    </span>
                  </button>
                  <select
                    className="activity-day-select"
                    value={a.dayIndex?.value ?? "unassigned"}
                    onChange={(e) =>
                      handleDayAssign(
                        a.id,
                        e.target.value === "unassigned" ? null : Number(e.target.value)
                      )
                    }
                  >
                    <option value="unassigned">Unassign</option>
                    {Array.from({ length: dayCount }, (_, i) => (
                      <option key={i} value={i}>
                        Day {i + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    className="activity-remove-btn"
                    onClick={() => removeActivity(a.id)}
                    title="Remove activity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {unassigned.length > 0 && (
            <div className="overlay-section">
              <h4 className="overlay-section-subtitle">
                Unassigned ({unassigned.length})
              </h4>
              {unassigned.map((a) => (
                <div key={a.id} className="overlay-day-row activity-row">
                  <button
                    className="activity-row-main"
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
                  <select
                    className="activity-day-select"
                    value="unassigned"
                    onChange={(e) =>
                      handleDayAssign(
                        a.id,
                        e.target.value === "unassigned" ? null : Number(e.target.value)
                      )
                    }
                  >
                    <option value="unassigned">Assign...</option>
                    {Array.from({ length: dayCount }, (_, i) => (
                      <option key={i} value={i}>
                        Day {i + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    className="activity-remove-btn"
                    onClick={() => removeActivity(a.id)}
                    title="Remove activity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <CTABar ctas={ctas} onAction={() => {}} />
    </div>
  );
}
