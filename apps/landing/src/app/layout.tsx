import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2108Trade — Your AI Investment Team, Working 24/7",
  description:
    "2108Trade analyzes markets, explains every decision, and helps you invest with confidence — not confusion. AI-powered trading platform with full transparency. $8/month.",
  openGraph: {
    title: "2108Trade — Your AI Investment Team",
    description:
      "AI-powered investment platform that analyzes markets, explains every trade, and helps you invest with confidence. Start your 7-day trial — only $8/month.",
    url: "https://2108trade.com",
    siteName: "2108Trade",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-dvh bg-gray-950 text-gray-100 antialiased selection:bg-amber-500/30">
        {children}
      </body>
    </html>
  );
}
