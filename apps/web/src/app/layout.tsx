import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "2108Trade — AI Investment Platform",
  description:
    "Your AI investment team, working 24/7. Analyze markets, get clear trade explanations, and invest with confidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-gray-900 antialiased selection:bg-amber-500/30 dark:bg-gray-950 dark:text-gray-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
