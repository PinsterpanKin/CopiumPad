import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  formatPercent,
  formatQuantity,
  formatSignedUsd,
  formatUsd,
  marketValue,
  percentOf,
  unrealizedPnl,
} from "./money";

describe("unrealizedPnl", () => {
  it("computes (price - avg) * qty without floating-point drift", () => {
    const pnl = unrealizedPnl("0.85", "62450.00", "97120.00");
    expect(pnl.equals(new Decimal("29469.50"))).toBe(true);
  });

  it("returns a negative result when underwater", () => {
    const pnl = unrealizedPnl("10", "500.00", "480.10");
    expect(pnl.equals(new Decimal("-199.00"))).toBe(true);
  });
});

describe("marketValue", () => {
  it("multiplies quantity and mark with Decimal precision", () => {
    expect(marketValue("80", "478.45").equals(new Decimal("38276.00"))).toBe(
      true,
    );
  });
});

describe("percentOf", () => {
  it("rounds today's move on net worth to two decimal places", () => {
    expect(percentOf("1240.50", "128450.00").equals(new Decimal("0.97"))).toBe(
      true,
    );
  });

  it("returns zero when the denominator is zero", () => {
    expect(percentOf("10", "0").isZero()).toBe(true);
  });
});

describe("formatters", () => {
  it("formats USD with grouping separators", () => {
    expect(formatUsd("128450")).toBe("$128,450.00");
    expect(formatUsd("-12300")).toBe("-$12,300.00");
  });

  it("prefixes a sign for PnL display", () => {
    expect(formatSignedUsd("1240.50")).toBe("+$1,240.50");
    expect(formatSignedUsd("-34.10")).toBe("-$34.10");
  });

  it("trims trailing zeros on fractional quantities", () => {
    expect(formatQuantity("100")).toBe("100");
    expect(formatQuantity("0.85000000")).toBe("0.85");
  });

  it("formats percents with an explicit sign", () => {
    expect(formatPercent("0.97")).toBe("+0.97%");
    expect(formatPercent("-1.20")).toBe("-1.20%");
  });
});
