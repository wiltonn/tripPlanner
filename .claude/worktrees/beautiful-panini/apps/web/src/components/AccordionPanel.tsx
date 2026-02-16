"use client";

import { usePlanStore } from "@/store/plan-store";
import { computeCompleteness } from "@trip-planner/core";
import type { OverlayId } from "@trip-planner/core";
import DayTimeline from "./DayTimeline";
import ItineraryOverlay from "./overlays/ItineraryOverlay";
import ActivitiesOverlay from "./overlays/ActivitiesOverlay";
import LodgingOverlay from "./overlays/LodgingOverlay";
import DrivingSummaryOverlay from "./overlays/DrivingSummaryOverlay";
import BudgetOverlay from "./overlays/BudgetOverlay";

const SECTIONS: { id: OverlayId; label: string; icon: string; facet: string }[] = [
  { id: "itinerary", label: "Itinerary", icon: "\u{1F4CB}", facet: "skeleton" },
  { id: "activities", label: "Activities", icon: "\u{1F3AF}", facet: "activities" },
  { id: "lodging", label: "Lodging", icon: "\u{1F3E8}", facet: "bases" },
  { id: "driving", label: "Driving", icon: "\u{1F697}", facet: "driveLegs" },
  { id: "budget", label: "Budget", icon: "\u{1F4B0}", facet: "budget" },
];

function CompletenessIndicator({ ratio }: { ratio: number }) {
  let color = "#dc2626";
  if (ratio >= 0.75) color = "#16a34a";
  else if (ratio >= 0.4) color = "#f59e0b";

  return <span className="accordion-dot" style={{ backgroundColor: color }} />;
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span className={`accordion-chevron${expanded ? " expanded" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

interface AccordionPanelProps {
  dayCount: number;
}

export default function AccordionPanel({ dayCount }: AccordionPanelProps) {
  const selectedOverlay = usePlanStore((s) => s.selectedOverlay);
  const toggleOverlay = usePlanStore((s) => s.toggleOverlay);
  const activeDayIndex = usePlanStore((s) => s.activeDayIndex);
  const setActiveDayIndex = usePlanStore((s) => s.setActiveDayIndex);
  const context = usePlanStore((s) => s.context);

  const completeness = computeCompleteness(context);
  const facetMap = Object.fromEntries(completeness.facets.map((f) => [f.facet, f]));

  return (
    <div className="accordion-panel">
      {SECTIONS.map((section) => {
        const expanded = selectedOverlay === section.id;
        const facetComp = facetMap[section.facet];

        return (
          <div key={section.id} className="accordion-section">
            <button
              className={`accordion-header${expanded ? " expanded" : ""}`}
              onClick={() => toggleOverlay(section.id)}
            >
              <span className="accordion-header-left">
                <span className="accordion-icon">{section.icon}</span>
                <span className="accordion-label">{section.label}</span>
                {facetComp && <CompletenessIndicator ratio={facetComp.ratio} />}
              </span>
              <Chevron expanded={expanded} />
            </button>
            <div className={`accordion-body${expanded ? " expanded" : ""}`}>
              <div className="accordion-body-inner">
                <div className="accordion-body-content">
                  {section.id === "itinerary" && (
                    <DayTimeline
                      dayCount={dayCount}
                      activeDayIndex={activeDayIndex}
                      onDayChange={setActiveDayIndex}
                    />
                  )}
                  {expanded && (
                    <>
                      {section.id === "itinerary" && <ItineraryOverlay />}
                      {section.id === "activities" && <ActivitiesOverlay />}
                      {section.id === "lodging" && <LodgingOverlay />}
                      {section.id === "driving" && <DrivingSummaryOverlay />}
                      {section.id === "budget" && <BudgetOverlay />}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
