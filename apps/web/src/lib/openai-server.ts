import OpenAI from "openai";
import { PlanContextSchema } from "@trip-planner/core";
import type { PlanContext, TripIntake } from "@trip-planner/core";

// ---------------------------------------------------------------------------
// Error class (mirrors mapbox-server.ts pattern)
// ---------------------------------------------------------------------------

export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
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
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(intake: TripIntake): string {
  return `You are a trip planning assistant. Given the user's trip details, generate a complete PlanContext JSON object.

REQUIREMENTS:
- Every value field must be wrapped in a Tracked<T> object: { "value": <val>, "provenance": "ai-proposed", "updatedAt": "<ISO timestamp>" }
- Use real, accurate [longitude, latitude] coordinates for the destination area (IMPORTANT: longitude first, latitude second)
- Generate deterministic IDs: bases use "base-1", "base-2", etc. Activities use "act-1", "act-2", etc.
- Generate 3-5 activities per day, distributed across timeBlocks (morning, afternoon, evening)
- Each activity needs: id, name (Tracked<string>), location (Tracked<[lon, lat]>), dayIndex (Tracked<number> or null), timeBlock (Tracked<"morning"|"afternoon"|"evening"|"flexible"> or null), priority (Tracked<"must-do"|"nice-to-have"|"if-time">), duration (Tracked<number> in minutes or null), cost (Tracked<number> or null)
- Generate dailySchedules referencing activity IDs, one per day (dayIndex 0 to nights-1)
- Each dailySchedule: { dayIndex, baseId, morning: [actIds], afternoon: [actIds], evening: [actIds] }
- Generate budget categories: Lodging, Activities, Food, Transport — each with estimated (Tracked<number>) and actual as null
- driveLegs must be an empty array (computed later via routing API)
- finalization: { emergencyContact: null, packingList: [], offlineNotes: [], confirmations: [] }
- skeleton must include: name, startDate, endDate (as Tracked<string> or null), arrivalAirport, departureAirport, partySize, partyDescription
- Base lodging: generate 1 base with realistic hotel name and coordinates for the destination
- Ensure all coordinates are realistic for "${intake.destination}"

TRIP DETAILS:
- Destination: ${intake.destination}
- Nights: ${intake.nights}
- Travelers: ${intake.travelers}
- Airport: ${intake.airport}
- Trip Style: ${intake.tripStyle}
- Budget: ${intake.budget}

Respond with ONLY valid JSON matching the PlanContext schema. No markdown, no explanation.`;
}

// ---------------------------------------------------------------------------
// Generate PlanContext via GPT-4o
// ---------------------------------------------------------------------------

export async function generatePlanContext(
  intake: TripIntake
): Promise<PlanContext> {
  const client = getOpenAIClient();
  const systemPrompt = buildSystemPrompt(intake);

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a complete trip plan for ${intake.destination}, ${intake.nights} nights, ${intake.travelers}, ${intake.tripStyle} style, ${intake.budget} budget, flying into ${intake.airport}.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new OpenAIError("Empty response from OpenAI", 502, "EmptyResponse");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAIError("Invalid JSON from OpenAI", 502, "InvalidJSON");
  }

  const result = PlanContextSchema.safeParse(parsed);
  if (!result.success) {
    console.error("PlanContext validation failed:", result.error.flatten());
    throw new OpenAIError(
      "Generated plan failed validation",
      502,
      "ValidationFailed"
    );
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Error → Response helper
// ---------------------------------------------------------------------------

export function openaiErrorToResponse(err: unknown): Response {
  if (err instanceof OpenAIError) {
    return Response.json(
      { error: err.code ?? "OpenAI error", message: err.message },
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
