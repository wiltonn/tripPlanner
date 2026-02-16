import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { PlanContext, TripIntake } from "@trip-planner/core";
import {
  TripSkeletonSchema,
  BaseSchema,
  ActivitySchema,
  DayScheduleSchema,
  BudgetCategorySchema,
} from "@trip-planner/core";

// ---------------------------------------------------------------------------
// Error class (mirrors mapbox-server.ts pattern)
// ---------------------------------------------------------------------------

export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIError("OPENAI_API_KEY is not set", 500);
  _client = new OpenAI({ apiKey });
  return _client;
}

// ---------------------------------------------------------------------------
// Generation-specific schema (omits driveLegs + finalization for LLM compat)
// ---------------------------------------------------------------------------

const PlanContextGenSchema = z.object({
  skeleton: TripSkeletonSchema,
  bases: z.array(BaseSchema),
  activities: z.array(ActivitySchema),
  dailySchedules: z.array(DayScheduleSchema),
  budget: z.array(BudgetCategorySchema),
});

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(intake: TripIntake): string {
  return `You are a trip planning assistant. Generate a trip plan for the destination described below.

RULES:
- Coordinates are [longitude, latitude] — longitude first!
- Use real, accurate coordinates for ${intake.destination}
- IDs: "base-1", "base-2" for bases; "act-1", "act-2", ... for activities
- Generate 3-5 activities per day, spread across morning/afternoon/evening
- timeBlock must be one of: "morning", "afternoon", "evening", "flexible"
- priority must be one of: "must-do", "nice-to-have", "if-time"
- Generate one dailySchedule per day (dayIndex 0 to ${intake.nights - 1})
- duration is in minutes, cost is in USD
- skeleton.startDate and skeleton.endDate should be null (user hasn't picked dates)
- All provenance values must be "ai-proposed"
- updatedAt must be a valid ISO 8601 timestamp

TRIP DETAILS:
- Destination: ${intake.destination}
- Nights: ${intake.nights}
- Travelers: ${intake.travelers}
- Airport: ${intake.airport}
- Trip Style: ${intake.tripStyle}
- Budget: ${intake.budget}`;
}

// ---------------------------------------------------------------------------
// Generate PlanContext via GPT-4o
// ---------------------------------------------------------------------------

export async function generatePlanContext(
  intake: TripIntake
): Promise<PlanContext> {
  const client = getOpenAIClient();
  const systemPrompt = buildSystemPrompt(intake);

  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a complete trip plan for ${intake.destination}, ${intake.nights} nights.`,
      },
    ],
    response_format: zodResponseFormat(PlanContextGenSchema, "plan_context"),
    temperature: 0.7,
  });

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new OpenAIError(
      `OpenAI refused: ${message.refusal}`,
      502,
      "Refusal"
    );
  }

  const generated = message?.parsed;
  if (!generated) {
    throw new OpenAIError("Empty response from OpenAI", 502, "EmptyResponse");
  }

  return {
    ...generated,
    driveLegs: [],
    finalization: {
      emergencyContact: null,
      packingList: [],
      offlineNotes: [],
      confirmations: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Error → Response helper
// ---------------------------------------------------------------------------

export function openaiErrorToResponse(err: unknown): Response {
  if (err instanceof OpenAIError) {
    return Response.json(
      {
        error: err.code ?? "OpenAI error",
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      { status: err.statusCode }
    );
  }
  if (err instanceof OpenAI.APIError) {
    if (err.status === 429) {
      return Response.json(
        { error: "Rate limit exceeded", message: "Too many requests to AI service" },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "AI service error", message: err.message },
      { status: 502 }
    );
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
