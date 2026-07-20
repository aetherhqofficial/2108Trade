import { FEATURES, MARKETS, STEPS } from "@2108trade/shared";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <MarketsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            21
          </span>
          2108<span className="text-indigo-400">Trade</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-gray-400 md:flex">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How It Works
          </a>
          <a href="#markets" className="transition-colors hover:text-white">
            Markets
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </nav>
        <a
          href="#pricing"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/25"
        >
          Get Started
        </a>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-36">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-gray-950 to-gray-950" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[800px] -translate-x-1/2 bg-gradient-to-t from-indigo-600/10 to-transparent blur-3xl" />
      </div>
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
          Professional AI Trading — $8/month
        </span>
        <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          2108Trade
        </h1>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-indigo-400 sm:text-3xl">
          The Future of Intelligent Investing
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
          A professional AI trading platform that gives you an intelligent
          investment team working 24/7. Connect your brokerage accounts, set
          risk parameters, and let the AI analyze markets, execute trades, and
          monitor positions — with full transparency into every decision.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            Start Trading — $8/month
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-300 transition-all hover:border-gray-500 hover:text-white"
          >
            Explore Features
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to{" "}
            <span className="text-indigo-400">Trade Smarter</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            A complete AI-powered trading platform with professional-grade tools
            for serious investors.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="group rounded-2xl border border-gray-800 bg-gray-900/50 p-8 transition-all hover:border-indigo-500/50 hover:bg-gray-900"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-2xl text-indigo-400">
                <FeatureIcon icon={feature.icon} />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ icon }: { icon: string }) {
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-gray-800 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It <span className="text-indigo-400">Works</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Three simple steps to start trading with AI.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl font-bold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {s.description}
              </p>
              {s.step < 3 && (
                <div className="absolute left-1/2 top-8 hidden h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketsSection() {
  return (
    <section id="markets" className="border-t border-gray-800 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Supported{" "}
            <span className="text-indigo-400">Markets</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Trade across a wide range of markets from a single platform.
          </p>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {MARKETS.map((market) => (
            <span
              key={market.name}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/50 px-5 py-3 text-sm font-medium transition-all hover:border-indigo-500/50 hover:bg-gray-900"
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

function PricingSection() {
  return (
    <section id="pricing" className="border-t border-gray-800 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent{" "}
            <span className="text-indigo-400">Pricing</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            One plan, everything included. No hidden fees, no surprises.
          </p>
        </div>
        <div className="mt-16 flex justify-center">
          <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/30 bg-gray-900 p-8 shadow-2xl shadow-indigo-600/10 ring-1 ring-indigo-500/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
              MOST POPULAR
            </div>
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
                2108Trade
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight">$8</span>
                <span className="text-xl text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                7-day free trial — cancel anytime
              </p>
            </div>
            <ul className="mt-8 space-y-4">
              {[
                "AI-Powered Market Analysis",
                "Smart Trade Automation",
                "Intelligent Risk Controls",
                "Global Market Access",
                "Portfolio Analytics Dashboard",
                "Trade Explanations & Reasoning",
                "Broker & Exchange Integrations",
                "Email & Chat Support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                  <svg className="mt-0.5 size-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <a
                href="#"
                className="block rounded-xl bg-indigo-600 px-6 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
              >
                Start Trading — $8/month
              </a>
              <p className="mt-3 text-center text-xs text-gray-500">
                Start your 7-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="border-t border-gray-800 px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to{" "}
          <span className="text-indigo-400">Transform</span> Your Trading?
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Join thousands of investors who trust 2108Trade to power their
          trading with AI — transparent, intelligent, and always working for you.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            Get Started for $8/month
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-800 px-6 py-12">
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
