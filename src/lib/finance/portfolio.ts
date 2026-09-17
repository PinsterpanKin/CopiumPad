import Decimal from "decimal.js";
import {
  dayPnl,
  marketValue,
  returnPercent,
  sumDecimals,
  toDecimal,
  unrealizedPnl,
  type DecimalInput,
} from "./money";

export type Holding = {
  symbol: string;
  name: string;
  quantity: string;
  averageCost: string;
};

export type QuoteSnapshot = {
  symbol: string;
  name: string;
  price: DecimalInput;
  changePercent: DecimalInput;
  usdRate?: DecimalInput | null;
  error?: boolean;
  currency?: string;
  exchange?: string;
  region?: string | null;
  quoteType?: string;
  trailingPE?: number | null;
  forwardPE?: number | null;
  marketCap?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
};

export type PositionMark = {
  symbol: string;
  name: string;
  quantity: string;
  averageCost: string;
  livePrice: Decimal | null;
  currency: string | null;
  usdRate: Decimal | null;
  changePercent: Decimal | null;
  quoteError: boolean;
  marketValue: Decimal | null;
  marketValueUsd: Decimal | null;
  unrealizedPnl: Decimal | null;
  unrealizedPnlUsd: Decimal | null;
  unrealizedPnlPercent: Decimal | null;
  dayPnl: Decimal | null;
  dayPnlUsd: Decimal | null;
};

export type PortfolioTotals = {
  totalValue: Decimal;
  netUnrealizedPnl: Decimal;
  netUnrealizedPnlPercent: Decimal;
  dayPnl: Decimal;
  dayReturnPercent: Decimal;
};

export function markPosition(
  holding: Holding,
  quote: QuoteSnapshot | undefined,
): PositionMark {
  const quoteError = quote === undefined || quote.error === true;
  const livePrice =
    quoteError || quote === undefined ? null : toDecimal(quote.price);
  const usdRate =
    quote?.usdRate == null
      ? quote?.currency === undefined || quote.currency.toUpperCase() === "USD"
        ? new Decimal(1)
        : null
      : toDecimal(quote.usdRate);
  const hasMark = livePrice !== null && !livePrice.isZero();

  if (!hasMark || livePrice === null || quote === undefined) {
    return {
      symbol: holding.symbol,
      name: quote?.name ?? holding.name,
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      livePrice: livePrice,
      currency: quote?.currency ?? null,
      usdRate,
      changePercent: quoteError || quote === undefined ? null : toDecimal(quote.changePercent),
      quoteError: quoteError || livePrice === null || livePrice.isZero(),
      marketValue: null,
      marketValueUsd: null,
      unrealizedPnl: null,
      unrealizedPnlUsd: null,
      unrealizedPnlPercent: null,
      dayPnl: null,
      dayPnlUsd: null,
    };
  }

  const changePercent = toDecimal(quote.changePercent);
  const localMarketValue = marketValue(holding.quantity, livePrice);
  const localUnrealizedPnl = unrealizedPnl(
    holding.quantity,
    holding.averageCost,
    livePrice,
  );
  const localDayPnl = dayPnl(holding.quantity, livePrice, changePercent);

  return {
    symbol: holding.symbol,
    name: quote.name || holding.name,
    quantity: holding.quantity,
    averageCost: holding.averageCost,
    livePrice,
    currency: quote.currency ?? null,
    usdRate,
    changePercent,
    quoteError: false,
    marketValue: localMarketValue,
    marketValueUsd: usdRate === null ? null : localMarketValue.times(usdRate),
    unrealizedPnl: localUnrealizedPnl,
    unrealizedPnlUsd: usdRate === null ? null : localUnrealizedPnl.times(usdRate),
    unrealizedPnlPercent: returnPercent(livePrice, holding.averageCost),
    dayPnl: localDayPnl,
    dayPnlUsd: usdRate === null ? null : localDayPnl.times(usdRate),
  };
}

export function portfolioTotals(positions: readonly PositionMark[]): PortfolioTotals {
  const marked = positions.filter(
    (
      position,
    ): position is PositionMark & {
      marketValue: Decimal;
      marketValueUsd: Decimal;
      usdRate: Decimal;
      unrealizedPnl: Decimal;
      unrealizedPnlUsd: Decimal;
      dayPnl: Decimal;
      dayPnlUsd: Decimal;
    } =>
      position.marketValue !== null &&
      position.marketValueUsd !== null &&
      position.unrealizedPnl !== null &&
      position.unrealizedPnlUsd !== null &&
      position.dayPnl !== null &&
      position.dayPnlUsd !== null
  );

  const totalValue = sumDecimals(marked.map((position) => position.marketValueUsd));
  const netUnrealizedPnl = sumDecimals(
    marked.map((position) => position.unrealizedPnlUsd),
  );
  const dayPnlTotal = sumDecimals(marked.map((position) => position.dayPnlUsd));
  const previousValue = totalValue.minus(dayPnlTotal);
  const costBasis = sumDecimals(
    marked.map((position) =>
      marketValue(position.quantity, position.averageCost).times(position.usdRate),
    ),
  );

  return {
    totalValue,
    netUnrealizedPnl,
    netUnrealizedPnlPercent: returnPercent(totalValue, costBasis),
    dayPnl: dayPnlTotal,
    dayReturnPercent: returnPercent(totalValue, previousValue),
  };
}
