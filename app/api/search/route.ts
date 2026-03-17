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

  if (!query.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // Use allSettled so one failing provider never breaks the whole request
  const [ebayListingsResult, soldSummaryResult, bestBuyResult, etsyResult, walmartResult] =
    await Promise.allSettled([
      searchEbayListings(query, budget),
      getEbaySoldSummary(query),
      searchBestBuy(query, budget),
      searchEtsy(query, budget),
      searchWalmart(query, budget),
    ]);

  const ebayListings = ebayListingsResult.status === "fulfilled" ? ebayListingsResult.value : [];
  const soldSummary = soldSummaryResult.status === "fulfilled" ? soldSummaryResult.value : null;
  const bestBuyProducts = bestBuyResult.status === "fulfilled" ? bestBuyResult.value : [];
  const etsyListings = etsyResult.status === "fulfilled" ? etsyResult.value : [];
  const walmartProducts = walmartResult.status === "fulfilled" ? walmartResult.value : [];

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
