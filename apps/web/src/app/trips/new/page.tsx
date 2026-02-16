"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TripIntakeSchema } from "@trip-planner/core";
import { createClient } from "@/lib/supabase";

const STEPS = [
  "destination",
  "nights",
  "travelers",
  "airport",
  "tripStyle",
  "budget",
] as const;

type StepKey = (typeof STEPS)[number];

const STEP_PROMPTS: Record<StepKey, string> = {
  destination: "Where are you headed?",
  nights: "How many nights?",
  travelers: "Who\u2019s coming? How many adults and kids?",
  airport: "What airport are you flying into?",
  tripStyle: "What kind of trip?",
  budget: "Budget range per person?",
};

const STYLE_OPTIONS = [
  "Relaxed & scenic",
  "Adventure & outdoors",
  "Culture & history",
  "Food & nightlife",
  "Family friendly",
];

const BUDGET_OPTIONS = [
  "Budget ($)",
  "Mid-range ($$)",
  "Comfortable ($$$)",
  "Luxury ($$$$)",
];

interface Message {
  role: "assistant" | "user";
  text: string;
}

export default function TripNewPage(): React.JSX.Element {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: STEP_PROMPTS.destination },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hasPlans, setHasPlans] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showSummary]);

  // Check if user has existing plans (for back button destination)
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("trip_plans")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (count && count > 0) setHasPlans(true);
      });
  }, []);

  const currentStep = STEPS[stepIndex] as StepKey | undefined;

  function advance(value: string) {
    const step = STEPS[stepIndex];
    const newAnswers = { ...answers, [step]: value };
    const newMessages: Message[] = [
      ...messages,
      { role: "user", text: value },
    ];

    setAnswers(newAnswers);

    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1];
      newMessages.push({ role: "assistant", text: STEP_PROMPTS[nextStep] });
      setMessages(newMessages);
      setStepIndex(stepIndex + 1);
    } else {
      setMessages(newMessages);
      setShowSummary(true);
    }

    setInputValue("");
  }

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;

    if (currentStep === "nights") {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 1) return;
    }

    advance(val);
  }

  function handleOptionClick(value: string) {
    advance(value);
  }

  function handleStartOver() {
    setStepIndex(0);
    setAnswers({});
    setMessages([{ role: "assistant", text: STEP_PROMPTS.destination }]);
    setInputValue("");
    setShowSummary(false);
  }

  async function handleCreate() {
    const intake = {
      destination: answers.destination ?? "",
      nights: parseInt(answers.nights ?? "1", 10),
      travelers: answers.travelers ?? "",
      airport: answers.airport ?? "",
      tripStyle: answers.tripStyle ?? "",
      budget: answers.budget ?? "",
    };

    const result = TripIntakeSchema.safeParse(intake);
    if (!result.success) return;

    setCreating(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("trip_plans")
      .insert({
        user_id: user.id,
        title: `${intake.destination} Trip`,
        destination: intake.destination,
        nights: intake.nights,
        travelers: intake.travelers,
        airport: intake.airport,
        trip_style: intake.tripStyle,
        budget: intake.budget,
        status: "generating",
        bases: [],
      })
      .select("id")
      .single();

    if (error || !data) {
      setCreating(false);
      return;
    }

    router.push(`/map/${data.id}`);
  }

  const isTextStep =
    currentStep === "destination" ||
    currentStep === "nights" ||
    currentStep === "travelers" ||
    currentStep === "airport";

  return (
    <div className="landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div className="chat-top-bar">
        <Link href={hasPlans ? "/dashboard" : "/"} className="chat-back-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Progress indicator */}
        <div className="chat-progress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`chat-progress-seg ${i < stepIndex ? "done" : ""} ${i === stepIndex && !showSummary ? "active" : ""} ${showSummary ? "done" : ""}`}
            />
          ))}
        </div>

        <div style={{ width: "72px" }} />
      </div>

      {/* Chat area */}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message chat-message--${msg.role}`}>
              <div className={`chat-bubble chat-bubble--${msg.role}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {/* Option chips for tripStyle / budget */}
          {!showSummary && currentStep === "tripStyle" && (
            <div className="chat-options">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className="chat-option-btn"
                  onClick={() => handleOptionClick(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {!showSummary && currentStep === "budget" && (
            <div className="chat-options">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className="chat-option-btn"
                  onClick={() => handleOptionClick(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Summary card */}
          {showSummary && (
            <div className="chat-summary-card">
              <h3 className="chat-summary-title">{answers.destination} Trip</h3>
              <div className="chat-summary-rows">
                <div className="chat-summary-row">
                  <span className="chat-summary-label">Nights</span>
                  <span>{answers.nights}</span>
                </div>
                <div className="chat-summary-row">
                  <span className="chat-summary-label">Travelers</span>
                  <span>{answers.travelers}</span>
                </div>
                <div className="chat-summary-row">
                  <span className="chat-summary-label">Airport</span>
                  <span>{answers.airport}</span>
                </div>
                <div className="chat-summary-row">
                  <span className="chat-summary-label">Style</span>
                  <span>{answers.tripStyle}</span>
                </div>
                <div className="chat-summary-row">
                  <span className="chat-summary-label">Budget</span>
                  <span>{answers.budget}</span>
                </div>
              </div>
              <div className="chat-summary-actions">
                <button
                  className="btn-primary"
                  style={{ width: "100%", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Trip Plan \u2192"}
                </button>
                <button
                  className="btn-ghost"
                  style={{ width: "100%", cursor: "pointer", fontFamily: "inherit", background: "none", textAlign: "center" }}
                  onClick={handleStartOver}
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar (only for text steps) */}
      {!showSummary && isTextStep && (
        <form className="chat-input-bar" onSubmit={handleSubmitText}>
          <input
            className="chat-input"
            type={currentStep === "nights" ? "number" : "text"}
            min={currentStep === "nights" ? 1 : undefined}
            placeholder={
              currentStep === "nights"
                ? "e.g. 5"
                : currentStep === "airport"
                  ? "e.g. LAX"
                  : "Type your answer..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          <button type="submit" className="chat-send-btn" disabled={!inputValue.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
