"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SUPPORTED_BROKERS,
  type SupportedBroker,
  type BrokerCategory,
  type BrokerConnection,
} from "@2108trade/shared";

// ── MOCK DATA ── (until real auth/API is wired)
const MOCK_CONNECTED: BrokerConnection[] = [];

// ── Helpers ──

const CATEGORY_ORDER: BrokerCategory[] = ["Crypto", "Stocks & ETFs", "Forex"];

function categoryBadgeColor(category: BrokerCategory): string {
  switch (category) {
    case "Crypto":
      return "bg-amber-500/10 text-amber-400 ring-amber-500/20";
    case "Stocks & ETFs":
      return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
    case "Forex":
      return "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20";
  }
}

function brokerLogoInitials(name: string): string {
  const words = name.split(" ");
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Connect Modal ──

function ConnectModal({
  broker,
  onClose,
  onConnect,
}: {
  broker: SupportedBroker;
  onClose: () => void;
  onConnect: (brokerName: string, apiKey: string, apiSecret: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError("Both API key and secret are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConnect(broker.name, apiKey, apiSecret);
      onClose();
    } catch {
      setError("Failed to connect. Check your credentials and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-sm font-bold text-amber-400 ring-1 ring-inset ring-amber-500/20">
              {brokerLogoInitials(broker.name)}
            </span>
            <div>
              <h2 className="text-lg font-semibold">Connect {broker.name}</h2>
              <p className="text-xs text-gray-500">{broker.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your API secret"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-3">
            <p className="text-xs text-gray-400">
              <span className="font-medium text-amber-400">🔒 Security:</span>{" "}
              Your credentials are encrypted. 2108Trade never has withdrawal
              access. Use read-only API keys when available.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Disconnect Confirm Dialog ──

function DisconnectDialog({
  brokerName,
  onClose,
  onConfirm,
}: {
  brokerName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold mb-2">Disconnect {brokerName}?</h2>
        <p className="text-sm text-gray-400 mb-6">
          This will remove the connection and stop all trading for this account.
          Your API keys will be deleted from our system.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setConfirming(true);
              onConfirm();
            }}
            disabled={confirming}
            className="flex-1 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 ring-1 ring-inset ring-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {confirming ? "Removing..." : "Disconnect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Brokers Page ──

export default function BrokersPage() {
  const [connections, setConnections] = useState<BrokerConnection[]>(MOCK_CONNECTED);
  const [connectTarget, setConnectTarget] = useState<SupportedBroker | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<BrokerConnection | null>(null);
  const [activeCategory, setActiveCategory] = useState<BrokerCategory | "all">("all");
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/brokers");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.brokers ?? []);
      }
    } catch {
      // API not available yet — use mock
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = async (brokerName: string, apiKey: string, apiSecret: string) => {
    const res = await fetch("/api/brokers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerName, apiKey, apiSecret }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error ?? "Failed to connect");
    }

    const data = await res.json();
    setConnections((prev) => [...prev, data.broker]);
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    const res = await fetch(`/api/brokers?id=${disconnectTarget.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setConnections((prev) => prev.filter((c) => c.id !== disconnectTarget.id));
    }
    setDisconnectTarget(null);
  };

  const connectedNames = new Set(connections.map((c) => c.brokerName));

  const filteredBrokers =
    activeCategory === "all"
      ? SUPPORTED_BROKERS
      : SUPPORTED_BROKERS.filter((b) => b.category === activeCategory);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    brokers: filteredBrokers.filter((b) => b.category === cat),
  })).filter((g) => g.brokers.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="size-5 animate-spin rounded-full border-2 border-gray-600 border-t-amber-400" />
          <span className="text-sm">Loading connections...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Broker <span className="text-amber-400">Connections</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Connect your brokerage and exchange accounts to enable AI-powered trading.
        </p>
      </div>

      {/* Connected accounts section */}
      {connections.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Connected Accounts
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 transition-all hover:border-amber-500/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-sm font-bold text-amber-400 ring-1 ring-inset ring-amber-500/20">
                      {brokerLogoInitials(conn.brokerName)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{conn.brokerName}</p>
                      <p className="text-xs text-gray-500">
                        {conn.lastSyncAt
                          ? `Last synced: ${new Date(conn.lastSyncAt).toLocaleDateString()}`
                          : `Connected: ${new Date(conn.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      conn.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : conn.status === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        conn.status === "active"
                          ? "bg-emerald-400"
                          : conn.status === "error"
                            ? "bg-red-400"
                            : "bg-amber-400"
                      }`}
                    />
                    {conn.status === "active" ? "Connected" : conn.status}
                  </span>
                </div>
                <button
                  onClick={() => setDisconnectTarget(conn)}
                  className="mt-4 w-full rounded-xl border border-gray-800 px-3 py-2 text-xs font-medium text-gray-500 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mr-4">
          Available Brokers
        </h2>
        <div className="flex gap-1.5">
          {(["all", ...CATEGORY_ORDER] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === cat
                  ? "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Broker grid grouped by category */}
      <div className="space-y-10">
        {grouped.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryBadgeColor(group.category)}`}
              >
                {group.category}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.brokers.map((broker) => {
                const isConnected = connectedNames.has(broker.name);
                return (
                  <div
                    key={broker.id}
                    className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 transition-all hover:border-amber-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-sm font-bold text-gray-300">
                        {brokerLogoInitials(broker.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {broker.name}
                          </p>
                          {isConnected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                              <span className="size-1 rounded-full bg-emerald-400" />
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {broker.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConnectTarget(broker)}
                      disabled={isConnected}
                      className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        isConnected
                          ? "border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 cursor-default"
                          : "border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      }`}
                    >
                      {isConnected ? "✓ Connected" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Security notice */}
      <div className="mt-10 rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-5">
        <div className="flex items-start gap-3">
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-sm font-semibold text-amber-400">
              Your credentials are encrypted
            </p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              2108Trade uses AES-256-GCM encryption to protect your API keys.
              We recommend using read-only API keys whenever possible. 2108Trade
              never has withdrawal access to your accounts. You can disconnect
              any broker at any time, and your credentials will be permanently
              deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {connectTarget && (
        <ConnectModal
          broker={connectTarget}
          onClose={() => setConnectTarget(null)}
          onConnect={handleConnect}
        />
      )}

      {disconnectTarget && (
        <DisconnectDialog
          brokerName={disconnectTarget.brokerName}
          onClose={() => setDisconnectTarget(null)}
          onConfirm={handleDisconnect}
        />
      )}
    </div>
  );
}
