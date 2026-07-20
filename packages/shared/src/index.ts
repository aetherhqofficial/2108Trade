// 2108Trade shared package — types, utilities, and constants

export const APP_NAME = "2108Trade";
export const APP_TAGLINE = "Your AI Investment Team, Working 24/7";
export const GITHUB_URL = "https://github.com/aetherhqofficial/2108Trade";

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const FEATURES: Feature[] = [
  {
    id: "ai-companion",
    title: "AI Market Companion",
    description:
      "Ask anything about markets in plain English. Get answers you actually understand — no jargon, no confusion.",
    icon: "brain",
  },
  {
    id: "trade-explanations",
    title: "Smart Trade Explanations",
    description:
      "Every recommendation comes with the why — what the AI noticed, the risks, the reasoning behind every move.",
    icon: "search",
  },
  {
    id: "market-health",
    title: "Market Health Dashboard",
    description:
      "One glance tells you everything: market mood, volatility, risk level. No complex charts required to understand what's happening.",
    icon: "chart",
  },
  {
    id: "risk-controls",
    title: "Intelligent Risk Controls",
    description:
      "You set the limits. The AI stays within them. Always. Custom stop-losses, position limits, and exposure caps that protect your portfolio.",
    icon: "shield",
  },
  {
    id: "learn-while-investing",
    title: "Learn While You Invest",
    description:
      "Every trade is a lesson. The platform explains stop-losses, diversification, and risk management as you go — so you become a better investor.",
    icon: "bot",
  },
  {
    id: "multi-market",
    title: "Multi-Market Coverage",
    description:
      "Stocks, ETFs, Forex, Crypto, Commodities, Indices — all from one place. One platform, every market you care about.",
    icon: "globe",
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
    description: "Link your brokerage securely — we support major brokers and exchanges.",
  },
  {
    step: 2,
    title: "Personalize",
    description: "Set your goals, risk comfort, and preferences. The AI adapts to you, not the other way around.",
  },
  {
    step: 3,
    title: "Grow",
    description: "Let AI handle the analysis while you learn and earn. Every trade comes with a clear explanation.",
  },
];

export const MARKET_MOODS = [
  { mood: "Bullish", emoji: "😊", color: "emerald" },
  { mood: "Neutral", emoji: "😐", color: "amber" },
  { mood: "Bearish", emoji: "☹️", color: "red" },
] as const;

export const PRICING_FEATURES = [
  "AI market analysis & trade explanations",
  "Intelligent risk management engine",
  "Portfolio analytics & performance tracking",
  "All markets — Stocks, ETFs, Forex, Crypto, Commodities, Indices",
  "All strategies — from conservative to aggressive",
  "Multi-broker support & secure API connections",
  "Paper trading & historical backtesting",
  "Priority support & community access",
];
