import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2108Trade — The Future of Intelligent Investing",
  description:
    "Open-source AI trading platform. Connect your brokerage, set risk parameters, and let AI trade for you — with full transparency.",
  openGraph: {
    title: "2108Trade — The Future of Intelligent Investing",
    description:
      "Open-source AI trading platform. Self-hostable, community-driven, and never paywalled.",
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
      <body className="min-h-dvh bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
