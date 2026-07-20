export default function Dashboard() {
  return (
    <div className="min-h-dvh bg-gray-950">
      {/* Top bar */}
      <header className="border-b border-amber-500/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-gray-950">
              21
            </span>
            <span className="text-lg font-semibold tracking-tight">
              2108<span className="text-amber-400">Trade</span>
            </span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-gray-400">
            <span className="text-white cursor-pointer">
              Dashboard
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Portfolio
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Trades
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Learn
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Settings
            </span>
            <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20 cursor-pointer">
              JD
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
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
            value="$124,892.45"
            change="+$3,241.20 (2.67%)"
            changeType="positive"
          />
          <SummaryCard
            label="Today's Change"
            value="+$1,842.50"
            change="+1.49%"
            changeType="positive"
          />
          <SummaryCard
            label="Open Positions"
            value="12"
            change="Across 8 assets"
            changeType="neutral"
          />
          <SummaryCard
            label="AI Confidence Score"
            value="82%"
            change="Strong signal clarity"
            changeType="positive"
          />
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
                  <p className="text-xs text-gray-500">AI-generated daily market summary</p>
                </div>
              </div>
              <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                <p>
                  Markets are opening with a <span className="text-emerald-400 font-medium">bullish tilt</span> this morning. The S&amp;P 500 futures are pointing higher after yesterday&apos;s Fed commentary suggested rate cuts are on track for Q4.
                </p>
                <p>
                  <span className="text-amber-400 font-medium">Key watch:</span> Tech earnings continue this week with NVDA and AMD reporting. The AI expects elevated volatility around these names — consider tightening stops if you&apos;re holding through earnings.
                </p>
                <p>
                  <span className="text-amber-400 font-medium">Sector strength:</span> Financials and Healthcare are showing the strongest momentum. Energy is under pressure from falling crude prices.
                </p>
                <p>
                  <span className="text-gray-500">Last updated: Today at 9:30 AM ET</span>
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
                    explanation: "AI detected breakout above resistance; strong volume confirmation",
                    time: "2 hours ago",
                    type: "buy",
                  },
                  {
                    action: "Trade",
                    detail: "TSLA — Sell 10 shares @ $248.91",
                    explanation: "Stop-loss triggered; protecting gains from last week's entry",
                    time: "5 hours ago",
                    type: "sell",
                  },
                  {
                    action: "Alert",
                    detail: "NVDA — Volume spike detected",
                    explanation: "Unusual options activity; AI monitoring for breakout setup",
                    time: "8 hours ago",
                    type: "alert",
                  },
                  {
                    action: "Learning",
                    detail: "Stop-loss placement guide",
                    explanation: "AI explained why it placed the TSLA stop at $248 — based on volatility and recent support",
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
                      {item.type === "buy" ? "B" : item.type === "sell" ? "S" : item.type === "alert" ? "!" : "📖"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-200">{item.detail}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.explanation}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{item.time}</span>
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
                  { label: "Ask AI", icon: "💬", desc: "Ask anything about markets" },
                  { label: "View Portfolio", icon: "📊", desc: "Full portfolio breakdown" },
                  { label: "Paper Trade", icon: "📝", desc: "Practice without risk" },
                  { label: "Market Scan", icon: "🔍", desc: "AI scans for opportunities" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="flex w-full items-center gap-4 rounded-xl border border-gray-800 bg-gray-950/50 p-4 text-left transition-all hover:border-amber-500/30 hover:bg-gray-900 cursor-pointer"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-lg">
                      {action.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{action.label}</p>
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
                  { pair: "NASDAQ", price: "18,429.31", change: "+1.12%", up: true },
                  { pair: "BTC/USD", price: "67,842.50", change: "+2.31%", up: true },
                  { pair: "ETH/USD", price: "3,521.40", change: "-0.48%", up: false },
                  { pair: "EUR/USD", price: "1.0842", change: "+0.12%", up: true },
                  { pair: "Gold", price: "2,341.80", change: "-0.23%", up: false },
                ].map((item) => (
                  <div
                    key={item.pair}
                    className="flex items-center justify-between border-b border-gray-800/50 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-gray-300">{item.pair}</span>
                    <div className="text-right">
                      <p className="text-sm font-mono text-gray-200">{item.price}</p>
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
                      <span className="font-medium text-gray-300">{item.pct}%</span>
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
      </main>
    </div>
  );
}

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
