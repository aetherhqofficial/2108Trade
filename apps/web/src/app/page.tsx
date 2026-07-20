export default function Dashboard() {
  return (
    <div className="min-h-dvh bg-gray-950">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              21
            </span>
            <span className="text-lg font-semibold tracking-tight">
              2108<span className="text-indigo-400">Trade</span>
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-gray-400">
            <span className="transition-colors hover:text-white cursor-pointer">
              Dashboard
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Portfolio
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Trades
            </span>
            <span className="transition-colors hover:text-white cursor-pointer">
              Settings
            </span>
            <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-gray-300 cursor-pointer">
              JD
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, <span className="text-indigo-400">John</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Here&apos;s your portfolio overview for today.
          </p>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Value"
            value="$124,892.45"
            change="+3.24%"
            changeType="positive"
          />
          <SummaryCard
            label="Today's P&L"
            value="$2,341.20"
            change="+1.91%"
            changeType="positive"
          />
          <SummaryCard
            label="Open Positions"
            value="12"
            change="2 new today"
            changeType="neutral"
          />
          <SummaryCard
            label="AI Confidence"
            value="87%"
            change="Bullish outlook"
            changeType="positive"
          />
        </div>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  View All →
                </span>
              </div>
              <div className="space-y-4">
                {[
                  {
                    action: "Buy",
                    asset: "AAPL",
                    amount: "50 shares @ $187.42",
                    time: "2 hours ago",
                    type: "positive",
                  },
                  {
                    action: "Sell",
                    asset: "TSLA",
                    amount: "10 shares @ $248.91",
                    time: "5 hours ago",
                    type: "negative",
                  },
                  {
                    action: "AI Alert",
                    asset: "NVDA",
                    amount: "Breakout detected above $850",
                    time: "8 hours ago",
                    type: "neutral",
                  },
                  {
                    action: "Deposit",
                    asset: "USD",
                    amount: "+$5,000.00",
                    time: "1 day ago",
                    type: "positive",
                  },
                  {
                    action: "Dividend",
                    asset: "SPY",
                    amount: "+$42.50",
                    time: "2 days ago",
                    type: "positive",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-gray-800/50 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex size-8 items-center justify-center rounded-lg text-xs font-semibold ${
                          item.type === "positive"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : item.type === "negative"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-indigo-500/10 text-indigo-400"
                        }`}
                      >
                        {item.action.slice(0, 2)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {item.action}{" "}
                          <span className="text-gray-400">{item.asset}</span>
                        </p>
                        <p className="text-xs text-gray-500">{item.amount}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Market Overview */}
          <div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="text-lg font-semibold mb-6">Market Overview</h2>
              <div className="space-y-4">
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
              <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">
                  AI Market Sentiment
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full bg-gray-800 h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
                      style={{ width: "72%" }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">
                    Bullish
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Connect Broker", icon: "🔗", desc: "Link your brokerage account" },
              { label: "New Trade", icon: "📈", desc: "Place a trade manually" },
              { label: "AI Settings", icon: "🤖", desc: "Configure AI autonomy" },
              { label: "View Reports", icon: "📊", desc: "Performance analytics" },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-950/50 p-4 text-left transition-all hover:border-indigo-500/50 hover:bg-gray-900 cursor-pointer"
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
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all hover:border-gray-700">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className={`mt-1 text-xs font-medium ${changeColor}`}>{change}</p>
    </div>
  );
}
