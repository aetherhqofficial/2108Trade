"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BrokerConnection, BrokerAccountCard } from "@2108trade/shared";

// ── Mock account data (until real portfolio API is wired) ──
const MOCK_ACCOUNTS: BrokerAccountCard[] = [
  {
    id: "mock-1",
    brokerName: "Binance",
    accountValue: 42680.5,
    dailyChange: 1240.3,
    dailyChangePct: 2.99,
    positionsCount: 8,
    status: "active",
    lastSyncAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    brokerName: "Interactive Brokers",
    accountValue: 82211.95,
    dailyChange: -602.2,
    dailyChangePct: -0.73,
    positionsCount: 4,
    status: "active",
    lastSyncAt: new Date().toISOString(),
  },
];

function fmtCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(val);
}

function fmtPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

// ── Summary Card (shared) ──

function SummaryCard({
  label,
  value,
  change,
  changeType,
}: {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}) {
  const changeColor =
    changeType === "positive"
      ? "text-emerald-400"
      : changeType === "negative"
        ? "text-red-400"
        : "text-gray-400";

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 transition-all hover:border-amber-500/20">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className={`mt-1 text-xs font-medium ${changeColor}`}>{change}</p>
    </div>
  );
}

// ── Account Card ──

function AccountCard({ account }: { account: BrokerAccountCard }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 transition-all hover:border-amber-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-400 ring-1 ring-inset ring-amber-500/20">
            {account.brokerName.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm font-semibold">{account.brokerName}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <span className="size-1 rounded-full bg-emerald-400" />
          Connected
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Value</span>
          <span className="text-sm font-semibold font-mono">
            {fmtCurrency(account.accountValue)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Today</span>
          <span
            className={`text-sm font-medium font-mono ${
              account.dailyChange >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {fmtCurrency(account.dailyChange)} ({fmtPct(account.dailyChangePct)})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Positions</span>
          <span className="text-sm font-medium text-gray-300">
            {account.positionsCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Card ──

function OnboardingCard() {
  return (
    <div className="rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/[0.02] p-8 text-center">
      <span className="text-3xl">🔗</span>
      <h2 className="mt-3 text-lg font-semibold">Connect your first broker</h2>
      <p className="mt-1 text-sm text-gray-400 max-w-md mx-auto">
        Link your brokerage or exchange account to unlock AI-powered trading,
        portfolio analytics, and real-time market insights.
      </p>
      <Link
        href="/brokers"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
      >
        Get Started →
      </Link>
    </div>
  );
}

// ── Main Dashboard ──

export default function Dashboard() {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brokers")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not available");
      })
      .then((data) => setConnections(data.brokers ?? []))
      .catch(() => {
        // API not available yet — use mock
      })
      .finally(() => setLoading(false));
  }, []);

  const hasConnections = connections.length > 0;
  // Use mock accounts for display when API isn't wired
  const accounts: BrokerAccountCard[] = hasConnections
    ? connections.map((c) => ({
        id: c.id,
        brokerName: c.brokerName,
        accountValue: 0,
        dailyChange: 0,
        dailyChangePct: 0,
        positionsCount: 0,
        status: c.status,
        lastSyncAt: c.lastSyncAt,
      }))
    : MOCK_ACCOUNTS;

  const showOnboarding = !hasConnections && !loading;

  const totalValue = accounts.reduce((sum, a) => sum + a.accountValue, 0);
  const totalChange = accounts.reduce((sum, a) => sum + a.dailyChange, 0);
  const totalChangePct =
    totalValue > 0 ? ((totalChange / (totalValue - totalChange)) * 100) : 0;
  const totalPositions = accounts.reduce((sum, a) => sum + a.positionsCount, 0);

  return (
    <div>
      {/* Welcome + Market Mood */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good morning, <span className="text-amber-400">John</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Here&apos;s your market briefing for today.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <span className="text-2xl">😊</span>
          <div>
            <p className="text-xs font-medium text-gray-400">Market Mood</p>
            <p className="text-sm font-semibold text-emerald-400">Bullish</p>
          </div>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Portfolio Value"
          value={fmtCurrency(totalValue)}
          change={`${fmtCurrency(totalChange)} (${fmtPct(totalChangePct)})`}
          changeType={totalChange >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          label="Today's Change"
          value={fmtCurrency(totalChange)}
          change={fmtPct(totalChangePct)}
          changeType={totalChange >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          label="Open Positions"
          value={`${totalPositions}`}
          change={`Across ${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
          changeType="neutral"
        />
        <SummaryCard
          label="AI Confidence Score"
          value="82%"
          change="Strong signal clarity"
          changeType="positive"
        />
      </div>

      {/* Connected Accounts Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Connected Accounts
          </h2>
          <Link
            href="/brokers"
            className="flex items-center gap-1 rounded-lg border border-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Add Broker
          </Link>
        </div>

        {showOnboarding ? (
          <OnboardingCard />
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="size-5 animate-spin rounded-full border-2 border-gray-600 border-t-amber-400" />
              <span className="text-sm">Loading accounts...</span>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Today's Briefing */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-lg ring-1 ring-inset ring-amber-500/20">
                📋
              </span>
              <div>
                <h2 className="text-lg font-semibold">Today&apos;s Briefing</h2>
                <p className="text-xs text-gray-500">
                  AI-generated daily market summary
                </p>
              </div>
            </div>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Markets are opening with a{" "}
                <span className="text-emerald-400 font-medium">bullish tilt</span>{" "}
                this morning. The S&amp;P 500 futures are pointing higher after
                yesterday&apos;s Fed commentary suggested rate cuts are on track for Q4.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Key watch:</span> Tech
                earnings continue this week with NVDA and AMD reporting. The AI
                expects elevated volatility around these names — consider tightening
                stops if you&apos;re holding through earnings.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Sector strength:</span>{" "}
                Financials and Healthcare are showing the strongest momentum. Energy
                is under pressure from falling crude prices.
              </p>
              <p>
                <span className="text-gray-500">
                  Last updated: Today at 9:30 AM ET
                </span>
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <span className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer transition-colors">
                View All →
              </span>
            </div>
            <div className="space-y-4">
              {[
                {
                  action: "Trade",
                  detail: "AAPL — Buy 50 shares @ $187.42",
                  explanation:
                    "AI detected breakout above resistance; strong volume confirmation",
                  time: "2 hours ago",
                  type: "buy",
                },
                {
                  action: "Trade",
                  detail: "TSLA — Sell 10 shares @ $248.91",
                  explanation:
                    "Stop-loss triggered; protecting gains from last week's entry",
                  time: "5 hours ago",
                  type: "sell",
                },
                {
                  action: "Alert",
                  detail: "NVDA — Volume spike detected",
                  explanation:
                    "Unusual options activity; AI monitoring for breakout setup",
                  time: "8 hours ago",
                  type: "alert",
                },
                {
                  action: "Learning",
                  detail: "Stop-loss placement guide",
                  explanation:
                    "AI explained why it placed the TSLA stop at $248 — based on volatility and recent support",
                  time: "5 hours ago",
                  type: "learn",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 border-b border-gray-800/50 pb-4 last:border-0 last:pb-0"
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      item.type === "buy"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : item.type === "sell"
                          ? "bg-red-500/10 text-red-400"
                          : item.type === "alert"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-indigo-500/10 text-indigo-400"
                    }`}
                  >
                    {item.type === "buy"
                      ? "B"
                      : item.type === "sell"
                        ? "S"
                        : item.type === "alert"
                          ? "!"
                          : "📖"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200">
                      {item.detail}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.explanation}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {[
                {
                  label: "Ask AI",
                  icon: "💬",
                  desc: "Ask anything about markets",
                },
                {
                  label: "View Portfolio",
                  icon: "📊",
                  desc: "Full portfolio breakdown",
                },
                {
                  label: "Paper Trade",
                  icon: "📝",
                  desc: "Practice without risk",
                },
                {
                  label: "Market Scan",
                  icon: "🔍",
                  desc: "AI scans for opportunities",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex w-full items-center gap-4 rounded-xl border border-gray-800 bg-gray-950/50 p-4 text-left transition-all hover:border-amber-500/30 hover:bg-gray-900 cursor-pointer"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-lg">
                    {action.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Market Snapshot */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Market Snapshot
            </h2>
            <div className="space-y-3">
              {[
                { pair: "S&P 500", price: "5,234.18", change: "+0.64%", up: true },
                {
                  pair: "NASDAQ",
                  price: "18,429.31",
                  change: "+1.12%",
                  up: true,
                },
                {
                  pair: "BTC/USD",
                  price: "67,842.50",
                  change: "+2.31%",
                  up: true,
                },
                {
                  pair: "ETH/USD",
                  price: "3,521.40",
                  change: "-0.48%",
                  up: false,
                },
                {
                  pair: "EUR/USD",
                  price: "1.0842",
                  change: "+0.12%",
                  up: true,
                },
                {
                  pair: "Gold",
                  price: "2,341.80",
                  change: "-0.23%",
                  up: false,
                },
              ].map((item) => (
                <div
                  key={item.pair}
                  className="flex items-center justify-between border-b border-gray-800/50 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-gray-300">
                    {item.pair}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-mono text-gray-200">
                      {item.price}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        item.up ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {item.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Allocation */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Allocation
            </h2>
            <div className="space-y-3">
              {[
                { asset: "US Stocks", pct: 45, color: "bg-amber-500" },
                { asset: "ETFs", pct: 25, color: "bg-emerald-500" },
                { asset: "Crypto", pct: 15, color: "bg-indigo-500" },
                { asset: "Cash", pct: 15, color: "bg-gray-600" },
              ].map((item) => (
                <div key={item.asset}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">{item.asset}</span>
                    <span className="font-medium text-gray-300">
                      {item.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
