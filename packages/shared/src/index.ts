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
    title: "AI Advisor",
    description:
      "Get intelligent market analysis and trade recommendations powered by advanced AI models.",
    icon: "brain",
  },
  {
    id: "autonomous-trading",
    title: "Autonomous Trading",
    description:
      "Let the AI execute trades automatically based on your configured risk profile and strategy.",
    icon: "bot",
  },
  {
    id: "risk-management",
    title: "Risk Management",
    description:
      "Set custom stop-losses, position limits, and exposure caps to protect your portfolio.",
    icon: "shield",
  },
  {
    id: "multi-market",
    title: "Multi-Market Support",
    description:
      "Trade across Stocks, ETFs, Forex, Crypto, Commodities, and Indices from one platform.",
    icon: "globe",
  },
  {
    id: "open-source",
    title: "100% Open Source",
    description:
      "AGPL licensed. Inspect the code, audit the AI, and contribute back to the community.",
    icon: "code",
  },
  {
    id: "self-host",
    title: "Self-Hostable",
    description:
      "Run on your own infrastructure with full data sovereignty. No vendor lock-in, ever.",
    icon: "server",
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
