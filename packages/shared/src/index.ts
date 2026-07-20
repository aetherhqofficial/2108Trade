// 2108Trade shared package — types, utilities, and constants

export const APP_NAME = "2108Trade";
export const APP_TAGLINE = "The Future of Intelligent Investing";
export const GITHUB_URL = "https://github.com/aetherhqofficial/2108Trade";
export const DOCS_URL = "https://docs.2108trade.com";

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const FEATURES: Feature[] = [
  {
    id: "ai-advisor",
    title: "AI-Powered Analysis",
    description:
      "Get intelligent market analysis and trade recommendations powered by advanced AI models that learn from market data.",
    icon: "brain",
  },
  {
    id: "autonomous-trading",
    title: "Smart Automation",
    description:
      "Let the AI execute trades automatically based on your configured risk profile and trading strategy — 24/7.",
    icon: "bot",
  },
  {
    id: "risk-management",
    title: "Intelligent Risk Controls",
    description:
      "Set custom stop-losses, position limits, and exposure caps with real-time portfolio protection.",
    icon: "shield",
  },
  {
    id: "multi-market",
    title: "Global Markets",
    description:
      "Trade across Stocks, ETFs, Forex, Crypto, Commodities, and Indices from a single unified platform.",
    icon: "globe",
  },
  {
    id: "portfolio-analytics",
    title: "Portfolio Analytics",
    description:
      "Track performance, visualize returns, and get actionable insights with professional-grade portfolio tools.",
    icon: "chart",
  },
  {
    id: "trade-explanations",
    title: "Trade Explanations",
    description:
      "Every AI decision is fully explained — understand the reasoning behind every trade recommendation.",
    icon: "search",
  },
];

export const MARKETS = [
  { name: "Stocks", icon: "📈" },
  { name: "ETFs", icon: "📊" },
  { name: "Forex", icon: "💱" },
  { name: "Crypto", icon: "₿" },
  { name: "Commodities", icon: "🏭" },
  { name: "Indices", icon: "📉" },
];

export const STEPS = [
  {
    step: 1,
    title: "Connect",
    description: "Link your brokerage or exchange accounts securely via API.",
  },
  {
    step: 2,
    title: "Configure",
    description: "Set your risk parameters, trading preferences, and AI autonomy level.",
  },
  {
    step: 3,
    title: "Trade",
    description: "Let the AI monitor markets, analyze opportunities, and execute trades 24/7.",
  },
];
