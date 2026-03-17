import { NextRequest, NextResponse } from "next/server";
import { searchEbayListings, getEbaySoldSummary } from "@/lib/ebay";
import { amazonSearchUrl } from "@/lib/amazon";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const budgetParam = req.nextUrl.searchParams.get("budget");
  const budget = budgetParam ? parseFloat(budgetParam) : undefined;

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const [ebayListings, soldSummary] = await Promise.all([
    searchEbayListings(query, budget),
    getEbaySoldSummary(query),
  ]);

  return NextResponse.json({
    query,
    budget,
    amazonUrl: amazonSearchUrl(query),
    ebayListings,
    soldSummary,
    ebayReady: !!process.env.EBAY_APP_ID,
  });
}
