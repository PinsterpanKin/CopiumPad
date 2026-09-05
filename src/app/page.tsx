"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChartLine,
  Pill,
  Play,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatPercent,
  formatQuantity,
  formatSignedUsd,
  formatUsd,
  toDecimal,
  type DecimalInput,
} from "@/lib/finance/money";
import {
  markPosition,
  portfolioTotals,
  type Holding,
  type QuoteSnapshot,
} from "@/lib/finance/portfolio";

const HOLDINGS: Holding[] = [
  {
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    quantity: "50",
    averageCost: "450",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    quantity: "30",
    averageCost: "380",
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin USD",
    quantity: "0.5",
    averageCost: "60000",
  },
];

const QUOTE_SYMBOLS = HOLDINGS.map((holding) => holding.symbol).join(",");

type QuoteDto = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  currency: string;
  error?: boolean;
};

type QuotesResponse = {
  success: boolean;
  data?: QuoteDto[];
  error?: string;
};

function pnlClassName(value: DecimalInput | null): string {
  if (value === null) {
    return "text-zinc-500";
  }

  const amount = toDecimal(value);
  if (amount.isPositive()) {
    return "text-emerald-400";
  }
  if (amount.isNegative()) {
    return "text-red-400";
  }
  return "text-zinc-400";
}

function formatMaybeUsd(value: DecimalInput | null): string {
  return value === null ? "—" : formatUsd(value);
}

function formatMaybeSignedUsd(value: DecimalInput | null): string {
  return value === null ? "—" : formatSignedUsd(value);
}

function formatMaybePercent(value: DecimalInput | null): string {
  return value === null ? "—" : formatPercent(value);
}

export default function Home() {
  const [quotes, setQuotes] = useState<QuoteSnapshot[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadQuotes = useCallback(async (signal?: AbortSignal) => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(QUOTE_SYMBOLS)}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error(`Quotes request failed (${response.status})`);
      }

      const payload = (await response.json()) as QuotesResponse;
      if (!payload.success || payload.data === undefined) {
        throw new Error(payload.error ?? "Failed to fetch quotes");
      }

      const snapshots: QuoteSnapshot[] = payload.data.map((quote) => ({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price.toString(),
        changePercent: quote.changePercent.toString(),
        error: quote.error,
      }));

      setQuotes(snapshots);
      setLastUpdated(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch quotes",
      );
    } finally {
      if (!signal?.aborted) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadQuotes(controller.signal);
    return () => controller.abort();
  }, [loadQuotes]);

  const positions = useMemo(() => {
    const quotesBySymbol = new Map(
      quotes.map((quote) => [quote.symbol.toUpperCase(), quote]),
    );

    return HOLDINGS.map((holding) =>
      markPosition(holding, quotesBySymbol.get(holding.symbol.toUpperCase())),
    );
  }, [quotes]);

  const totals = useMemo(() => portfolioTotals(positions), [positions]);
  const hasMarks = positions.some((position) => position.marketValue !== null);

  return (
    <div className="min-h-full bg-zinc-950 font-sans text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900">
              <Pill className="size-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
                  CopiumPad
                </h1>
                <Activity className="size-4 text-zinc-500" aria-hidden />
              </div>
              <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">
                Institutional-grade copium for retail traders. Kill your broken
                Google Sheets.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Market: Open
            </div>
            <button
              type="button"
              onClick={() => {
                void loadQuotes();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh Quotes
            </button>
          </div>
        </header>

        {errorMessage !== null ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <Wallet className="size-3.5" aria-hidden />
                Total Portfolio Value
              </div>
              {hasMarks ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                    toDecimal(totals.dayPnl).isNegative()
                      ? "border-red-500/20 bg-red-500/10 text-red-400"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {toDecimal(totals.dayPnl).isNegative() ? (
                    <ArrowDownRight className="size-3" aria-hidden />
                  ) : (
                    <ArrowUpRight className="size-3" aria-hidden />
                  )}
                  {formatSignedUsd(totals.dayPnl)} (
                  {formatPercent(totals.dayReturnPercent)})
                </span>
              ) : (
                <span className="text-xs text-zinc-500">
                  {isRefreshing ? "Loading…" : "No marks"}
                </span>
              )}
            </div>
            <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-zinc-50">
              {hasMarks ? formatUsd(totals.totalValue) : "—"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {lastUpdated === null
                ? "Waiting for live quotes"
                : `Last print ${lastUpdated}`}
            </p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <ChartLine className="size-3.5" aria-hidden />
              Net Unrealized PnL
            </div>
            <p
              className={`mt-4 font-mono text-3xl font-semibold ${pnlClassName(hasMarks ? totals.netUnrealizedPnl : null)}`}
            >
              {hasMarks ? formatSignedUsd(totals.netUnrealizedPnl) : "—"}
            </p>
            <p className={`mt-2 text-sm ${pnlClassName(hasMarks ? totals.netUnrealizedPnlPercent : null)}`}>
              {hasMarks
                ? formatPercent(totals.netUnrealizedPnlPercent)
                : "vs. book cost"}
            </p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <TrendingUp className="size-3.5" aria-hidden />
              Day&apos;s Return
            </div>
            <p
              className={`mt-4 font-mono text-3xl font-semibold ${pnlClassName(hasMarks ? totals.dayPnl : null)}`}
            >
              {hasMarks ? formatSignedUsd(totals.dayPnl) : "—"}
            </p>
            <p className={`mt-2 text-sm ${pnlClassName(hasMarks ? totals.dayReturnPercent : null)}`}>
              {hasMarks ? formatPercent(totals.dayReturnPercent) : "session P&L"}
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-medium tracking-wide text-zinc-200">
                Watchlist
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Live marks from /api/quotes · VOO, QQQ, BTC-USD
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadQuotes();
              }}
              disabled={isRefreshing}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh Quotes
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Symbol / Name</th>
                  <th className="px-5 py-3 font-medium">Avg Cost</th>
                  <th className="px-5 py-3 font-medium">Live Price</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium">Market Value</th>
                  <th className="px-5 py-3 font-medium text-right">
                    Unrealized PnL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-mono text-[13px]">
                {positions.map((position) => (
                  <tr key={position.symbol} className="hover:bg-zinc-900/80">
                    <td className="px-5 py-4">
                      <div className="font-sans font-medium text-zinc-100">
                        {position.symbol}
                      </div>
                      <div className="font-sans text-xs text-zinc-500">
                        {position.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      {formatUsd(position.averageCost)}
                    </td>
                    <td className="px-5 py-4 text-zinc-100">
                      {formatMaybeUsd(position.livePrice)}
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      {formatQuantity(position.quantity)}
                    </td>
                    <td className="px-5 py-4 text-zinc-100">
                      {formatMaybeUsd(position.marketValue)}
                    </td>
                    <td
                      className={`px-5 py-4 text-right font-medium ${pnlClassName(position.unrealizedPnl)}`}
                    >
                      <div>{formatMaybeSignedUsd(position.unrealizedPnl)}</div>
                      <div className="text-xs font-normal">
                        {formatMaybePercent(position.unrealizedPnlPercent)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
              DCA &amp; Scenario Simulator
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              测算如果每周定投 $200，或下跌 15% 触发网格加仓的收益曲线
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(52,211,153,0.45)] transition hover:bg-emerald-300 hover:shadow-[0_0_32px_rgba(52,211,153,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <Play className="size-4 fill-current" aria-hidden />
            Launch Simulator
          </button>
        </section>
      </div>
    </div>
  );
}
