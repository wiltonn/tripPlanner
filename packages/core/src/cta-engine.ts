import type { PlanContext, OverlayId } from "./plan-context";
import type { CTADefinition } from "./cta-registry";
import { ctaRegistry } from "./cta-registry";

// ---------------------------------------------------------------------------
// Active CTA — a scored, eligible CTA ready for rendering
// ---------------------------------------------------------------------------

export interface ActiveCTA {
  id: string;
  label: string;
  facet: string;
  score: number;
  rationale: string;
  actionType: CTADefinition["actionType"];
  aiAssist: boolean;
}

// ---------------------------------------------------------------------------
// selectCTAs — pure function, fully testable
// ---------------------------------------------------------------------------

export function selectCTAs(
  ctx: PlanContext,
  focus: OverlayId | null = null,
  maxCount = 3,
  registry: CTADefinition[] = ctaRegistry
): ActiveCTA[] {
  const eligible: ActiveCTA[] = [];

  for (const cta of registry) {
    if (!cta.preconditions(ctx)) continue;
    if (!cta.isEligible(ctx, focus)) continue;

    const score = cta.score(ctx);
    if (score <= 0) continue;

    eligible.push({
      id: cta.id,
      label: cta.label,
      facet: cta.facet,
      score,
      rationale: cta.rationale(ctx),
      actionType: cta.actionType,
      aiAssist: cta.aiAssist ?? false,
    });
  }

  eligible.sort((a, b) => b.score - a.score);

  return eligible.slice(0, maxCount);
}
