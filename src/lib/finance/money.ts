import Decimal from "decimal.js";

export type DecimalInput = Decimal.Value;

export function toDecimal(value: DecimalInput): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function marketValue(
  quantity: DecimalInput,
  price: DecimalInput,
): Decimal {
  return toDecimal(quantity).times(toDecimal(price));
}

export function unrealizedPnl(
  quantity: DecimalInput,
  averageCost: DecimalInput,
  currentPrice: DecimalInput,
): Decimal {
  return toDecimal(currentPrice)
    .minus(toDecimal(averageCost))
    .times(toDecimal(quantity));
}

export function percentOf(
  part: DecimalInput,
  whole: DecimalInput,
  fractionDigits = 2,
): Decimal {
  const denominator = toDecimal(whole);
  if (denominator.isZero()) {
    return new Decimal(0);
  }

  return toDecimal(part).div(denominator).times(100).toDecimalPlaces(fractionDigits);
}

export function formatUsd(
  value: DecimalInput,
  fractionDigits = 2,
): string {
  const amount = toDecimal(value);
  const negative = amount.isNegative();
  const [integerPart, fractionPart] = amount
    .abs()
    .toFixed(fractionDigits)
    .split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body =
    fractionPart === undefined
      ? groupedInteger
      : `${groupedInteger}.${fractionPart}`;

  return `${negative ? "-" : ""}$${body}`;
}

export function formatSignedUsd(
  value: DecimalInput,
  fractionDigits = 2,
): string {
  const amount = toDecimal(value);
  if (amount.isZero()) {
    return formatUsd(amount, fractionDigits);
  }

  const sign = amount.isPositive() ? "+" : "-";
  return `${sign}${formatUsd(amount.abs(), fractionDigits)}`;
}

export function formatQuantity(value: DecimalInput): string {
  const amount = toDecimal(value);
  if (amount.isInteger()) {
    return amount.toFixed(0);
  }

  return amount.toFixed(8).replace(/\.?0+$/, "");
}

export function formatPercent(
  value: DecimalInput,
  fractionDigits = 2,
): string {
  const amount = toDecimal(value);
  const body = amount.abs().toFixed(fractionDigits);
  if (amount.isZero()) {
    return `${body}%`;
  }

  const sign = amount.isPositive() ? "+" : "-";
  return `${sign}${body}%`;
}
