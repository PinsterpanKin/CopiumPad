import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { dayPnl, returnPercent } from "./money";
import { markPosition, portfolioTotals, type Holding } from "./portfolio";

const voo: Holding = {
  symbol: "VOO",
  name: "Vanguard S&P 500 ETF",
  quantity: "50",
  averageCost: "450",
};

describe("returnPercent", () => {
  it("computes (price - avg) / avg * 100", () => {
    expect(returnPercent("495", "450").equals(new Decimal("10"))).toBe(true);
  });
});

describe("dayPnl", () => {
  it("backs out previous close from Yahoo percent points", () => {
    const pnl = dayPnl("10", "101", "1");
    expect(pnl.equals(new Decimal("10"))).toBe(true);
  });
});

describe("markPosition + portfolioTotals", () => {
  it("rolls up market value, unrealized PnL, and day's return", () => {
    const position = markPosition(voo, {
      symbol: "VOO",
      name: "Vanguard S&P 500 ETF",
      price: "495",
      changePercent: "1",
    });

    expect(position.marketValue?.equals(new Decimal("24750"))).toBe(true);
    expect(position.unrealizedPnl?.equals(new Decimal("2250"))).toBe(true);
    expect(position.unrealizedPnlPercent?.equals(new Decimal("10"))).toBe(true);

    const expectedDayPnl = new Decimal("50").times("495").times("0.01").div("1.01");
    expect(position.dayPnl?.equals(expectedDayPnl)).toBe(true);

    const totals = portfolioTotals([position]);
    expect(totals.totalValue.equals(new Decimal("24750"))).toBe(true);
    expect(totals.netUnrealizedPnl.equals(new Decimal("2250"))).toBe(true);
    expect(totals.dayPnl.equals(expectedDayPnl)).toBe(true);
    expect(
      totals.dayReturnPercent.toDecimalPlaces(2).equals(new Decimal("1")),
    ).toBe(true);
  });
});
