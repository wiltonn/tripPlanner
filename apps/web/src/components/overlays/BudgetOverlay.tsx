"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/store/plan-store";
import { selectCTAs } from "@trip-planner/core";
import CTABar from "./CTABar";

export default function BudgetOverlay() {
  const context = usePlanStore((s) => s.context);

  const ctas = useMemo(() => selectCTAs(context, "budget"), [context]);

  const totalEstimated = context.budget.reduce(
    (sum, bc) => sum + (bc.estimated?.value ?? 0),
    0
  );
  const totalActual = context.budget.reduce(
    (sum, bc) => sum + (bc.actual?.value ?? 0),
    0
  );

  return (
    <div className="budget-overlay">
      {context.budget.length === 0 ? (
        <div className="overlay-section">
          <p className="overlay-empty-text">
            No budget set up yet. Add lodging and activities first.
          </p>
        </div>
      ) : (
        <div className="overlay-section">
          <h4 className="overlay-section-subtitle">Budget Breakdown</h4>
          {context.budget.map((bc) => {
            const est = bc.estimated?.value ?? 0;
            const act = bc.actual?.value ?? 0;
            const pct = est > 0 ? Math.round((act / est) * 100) : 0;
            return (
              <div key={bc.category} className="budget-row">
                <div className="budget-row-header">
                  <span className="budget-category">{bc.category}</span>
                  <span className="budget-amounts">
                    ${act.toLocaleString()} / ${est.toLocaleString()}
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className="budget-bar-fill"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 100 ? "#dc2626" : "#3b82f6",
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div className="overlay-summary-row">
            Total: ${totalActual.toLocaleString()} / $
            {totalEstimated.toLocaleString()}
          </div>
        </div>
      )}
      <CTABar ctas={ctas} onAction={() => {}} />
    </div>
  );
}
