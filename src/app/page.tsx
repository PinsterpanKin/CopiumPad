"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChartLine,
  Info,
  Pill,
  Pencil,
  Play,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatPercent,
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
import { PositionDialog } from "@/components/position-dialog";
import { usePortfolioStorage } from "@/hooks/usePortfolioStorage";

type QuoteDto = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  usdRate: number | null;
  currency: string;
  exchange: string;
  region: string | null;
  quoteType: string;
  trailingPE: number | null;
  forwardPE: number | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  error?: boolean;
};

type QuotesResponse = {
  success: boolean;
  data?: QuoteDto[];
  error?: string;
};

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

type SearchResponse = {
  success: boolean;
  data?: SearchResult[];
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "CN¥",
  EUR: "€",
  GBP: "£",
  HKD: "HK$",
  JPY: "¥",
  SGD: "S$",
  USD: "$",
};

function formatAssetCurrency(value: DecimalInput, currency = "USD"): string {
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  return `${symbol}${Number(toDecimal(value).toString()).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMaybeAssetCurrency(
  value: DecimalInput | null,
  currency?: string,
): string {
  return value === null ? "—" : formatAssetCurrency(value, currency);
}

function formatMaybeSignedUsd(value: DecimalInput | null): string {
  return value === null ? "—" : formatSignedUsd(value);
}

function formatMaybePercent(value: DecimalInput | null): string {
  return value === null ? "—" : formatPercent(value);
}

function isValidHoldingValue(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export default function Home() {
  const {
    positions: holdings,
    isHydrated,
    addPosition,
    removePosition,
    updatePosition,
  } = usePortfolioStorage();
  const [quotes, setQuotes] = useState<QuoteSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [positionDialogInitial, setPositionDialogInitial] = useState<Partial<Holding>>({});
  const quoteSymbols = useMemo(
    () => [...new Set(holdings.map((holding) => holding.symbol.toUpperCase()))].join(","),
    [holdings],
  );

  const loadQuotes = useCallback(async (signal?: AbortSignal) => {
    if (!quoteSymbols) {
      setQuotes([]);
      setLastUpdated(null);
      setIsRefreshing(false);
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(quoteSymbols)}`,
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
        usdRate: quote.usdRate?.toString() ?? null,
        currency: quote.currency,
        exchange: quote.exchange,
        region: quote.region,
        error: quote.error,
        quoteType: quote.quoteType,
        trailingPE: quote.trailingPE,
        forwardPE: quote.forwardPE,
        marketCap: quote.marketCap,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
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
  }, [quoteSymbols]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadQuotes(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isHydrated, loadQuotes]);

  const positions = useMemo(() => {
    const quotesBySymbol = new Map(
      quotes.map((quote) => [quote.symbol.toUpperCase(), quote]),
    );

    return holdings.map((holding) =>
      markPosition(
        {
          ...holding,
          quantity: isValidHoldingValue(holding.quantity) ? holding.quantity : "0",
          averageCost: isValidHoldingValue(holding.averageCost)
            ? holding.averageCost
            : "0",
        },
        quotesBySymbol.get(holding.symbol.toUpperCase()),
      ),
    );
  }, [holdings, quotes]);

  const totals = useMemo(() => portfolioTotals(positions), [positions]);
  const hasMarks = positions.some((position) => position.marketValueUsd !== null);
  const selectedQuote = quotes.find((quote) => quote.symbol === selectedSymbol) ?? null;
  const selectedPosition = positions.find((position) => position.symbol === selectedSymbol) ?? null;

  function quoteFor(symbol: string): QuoteSnapshot | undefined {
    return quotes.find((quote) => quote.symbol.toUpperCase() === symbol.toUpperCase());
  }

  function countryFlag(region: string | null | undefined, quoteType?: string): string {
    if (quoteType === "CRYPTOCURRENCY" || region === null || region === undefined) {
      return "🌐";
    }

    const countryCode = region.toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return "🌐";
    }

    return String.fromCodePoint(
      ...countryCode.split("").map((letter) => 127397 + letter.charCodeAt(0)),
    );
  }

  function formatMetric(value: number | null | undefined, suffix = ""): string {
    return value == null
      ? "Not available"
      : `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  }

  async function searchAssets(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as SearchResponse;
      if (!response.ok || !payload.success || payload.data === undefined) {
        throw new Error(payload.error ?? "Failed to search assets");
      }
      setSearchResults(payload.data);
    } catch (error) {
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : "Failed to search assets");
    } finally {
      setIsSearching(false);
    }
  }

  function addHolding(result: SearchResult) {
    setPositionDialogInitial({ symbol: result.symbol, name: result.name });
    setIsPositionDialogOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
  }

  function removeHolding(symbol: string) {
    removePosition(symbol);
  }

  function openNewPositionDialog() {
    setPositionDialogInitial({});
    setIsPositionDialogOpen(true);
  }

  function openEditPositionDialog(holding: Holding) {
    setPositionDialogInitial(holding);
    setIsPositionDialogOpen(true);
  }

  function savePosition(position: Holding) {
    if (holdings.some((holding) => holding.symbol === position.symbol)) {
      updatePosition(position);
    } else {
      addPosition(position);
    }
  }

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
                Live marks for your selected US and Singapore assets
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={openNewPositionDialog}
                className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-medium text-zinc-950 transition hover:bg-emerald-500"
              >
                Add holding
              </button>
              <button
                type="button"
                onClick={() => void loadQuotes()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
                Refresh Quotes
              </button>
            </div>
          </div>
          <div className="border-b border-zinc-800 px-5 py-4">
            <form onSubmit={searchAssets} className="relative flex max-w-xl gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <input
                  aria-label="Search assets"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by ticker or company, e.g. DBS or AAPL"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400"
                />
              </div>
              <button type="submit" disabled={isSearching} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>
            {searchError !== null ? <p className="mt-2 text-xs text-red-400">{searchError}</p> : null}
            {searchResults.length > 0 ? (
              <div className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950">
                {searchResults.map((result) => (
                  <button key={`${result.symbol}-${result.exchange}`} type="button" onClick={() => addHolding(result)} className="flex w-full items-center justify-between gap-4 px-3 py-3 text-left transition hover:bg-zinc-900">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm text-zinc-100">{result.symbol}</span>
                      <span className="block truncate text-xs text-zinc-500">{result.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{result.exchange} · {result.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
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
                  <th className="px-5 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-mono text-[13px]">
                {positions.map((position) => (
                  <tr key={position.symbol} className="hover:bg-zinc-900/80">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedSymbol(position.symbol)}
                        className="group text-left"
                        aria-label={`View details for ${position.symbol}`}
                      >
                        <span className="flex items-center gap-1.5 font-sans font-medium text-zinc-100">
                          <span
                            className="text-base leading-none"
                            role="img"
                            aria-label={`${quoteFor(position.symbol)?.region ?? "Unknown"} market`}
                          >
                            {countryFlag(quoteFor(position.symbol)?.region, quoteFor(position.symbol)?.quoteType)}
                          </span>
                          {position.symbol}
                          <Info className="size-3.5 text-zinc-600 transition group-hover:text-emerald-400" aria-hidden />
                        </span>
                        <span className="block font-sans text-xs text-zinc-500 group-hover:text-zinc-300">
                          {position.name}
                        </span>
                        {quoteFor(position.symbol) !== undefined ? (
                          <span className="mt-1 inline-flex rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wider text-zinc-500">
                            {quoteFor(position.symbol)?.exchange ?? "Unknown market"} · {quoteFor(position.symbol)?.currency ?? "USD"}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      <input
                        aria-label={`${position.symbol} average cost`}
                        type="text"
                        inputMode="decimal"
                        value={holdings.find((holding) => holding.symbol === position.symbol)?.averageCost ?? ""}
                        onChange={(event) => {
                          const averageCost = event.target.value;
                          const holding = holdings.find((item) => item.symbol === position.symbol);
                          if (holding) updatePosition({ ...holding, averageCost });
                        }}
                        className="w-28 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
                      />
                      <span className="ml-2 text-xs text-zinc-600">{quoteFor(position.symbol)?.currency ?? "USD"}</span>
                    </td>
                    <td className="px-5 py-4 text-zinc-100">
                      {formatMaybeAssetCurrency(position.livePrice, quoteFor(position.symbol)?.currency)}
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      <input
                        aria-label={`${position.symbol} quantity`}
                        type="text"
                        inputMode="decimal"
                        value={holdings.find((holding) => holding.symbol === position.symbol)?.quantity ?? ""}
                        onChange={(event) => {
                          const quantity = event.target.value;
                          const holding = holdings.find((item) => item.symbol === position.symbol);
                          if (holding) updatePosition({ ...holding, quantity });
                        }}
                        className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
                      />
                    </td>
                    <td className="px-5 py-4 text-zinc-100">
                      {formatMaybeAssetCurrency(position.marketValue, quoteFor(position.symbol)?.currency)}
                    </td>
                    <td
                      className={`px-5 py-4 text-right font-medium ${pnlClassName(position.unrealizedPnl)}`}
                    >
                      <div>{formatMaybeSignedUsd(position.unrealizedPnl)}</div>
                      <div className="text-xs font-normal">
                        {formatMaybePercent(position.unrealizedPnlPercent)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEditPositionDialog(holdings.find((holding) => holding.symbol === position.symbol) ?? position)} aria-label={`Edit ${position.symbol}`} className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-emerald-400">
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button type="button" onClick={() => removeHolding(position.symbol)} aria-label={`Remove ${position.symbol}`} className="rounded-md p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400">
                          <X className="size-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedQuote !== null && selectedPosition !== null ? (
            <aside className="border-t border-zinc-800 bg-zinc-950/60 px-5 py-5" aria-live="polite">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-lg font-semibold text-zinc-100">{selectedQuote.symbol}</h3>
                    <span className="rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      {selectedQuote.quoteType ?? "SECURITY"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{selectedQuote.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">
                    {selectedQuote.exchange ?? "Unknown market"} · {selectedQuote.currency ?? "USD"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSymbol(null)}
                  className="self-start text-xs font-medium text-zinc-500 transition hover:text-zinc-200"
                >
                  Close details
                </button>
              </div>
              {selectedQuote.quoteType === "CRYPTO" ? (
                <p className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
                  Fundamental metrics are not available for crypto assets.
                </p>
              ) : (
                <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <dt className="text-xs text-zinc-500">P/E ratio</dt>
                    <dd className="mt-1 font-mono text-sm text-zinc-100">{formatMetric(selectedQuote.trailingPE)}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <dt className="text-xs text-zinc-500">Forward P/E</dt>
                    <dd className="mt-1 font-mono text-sm text-zinc-100">{formatMetric(selectedQuote.forwardPE)}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <dt className="text-xs text-zinc-500">Market cap</dt>
                    <dd className="mt-1 font-mono text-sm text-zinc-100">
                      {selectedQuote.marketCap == null
                        ? "Not available"
                        : formatAssetCurrency(selectedQuote.marketCap, selectedQuote.currency)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <dt className="text-xs text-zinc-500">52-week range</dt>
                    <dd className="mt-1 font-mono text-sm text-zinc-100">
                      {selectedQuote.fiftyTwoWeekLow == null || selectedQuote.fiftyTwoWeekHigh == null
                        ? "Not available"
                        : `${formatAssetCurrency(selectedQuote.fiftyTwoWeekLow, selectedQuote.currency)} - ${formatAssetCurrency(selectedQuote.fiftyTwoWeekHigh, selectedQuote.currency)}`}
                    </dd>
                  </div>
                </dl>
              )}
            </aside>
          ) : null}
        </section>

        <section className="flex flex-col gap-5 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
              DCA &amp; Scenario Simulator
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Simulate dollar-cost averaging and other scenarios to see how your portfolio would perform under different market conditions.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-500"
          >
            <Play className="size-4" aria-hidden />
            Launch Simulator
          </button>
        </section>
      </div>
      <PositionDialog
        open={isPositionDialogOpen}
        initialPosition={positionDialogInitial}
        onOpenChange={setIsPositionDialogOpen}
        onSubmit={savePosition}
      />
    </div>
  );
}
