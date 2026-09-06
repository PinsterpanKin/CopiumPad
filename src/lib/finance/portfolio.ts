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
  error?: boolean;
};

export type PositionMark = {
  symbol: string;
  name: string;
  quantity: string;
  averageCost: string;
  livePrice: Decimal | null;
  changePercent: Decimal | null;
  quoteError: boolean;
  marketValue: Decimal | null;
  unrealizedPnl: Decimal | null;
  unrealizedPnlPercent: Decimal | null;
  dayPnl: Decimal | null;
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
  const hasMark = livePrice !== null && !livePrice.isZero();

  if (!hasMark || livePrice === null || quote === undefined) {
    return {
      symbol: holding.symbol,
      name: quote?.name ?? holding.name,
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      livePrice: livePrice,
      changePercent: quoteError || quote === undefined ? null : toDecimal(quote.changePercent),
      quoteError: quoteError || livePrice === null || livePrice.isZero(),
      marketValue: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      dayPnl: null,
    };
  }

  const changePercent = toDecimal(quote.changePercent);

  return {
    symbol: holding.symbol,
    name: quote.name || holding.name,
    quantity: holding.quantity,
    averageCost: holding.averageCost,
    livePrice,
    changePercent,
    quoteError: false,
    marketValue: marketValue(holding.quantity, livePrice),
    unrealizedPnl: unrealizedPnl(
      holding.quantity,
      holding.averageCost,
      livePrice,
    ),
    unrealizedPnlPercent: returnPercent(livePrice, holding.averageCost),
    dayPnl: dayPnl(holding.quantity, livePrice, changePercent),
  };
}

export function portfolioTotals(positions: readonly PositionMark[]): PortfolioTotals {
  const marked = positions.filter(
    (
      position,
    ): position is PositionMark & {
      marketValue: Decimal;
      unrealizedPnl: Decimal;
      dayPnl: Decimal;
    } =>
      position.marketValue !== null &&
      position.unrealizedPnl !== null &&
      position.dayPnl !== null,
  );

  const totalValue = sumDecimals(marked.map((position) => position.marketValue));
  const netUnrealizedPnl = sumDecimals(
    marked.map((position) => position.unrealizedPnl),
  );
  const dayPnlTotal = sumDecimals(marked.map((position) => position.dayPnl));
  const previousValue = totalValue.minus(dayPnlTotal);
  const costBasis = sumDecimals(
    marked.map((position) =>
      marketValue(position.quantity, position.averageCost),
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
