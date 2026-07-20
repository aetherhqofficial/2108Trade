"use client";

import { useState, useEffect } from "react";

interface HealthData {
  score: number;
  colorClass: string;
  breakdown: {
    diversification: { score: number; label: string; detail: string };
    riskLevel: { score: number; label: string; detail: string };
    performance: { score: number; label: string; detail: string };
  };
  summary: {
    totalValue: number;
    cashBalance: number;
    paperBalance: number;
    positionCount: number;
  };
}

function ScoreRing({ score, colorClass }: { score: number; colorClass: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const colorMap: Record<string, string> = {
    "text-emerald-400": "#34d399",
    "text-amber-400": "#fbbf24",
    "text-red-400": "#f87171",
  };

  const ringColor = colorMap[colorClass] ?? "#fbbf24";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-800"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-3xl font-bold tracking-tight">{score}</span>
    </div>
  );
}

export function PortfolioHealthScore() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio/health")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not available");
      })
      .then(setData)
      .catch(() => {
        // API not available yet
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="size-5 animate-spin rounded-full border-2 border-gray-600 border-t-amber-400" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Portfolio Health
        </h2>
        <p className="text-sm text-gray-400">Connect a broker to see your portfolio health.</p>
      </div>
    );
  }

  const { score, colorClass, breakdown, summary } = data;

  const scoreLabel =
    score >= 71 ? "Healthy" : score >= 41 ? "Fair" : "Needs Attention";

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
        Portfolio Health
      </h2>

      <div className="flex flex-col items-center mb-6">
        <ScoreRing score={score} colorClass={colorClass} />
        <p className={`mt-2 text-sm font-semibold ${colorClass}`}>{scoreLabel}</p>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3">
        {(["diversification", "riskLevel", "performance"] as const).map((key) => (
          <div
            key={key}
            className="rounded-xl border border-gray-800 bg-gray-950/50 p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-400 capitalize">
                {key === "riskLevel" ? "Risk Level" : key}
              </span>
              <span
                className={`text-xs font-semibold ${
                  breakdown[key].score >= 71
                    ? "text-emerald-400"
                    : breakdown[key].score >= 41
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {breakdown[key].score}/100
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {breakdown[key].detail}
            </p>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-gray-950/50 p-2">
          <p className="text-xs text-gray-500">Positions</p>
          <p className="text-sm font-semibold">{summary.positionCount}</p>
        </div>
        <div className="rounded-lg bg-gray-950/50 p-2">
          <p className="text-xs text-gray-500">Paper Balance</p>
          <p className="text-sm font-semibold text-amber-400">
            ${summary.paperBalance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
