"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Brokers", href: "/brokers" },
  { label: "Portfolio", href: "#" },
  { label: "Trades", href: "#" },
  { label: "Learn", href: "#" },
  { label: "Settings", href: "#" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-gray-950">
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
            <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20 cursor-pointer">
              JD
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
