"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { number: 1, label: "Welcome" },
  { number: 2, label: "Risk Comfort" },
  { number: 3, label: "Goals" },
  { number: 4, label: "Done" },
];

const RISK_OPTIONS = [
  {
    value: "conservative",
    label: "Conservative",
    emoji: "🛡️",
    description:
      "I want to protect my money and grow it slowly. Small, steady gains with minimal risk.",
    tip: "Great for saving goals and income generation.",
  },
  {
    value: "moderate",
    label: "Moderate",
    emoji: "⚖️",
    description:
      "I'm comfortable with some ups and downs for better returns. Balanced approach.",
    tip: "Most beginners start with Moderate.",
    recommended: true,
  },
  {
    value: "aggressive",
    label: "Aggressive",
    emoji: "🚀",
    description:
      "I want maximum growth and I'm okay with significant swings. Higher risk, higher reward.",
    tip: "Best if you're actively trading and monitoring markets.",
  },
];

const GOAL_OPTIONS = [
  {
    value: "learn",
    label: "Learn to invest",
    emoji: "📚",
    description: "I want to understand the markets and build investing skills.",
  },
  {
    value: "grow",
    label: "Grow savings",
    emoji: "🌱",
    description: "I want my savings to work harder than a bank account.",
  },
  {
    value: "income",
    label: "Generate income",
    emoji: "💰",
    description: "I want to create regular returns from my investments.",
  },
  {
    value: "active",
    label: "Trade actively",
    emoji: "📈",
    description: "I want to be hands-on with frequent trading opportunities.",
  },
];

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((step) => (
          <div key={step.number} className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step.number <= currentStep
                  ? "bg-amber-500 text-gray-950"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {step.number}
            </span>
            <span
              className={`hidden sm:inline text-xs font-medium ${
                step.number <= currentStep ? "text-amber-400" : "text-gray-600"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [goals, setGoals] = useState<string[]>(["learn"]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const toggleGoal = (value: string) => {
    setGoals((prev) =>
      prev.includes(value)
        ? prev.filter((g) => g !== value)
        : [...prev, value],
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskTolerance,
          investmentGoals: goals.join(", "),
        }),
      });
      router.push("/");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80dvh] items-center justify-center">
      <div className="w-full max-w-xl">
        <ProgressBar currentStep={step} />

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center">
            <span className="text-5xl">👋</span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Welcome to{" "}
              <span className="text-amber-400">2108Trade</span>
            </h1>
            <p className="mt-3 text-base text-gray-300 max-w-md mx-auto leading-relaxed">
              Your AI investment team is ready. We&apos;ll analyze markets, explain every
              trade, and keep you in control — all with transparent, understandable
              guidance.
            </p>
            <div className="mt-6 grid gap-3 text-left max-w-sm mx-auto">
              {[
                "No prior investing knowledge needed",
                "Practice with paper trading — no real money at risk",
                "Full control with emergency stop, anytime",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 text-amber-400 shrink-0">✓</span>
                  <span className="text-sm text-gray-400">{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
            >
              Let&apos;s set you up →
            </button>
          </div>
        )}

        {/* Step 2: Risk Comfort */}
        {step === 2 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8">
            <h2 className="text-xl font-bold tracking-tight mb-2">
              How comfortable are you with risk?
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              This helps our AI tailor recommendations to your comfort level. You can
              change this anytime.
            </p>
            <div className="space-y-4">
              {RISK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRiskTolerance(option.value)}
                  className={`w-full rounded-xl border p-5 text-left transition-all ${
                    riskTolerance === option.value
                      ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20"
                      : "border-gray-800 bg-gray-950/50 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="text-base font-semibold">
                      {option.label}
                    </span>
                    {option.recommended && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{option.description}</p>
                  <p className="mt-1 text-xs text-amber-400/70">{option.tip}</p>
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8">
            <h2 className="text-xl font-bold tracking-tight mb-2">
              What are your investing goals?
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Select all that apply. We&apos;ll use this to suggest relevant strategies
              and learning content.
            </p>
            <div className="space-y-3">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleGoal(option.value)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    goals.includes(option.value)
                      ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20"
                      : "border-gray-800 bg-gray-950/50 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <div>
                      <span className="text-sm font-semibold">{option.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    {goals.includes(option.value) && (
                      <span className="ml-auto text-amber-400 text-lg">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center">
            <span className="text-5xl">🎉</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">
              You&apos;re all set!
            </h2>
            <p className="mt-3 text-base text-gray-300 max-w-md mx-auto leading-relaxed">
              We&apos;ve created a <span className="text-amber-400 font-semibold">paper trading account</span> with{" "}
              <span className="text-amber-400 font-semibold">$10,000</span> in virtual
              funds for you to practice with — no real money at risk.
            </p>
            <div className="mt-6 grid gap-3 text-left max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">📝</span>
                <span className="text-sm text-gray-400">
                  Practice trading with $10,000 virtual portfolio
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">🤖</span>
                <span className="text-sm text-gray-400">
                  AI will analyze markets and explain every recommendation
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">🛡️</span>
                <span className="text-sm text-gray-400">
                  Your risk settings are in place — we stay within your comfort zone
                </span>
              </div>
            </div>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-gray-950 border-t-transparent" />
                  Setting up...
                </>
              ) : (
                "Start exploring →"
              )}
            </button>
            <p className="mt-4 text-xs text-gray-600">
              You can change all settings later in{" "}
              <Link href="/settings/risk" className="text-amber-400 hover:text-amber-300">
                Settings
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
