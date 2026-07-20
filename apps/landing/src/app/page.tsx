import { FEATURES, MARKETS, STEPS, PRICING_FEATURES } from "@2108trade/shared";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Header />
      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <CapabilitiesSection />
        <HowItWorksSection />
        <MarketHealthPreview />
        <MarketsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-amber-500/10 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-gray-950">
            21
          </span>
          2108<span className="text-amber-400">Trade</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
          <a href="#capabilities" className="transition-colors hover:text-white">
            Capabilities
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How It Works
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </nav>
        <a
          href="#pricing"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25"
        >
          Start Trading
        </a>
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-36">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-gray-950 to-gray-950" />
        <div className="absolute top-1/3 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[800px] -translate-x-1/2 bg-gradient-to-t from-amber-600/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* Tag */}
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          AI That Explains Itself
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Your AI Investment Team,{" "}
          <span className="text-amber-400">Working 24/7</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
          2108Trade analyzes markets, explains every decision, and helps you invest with confidence — not confusion.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-semibold text-gray-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/30"
          >
            Start Trading — $8/month
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-300 transition-all hover:border-gray-500 hover:text-white"
          >
            See How It Works
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Problem / Solution ─────────────────────────────────────── */

function ProblemSolutionSection() {
  return (
    <section className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
        {/* Problem */}
        <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-8 sm:p-10">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </span>
          <h3 className="mt-4 text-xl font-semibold text-gray-200">Trading is complicated.</h3>
          <p className="mt-2 text-gray-400 leading-relaxed">
            Charts. Indicators. News. Conflicting advice. It&apos;s overwhelming — and most platforms make it worse with jargon and black-box algorithms you can&apos;t trust.
          </p>
        </div>

        {/* Solution */}
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-8 sm:p-10">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h3 className="mt-4 text-xl font-semibold text-gray-200">2108Trade changes that.</h3>
          <p className="mt-2 text-gray-400 leading-relaxed">
            Ask questions in plain English. Get clear answers. See exactly why the AI recommends each trade. Every interaction leaves you more informed than before — because understanding markets shouldn&apos;t require a finance degree.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Core Capabilities ──────────────────────────────────────── */

function CapabilitiesSection() {
  return (
    <section id="capabilities" className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Core Capabilities
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            An investment team that{" "}
            <span className="text-amber-400">teaches as it trades</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Every feature is built on one principle: you should understand what&apos;s happening with your money, not just trust a black box.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="group rounded-2xl border border-gray-800 bg-gray-900/40 p-8 transition-all hover:border-amber-500/30 hover:bg-gray-900/80"
            >
              <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-2xl text-amber-400 ring-1 ring-inset ring-amber-500/20">
                <CapabilityIcon icon={feature.icon} />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "brain":
      return (
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      );
    case "bot":
      return (
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      );
    case "shield":
      return (
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case "globe":
      return (
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      );
    case "chart":
      return (
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      );
    case "search":
      return (
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── How It Works ───────────────────────────────────────────── */

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Getting Started
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            How It{" "}
            <span className="text-amber-400">Works</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Three simple steps from sign-up to smarter investing.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl font-bold text-amber-400 ring-1 ring-inset ring-amber-500/20">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {s.description}
              </p>
              {s.step < 3 && (
                <div className="absolute left-1/2 top-8 hidden h-px w-full bg-gradient-to-r from-transparent via-amber-700/30 to-transparent md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Market Health Preview ──────────────────────────────────── */

function MarketHealthPreview() {
  return (
    <section className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Market Intelligence
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Know the market in{" "}
            <span className="text-amber-400">one glance</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            No complex charts. No confusing indicators. Just clear, actionable market signals at a glance.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {/* Market Mood */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gray-900/40 p-6 text-center">
            <p className="text-sm font-medium text-gray-400">Market Mood</p>
            <p className="mt-3 text-5xl">😊</p>
            <p className="mt-2 text-lg font-semibold text-emerald-400">Bullish</p>
            <p className="mt-1 text-xs text-gray-500">Markets trending upward</p>
          </div>

          {/* Volatility */}
          <div className="rounded-2xl border border-amber-500/20 bg-gray-900/40 p-6 text-center">
            <p className="text-sm font-medium text-gray-400">Volatility</p>
            <div className="mt-3 flex justify-center">
              <div className="h-3 w-40 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full w-[35%] rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
              </div>
            </div>
            <p className="mt-2 text-lg font-semibold text-amber-400">Moderate</p>
            <p className="mt-1 text-xs text-gray-500">Normal market conditions</p>
          </div>

          {/* Confidence */}
          <div className="rounded-2xl border border-amber-500/20 bg-gray-900/40 p-6 text-center">
            <p className="text-sm font-medium text-gray-400">AI Confidence</p>
            <p className="mt-3 text-5xl font-bold text-amber-400">82%</p>
            <p className="mt-2 text-lg font-semibold text-amber-400">High</p>
            <p className="mt-1 text-xs text-gray-500">Strong signal clarity</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Concept preview — live data coming soon
        </p>
      </div>
    </section>
  );
}

/* ── Markets ────────────────────────────────────────────────── */

function MarketsSection() {
  return (
    <section id="markets" className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Coverage
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            All your{" "}
            <span className="text-amber-400">markets</span>, one platform
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Stocks, ETFs, Forex, Crypto, Commodities, Indices — everything you trade, unified.
          </p>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {MARKETS.map((market) => (
            <span
              key={market.name}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/40 px-5 py-3 text-sm font-medium transition-all hover:border-amber-500/40 hover:bg-gray-900"
            >
              <span className="text-lg">{market.icon}</span>
              {market.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ────────────────────────────────────────────────── */

function PricingSection() {
  return (
    <section id="pricing" className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            One plan.{" "}
            <span className="text-amber-400">Everything included.</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            No tiers. No surprises. Just a full AI investment platform at one fair price.
          </p>
        </div>

        <div className="mt-16 flex justify-center">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-gray-900/60 p-8 shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/20">
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
                2108Trade
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight">$8</span>
                <span className="text-xl text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                7-day trial — no credit card required
              </p>
            </div>

            <ul className="mt-8 space-y-4">
              {PRICING_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                  <svg className="mt-0.5 size-4 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <a
                href="#"
                className="block rounded-xl bg-amber-500 px-6 py-3.5 text-center text-base font-semibold text-gray-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/30"
              >
                Start Your 7-Day Trial
              </a>
              <p className="mt-3 text-center text-xs text-gray-500">
                Cancel anytime. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA ────────────────────────────────────────────────────── */

function CtaSection() {
  return (
    <section className="border-t border-amber-500/10 px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to invest with{" "}
          <span className="text-amber-400">confidence</span>?
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Join investors who trust 2108Trade to provide AI-powered analysis, clear explanations, and intelligent risk management — 24/7.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-semibold text-gray-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/30"
          >
            Get Started — $8/month
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-amber-500/10 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-sm text-gray-500 sm:flex-row">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span className="font-semibold text-gray-300">2108Trade</span>
          <span>© {new Date().getFullYear()} 2108Trade. All rights reserved.</span>
        </div>
        <nav className="flex gap-6">
          <a href="#pricing" className="transition-colors hover:text-gray-300">
            Pricing
          </a>
          <a href="#" className="transition-colors hover:text-gray-300">
            About
          </a>
          <a href="#" className="transition-colors hover:text-gray-300">
            Contact
          </a>
          <a href="#" className="transition-colors hover:text-gray-300">
            Terms
          </a>
          <a href="#" className="transition-colors hover:text-gray-300">
            Privacy
          </a>
        </nav>
      </div>
    </footer>
  );
}
