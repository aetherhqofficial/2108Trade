"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useEffect, useCallback } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Brokers", href: "/brokers" },
  { label: "Portfolio", href: "#" },
  { label: "Trades", href: "#" },
  { label: "Settings", href: "/settings/risk" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [tradingPaused, setTradingPaused] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [userInitials, setUserInitials] = useState("?");

  const fetchRiskStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/risk");
      if (res.ok) {
        const data = await res.json();
        if (data.riskLimits) {
          setTradingPaused(data.riskLimits.tradingPaused);
        }
      }
    } catch {
      // Silently fail on dashboard
    }
  }, []);

  useEffect(() => {
    fetchRiskStatus();
  }, [fetchRiskStatus]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.email) {
          const email = data.user.email as string;
          setUserInitials(email.slice(0, 2).toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  const handleEmergencyStop = async () => {
    try {
      const res = await fetch("/api/risk/emergency-stop", { method: "POST" });
      if (res.ok) {
        setTradingPaused(true);
        setShowStopConfirm(false);
      }
    } catch {
      // Handle silently
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch("/api/risk/resume", { method: "POST" });
      if (res.ok) {
        setTradingPaused(false);
      }
    } catch {
      // Handle silently
    }
  };

  return (
    <div className="min-h-dvh bg-gray-950">
      {/* Emergency Stop Banner */}
      {tradingPaused && (
        <div className="border-b border-red-500/30 bg-red-600 px-4 py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⛔</span>
              <span className="text-sm font-medium text-white">
                Trading Paused — Emergency stop is active. All trading is halted.
              </span>
            </div>
            <button
              onClick={handleResume}
              className="rounded-lg border border-red-300/30 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 transition-colors"
            >
              Resume Trading
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="border-b border-amber-500/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-gray-950">
              21
            </span>
            <span className="text-lg font-semibold tracking-tight">
              2108<span className="text-amber-400">Trade</span>
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-gray-400">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const isDisabled = item.href === "#";

              if (isDisabled) {
                return (
                  <span
                    key={item.label}
                    className="transition-colors hover:text-white cursor-pointer"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`transition-colors hover:text-white ${
                    isActive ? "text-white font-medium" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Emergency Stop Button */}
            {!tradingPaused && (
              <button
                onClick={() => setShowStopConfirm(true)}
                className="ml-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                title="Emergency Stop — halt all trading"
              >
                ⏹ Stop
              </button>
            )}

            <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20 cursor-pointer">
              {userInitials}
            </span>
          </nav>
        </div>
      </header>

      {/* Stop confirmation modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-red-500/30 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold text-white">Emergency Stop?</h3>
            <p className="mt-2 text-sm text-gray-400">
              This will cancel all open orders and prevent any new trades until you
              manually resume. This cannot be undone automatically.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyStop}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Stop All Trading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
