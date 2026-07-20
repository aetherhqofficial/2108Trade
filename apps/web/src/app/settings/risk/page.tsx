"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RiskLimits {
  maxRiskPerTradePct: number;
  maxDailyLossPct: number;
  maxDrawdownPct: number;
  maxExposurePct: number;
  emergencyStop: boolean;
  tradingPaused: boolean;
}

export default function RiskSettingsPage() {
  const router = useRouter();
  const [limits, setLimits] = useState<RiskLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activatingStop, setActivatingStop] = useState(false);

  const fetchLimits = async () => {
    try {
      const res = await fetch("/api/risk");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setLimits(data.riskLimits);
    } catch {
      setMessage("Could not load risk settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) router.push("/login");
        else fetchLimits();
      });
  }, [router]);

  const handleSave = async () => {
    if (!limits) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/risk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(limits),
      });
      if (res.ok) {
        setMessage("Settings saved.");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEmergencyStop = async () => {
    setActivatingStop(true);
    try {
      const res = await fetch("/api/risk/emergency-stop", { method: "POST" });
      if (res.ok) {
        setLimits((prev) =>
          prev ? { ...prev, emergencyStop: true, tradingPaused: true } : prev,
        );
        setMessage("⚠️ Emergency stop activated. All trading has been paused.");
      }
    } catch {
      setMessage("Error activating emergency stop.");
    } finally {
      setActivatingStop(false);
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch("/api/risk/resume", { method: "POST" });
      if (res.ok) {
        setLimits((prev) =>
          prev ? { ...prev, emergencyStop: false, tradingPaused: false } : prev,
        );
        setMessage("Trading has been resumed.");
      }
    } catch {
      setMessage("Error resuming trading.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="size-5 animate-spin rounded-full border-2 border-gray-600 border-t-amber-400" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!limits) {
    return (
      <div className="py-24 text-center text-gray-400">
        Could not load risk settings. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Risk Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure your comfort zone. The AI will never exceed these limits.
        </p>
      </div>

      {/* Emergency Stop Banner */}
      {limits.tradingPaused && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⛔</span>
            <div>
              <p className="text-sm font-semibold text-red-400">
                Trading is Paused
              </p>
              <p className="text-xs text-red-400/70">
                Emergency stop is active. No new trades will be placed.
              </p>
            </div>
            <button
              onClick={handleResume}
              className="ml-auto rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Resume Trading
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            message.includes("⚠️")
              ? "border border-red-500/30 bg-red-500/10 text-red-400"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Max Risk Per Trade */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
          <label className="text-sm font-semibold">Max Risk Per Trade</label>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            The maximum percentage of your portfolio you&apos;re willing to risk on a
            single trade.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={limits.maxRiskPerTradePct}
              onChange={(e) =>
                setLimits({ ...limits, maxRiskPerTradePct: parseFloat(e.target.value) })
              }
              className="flex-1 accent-amber-500"
            />
            <span className="min-w-[3.5rem] text-right text-sm font-mono font-semibold text-amber-400">
              {limits.maxRiskPerTradePct}%
            </span>
          </div>
        </div>

        {/* Max Daily Loss */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
          <label className="text-sm font-semibold">Max Daily Loss</label>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            If your portfolio loses this much in a single day, all trading stops
            automatically.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={limits.maxDailyLossPct}
              onChange={(e) =>
                setLimits({ ...limits, maxDailyLossPct: parseFloat(e.target.value) })
              }
              className="flex-1 accent-amber-500"
            />
            <span className="min-w-[3.5rem] text-right text-sm font-mono font-semibold text-amber-400">
              {limits.maxDailyLossPct}%
            </span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
          <label className="text-sm font-semibold">Max Drawdown</label>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            The maximum total loss from your peak portfolio value before trading halts.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={limits.maxDrawdownPct}
              onChange={(e) =>
                setLimits({ ...limits, maxDrawdownPct: parseFloat(e.target.value) })
              }
              className="flex-1 accent-amber-500"
            />
            <span className="min-w-[3.5rem] text-right text-sm font-mono font-semibold text-amber-400">
              {limits.maxDrawdownPct}%
            </span>
          </div>
        </div>

        {/* Max Exposure */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
          <label className="text-sm font-semibold">Max Exposure</label>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            The maximum percentage of your portfolio that can be invested (the rest
            stays as cash buffer).
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={limits.maxExposurePct}
              onChange={(e) =>
                setLimits({ ...limits, maxExposurePct: parseFloat(e.target.value) })
              }
              className="flex-1 accent-amber-500"
            />
            <span className="min-w-[3.5rem] text-right text-sm font-mono font-semibold text-amber-400">
              {limits.maxExposurePct}%
            </span>
          </div>
        </div>

        {/* Emergency Stop */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <label className="text-sm font-semibold text-red-400">
                Emergency Stop
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Immediately cancel all open orders and prevent any new trades. Use this
                if markets are behaving unexpectedly.
              </p>
            </div>
            <button
              onClick={handleEmergencyStop}
              disabled={limits.tradingPaused || activatingStop}
              className="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-40"
            >
              {activatingStop ? "Stopping..." : "Stop All Trading"}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
