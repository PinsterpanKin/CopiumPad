import {
  Activity,
  ArrowUpRight,
  ChartLine,
  Gauge,
  Pill,
  Play,
  Wallet,
} from "lucide-react";
import {
  formatPercent,
  formatQuantity,
  formatSignedUsd,
  formatUsd,
  percentOf,
  toDecimal,
  unrealizedPnl,
} from "@/lib/finance/money";

type Holding = {
  symbol: string;
  name: string;
  averageCost: string;
  currentPrice: string;
  quantity: string;
};

const NET_WORTH = "128450.00";
const TODAY_PNL = "1240.50";
const REALIZED_PNL = "12300.00";
const UNREALIZED_PNL = "34210.00";
const COPIUM_INDEX = "82";

const WATCHLIST: Holding[] = [
  {
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    averageCost: "485.20",
    currentPrice: "531.10",
    quantity: "45",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    averageCost: "512.00",
    currentPrice: "478.45",
    quantity: "32",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    averageCost: "62450.00",
    currentPrice: "97120.00",
    quantity: "0.85",
  },
];

function pnlClassName(value: string): string {
  const amount = toDecimal(value);
  if (amount.isPositive()) {
    return "text-emerald-400";
  }
  if (amount.isNegative()) {
    return "text-red-400";
  }
  return "text-zinc-400";
}

export default function Home() {
  const todayPercent = percentOf(TODAY_PNL, NET_WORTH);

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
                <Activity
                  className="size-4 text-zinc-500"
                  aria-hidden
                />
              </div>
              <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">
                Institutional-grade copium for retail traders. Kill your broken
                Google Sheets.
              </p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Market: Open
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <Wallet className="size-3.5" aria-hidden />
                Net Worth
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                <ArrowUpRight className="size-3" aria-hidden />
                {formatSignedUsd(TODAY_PNL)} ({formatPercent(todayPercent)})
              </span>
            </div>
            <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-zinc-50">
              {formatUsd(NET_WORTH)}
            </p>
            <p className="mt-2 text-xs text-zinc-500">Today&apos;s mark-to-market</p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <ChartLine className="size-3.5" aria-hidden />
              Realized / Unrealized PnL
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">Realized</p>
                <p
                  className={`mt-1 font-mono text-xl font-semibold ${pnlClassName(REALIZED_PNL)}`}
                >
                  {formatSignedUsd(REALIZED_PNL, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Unrealized</p>
                <p
                  className={`mt-1 font-mono text-xl font-semibold ${pnlClassName(UNREALIZED_PNL)}`}
                >
                  {formatSignedUsd(UNREALIZED_PNL, 0)}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <Gauge className="size-3.5" aria-hidden />
              Copium Index
            </div>
            <p className="mt-4 text-xl font-semibold tracking-tight text-zinc-50">
              Moderate Leverage — {COPIUM_INDEX}%
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-400/90"
                style={{ width: `${COPIUM_INDEX}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Self-reported retail conviction vs. actual dry powder.
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-medium tracking-wide text-zinc-200">
              Watchlist
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Demo book. Marks are illustrative, not a live feed.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Symbol / Name</th>
                  <th className="px-5 py-3 font-medium">Avg Cost</th>
                  <th className="px-5 py-3 font-medium">Mark</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium text-right">
                    Unrealized PnL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-mono text-[13px]">
                {WATCHLIST.map((holding) => {
                  const pnl = unrealizedPnl(
                    holding.quantity,
                    holding.averageCost,
                    holding.currentPrice,
                  ).toFixed(2);

                  return (
                    <tr key={holding.symbol} className="hover:bg-zinc-900/80">
                      <td className="px-5 py-4">
                        <div className="font-sans font-medium text-zinc-100">
                          {holding.symbol}
                        </div>
                        <div className="font-sans text-xs text-zinc-500">
                          {holding.name}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-zinc-300">
                        {formatUsd(holding.averageCost)}
                      </td>
                      <td className="px-5 py-4 text-zinc-100">
                        {formatUsd(holding.currentPrice)}
                      </td>
                      <td className="px-5 py-4 text-zinc-300">
                        {formatQuantity(holding.quantity)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-medium ${pnlClassName(pnl)}`}
                      >
                        {formatSignedUsd(pnl)}
                      </td>
                    </tr>
                  );
                })}
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
