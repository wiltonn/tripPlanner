import { NextRequest } from "next/server";
import { TripIntakeSchema } from "@trip-planner/core";
import { generatePlanContext, openaiErrorToResponse } from "@/lib/openai-server";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = TripIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const planContext = await generatePlanContext(parsed.data);
    return Response.json({ planContext });
  } catch (err) {
    return openaiErrorToResponse(err);
  }
}
