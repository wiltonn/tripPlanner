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
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(intake: TripIntake): string {
  const now = new Date().toISOString();

  return `You are a trip planning assistant. Generate a PlanContext JSON object for the trip described below.

CRITICAL: You must output a single JSON object matching EXACTLY this structure. Every "tracked" value uses this wrapper:
{"value": <val>, "provenance": "ai-proposed", "updatedAt": "${now}"}

Here is a COMPLETE EXAMPLE for a 2-night trip with 2 activities per day:

{
  "skeleton": {
    "name": {"value": "NYC Weekend", "provenance": "ai-proposed", "updatedAt": "${now}"},
    "startDate": null,
    "endDate": null,
    "arrivalAirport": {"value": "JFK", "provenance": "ai-proposed", "updatedAt": "${now}"},
    "departureAirport": {"value": "JFK", "provenance": "ai-proposed", "updatedAt": "${now}"},
    "partySize": {"value": 2, "provenance": "ai-proposed", "updatedAt": "${now}"},
    "partyDescription": {"value": "Couple", "provenance": "ai-proposed", "updatedAt": "${now}"}
  },
  "bases": [
    {
      "id": "base-1",
      "name": {"value": "Hotel Name", "provenance": "ai-proposed", "updatedAt": "${now}"},
      "location": {"value": [-74.006, 40.7128], "provenance": "ai-proposed", "updatedAt": "${now}"},
      "nights": {"value": 2, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "checkIn": null,
      "checkOut": null,
      "booked": {"value": false, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "costPerNight": {"value": 200, "provenance": "ai-proposed", "updatedAt": "${now}"}
    }
  ],
  "activities": [
    {
      "id": "act-1",
      "name": {"value": "Central Park Walk", "provenance": "ai-proposed", "updatedAt": "${now}"},
      "location": {"value": [-73.9654, 40.7829], "provenance": "ai-proposed", "updatedAt": "${now}"},
      "dayIndex": {"value": 0, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "timeBlock": {"value": "morning", "provenance": "ai-proposed", "updatedAt": "${now}"},
      "priority": {"value": "must-do", "provenance": "ai-proposed", "updatedAt": "${now}"},
      "duration": {"value": 120, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "cost": {"value": 0, "provenance": "ai-proposed", "updatedAt": "${now}"}
    }
  ],
  "dailySchedules": [
    {
      "dayIndex": 0,
      "baseId": "base-1",
      "morning": ["act-1"],
      "afternoon": ["act-2"],
      "evening": ["act-3"]
    }
  ],
  "driveLegs": [],
  "budget": [
    {
      "category": "Lodging",
      "estimated": {"value": 400, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "actual": null
    },
    {
      "category": "Activities",
      "estimated": {"value": 150, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "actual": null
    },
    {
      "category": "Food",
      "estimated": {"value": 300, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "actual": null
    },
    {
      "category": "Transport",
      "estimated": {"value": 100, "provenance": "ai-proposed", "updatedAt": "${now}"},
      "actual": null
    }
  ],
  "finalization": {
    "emergencyContact": null,
    "packingList": [],
    "offlineNotes": [],
    "confirmations": []
  }
}

RULES:
- Coordinates are [longitude, latitude] — longitude first!
- Use real, accurate coordinates for ${intake.destination}
- IDs: "base-1", "base-2" for bases; "act-1", "act-2", ... for activities
- Generate 3-5 activities per day, spread across morning/afternoon/evening
- timeBlock must be one of: "morning", "afternoon", "evening", "flexible"
- priority must be one of: "must-do", "nice-to-have", "if-time"
- Generate one dailySchedule per day (dayIndex 0 to ${intake.nights - 1})
- driveLegs MUST be an empty array []
- duration is in minutes, cost is in USD
- skeleton.startDate and skeleton.endDate should be null (user hasn't picked dates)
- Every tracked field uses the exact wrapper format shown above
- Output the JSON object directly — no wrapping key, no markdown

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

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a complete trip plan for ${intake.destination}, ${intake.nights} nights.`,
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

  // GPT sometimes wraps in a top-level key like { "planContext": { ... } }
  const obj = parsed as Record<string, unknown>;
  if (obj.planContext && typeof obj.planContext === "object") {
    parsed = obj.planContext;
  }

  const result = PlanContextSchema.safeParse(parsed);
  if (!result.success) {
    const flat = result.error.flatten();
    console.error("PlanContext validation failed:", JSON.stringify(flat, null, 2));
    throw new OpenAIError(
      "Generated plan failed validation",
      502,
      "ValidationFailed",
      flat
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
