import { NextRequest, NextResponse } from "next/server";
import { searchQuotes } from "../quotes/route";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    return NextResponse.json({
      success: true,
      data: await searchQuotes(query),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search assets" },
      { status: 500 },
    );
  }
}