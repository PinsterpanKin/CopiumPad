import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// 26.09.05: Instantiate client here
const yf = new YahooFinance();

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get("symbols") || "VOO,QQQ,BTC-USD";
    const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
  
    try {
      const quotes = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const quote = await yf.quote(symbol);
            return {
              symbol,
              name: quote.shortName || quote.longName || symbol,
              price: quote.regularMarketPrice ?? 0,
              changePercent: quote.regularMarketChangePercent ?? 0,
              currency: quote.currency || "USD",
            };
          } catch (err) {
            console.error(`Error fetching quote for ${symbol}:`, err);
            return { symbol, name: symbol, price: 0, changePercent: 0, currency: "USD", error: true };
          }
        })
      );
  
      return NextResponse.json({ success: true, data: quotes });
    } catch (error) {
      console.error("API error:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch quotes" }, { status: 500 });
    }
  }