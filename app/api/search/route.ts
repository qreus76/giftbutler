import { NextRequest, NextResponse } from "next/server";
import { searchEbayListings, getEbaySoldSummary } from "@/lib/ebay";
import { amazonSearchUrl } from "@/lib/amazon";
import { searchBestBuy } from "@/lib/bestbuy";
import { searchEtsy } from "@/lib/etsy";
import { searchWalmart, walmartSearchUrl } from "@/lib/walmart";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const budgetParam = req.nextUrl.searchParams.get("budget");
  const budget = budgetParam ? parseFloat(budgetParam) : undefined;

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const [ebayListings, soldSummary, bestBuyProducts, etsyListings, walmartProducts] =
    await Promise.all([
      searchEbayListings(query, budget),
      getEbaySoldSummary(query),
      searchBestBuy(query, budget),
      searchEtsy(query, budget),
      searchWalmart(query, budget),
    ]);

  return NextResponse.json({
    query,
    budget,
    amazonUrl: amazonSearchUrl(query),
    walmartUrl: walmartSearchUrl(query),
    ebayListings,
    soldSummary,
    bestBuyProducts,
    etsyListings,
    walmartProducts,
    sources: {
      ebay: !!process.env.EBAY_APP_ID,
      bestbuy: !!process.env.BESTBUY_API_KEY,
      etsy: !!process.env.ETSY_API_KEY,
      walmart: !!process.env.WALMART_API_KEY,
    },
  });
}
