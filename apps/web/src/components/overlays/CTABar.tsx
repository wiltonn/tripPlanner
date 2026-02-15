"use client";

import type { ActiveCTA } from "@trip-planner/core";

interface CTABarProps {
  ctas: ActiveCTA[];
  onAction: (ctaId: string) => void;
}

export default function CTABar({ ctas, onAction }: CTABarProps) {
  if (ctas.length === 0) return null;

  return (
    <div className="cta-bar">
      {ctas.map((cta) => (
        <button
          key={cta.id}
          className={`cta-btn${cta.aiAssist ? " cta-ai" : ""}`}
          onClick={() => onAction(cta.id)}
          title={cta.rationale}
        >
          <span className="cta-label">{cta.label}</span>
          {cta.aiAssist && <span className="cta-ai-badge">AI</span>}
        </button>
      ))}
    </div>
  );
}
