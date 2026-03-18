import { NextRequest, NextResponse } from "next/server";
import { getGiftQueries, type Recipient, type Interest } from "@/lib/giftQueries";
import { searchBestBuy } from "@/lib/bestbuy";
import { searchEtsy } from "@/lib/etsy";
import { searchEbayListings } from "@/lib/ebay";
import { amazonSearchUrl } from "@/lib/amazon";
import { walmartSearchUrl } from "@/lib/walmart";

export async function GET(req: NextRequest) {
  const recipient = req.nextUrl.searchParams.get("for") as Recipient;
  const interestsParam = req.nextUrl.searchParams.get("interests") || "";
  const budgetParam = req.nextUrl.searchParams.get("budget");
  const occasion = req.nextUrl.searchParams.get("occasion") || "";

  if (!recipient) {
    return NextResponse.json({ error: "Missing recipient" }, { status: 400 });
  }

  const interests = interestsParam.split(",").filter(Boolean) as Interest[];
  const budget = budgetParam ? parseFloat(budgetParam) : undefined;
  const queries = getGiftQueries(recipient, interests, budget);

  // Exclude toy categories for adult recipients
  const ADULT_RECIPIENTS = ["dad", "mom", "partner", "friend", "grandparent", "colleague"];
  const excludeToys = ADULT_RECIPIENTS.includes(recipient);

  // Run all providers across all queries in parallel
  const [bestBuyResults, etsyResults, ebayResults] = await Promise.allSettled([
    Promise.all(queries.map((q) => searchBestBuy(q, budget, excludeToys).then((p) => p.slice(0, 2).map((item) => ({ ...item, source: "Best Buy", searchQuery: q }))))),
    Promise.all(queries.slice(0, 3).map((q) => searchEtsy(q, budget).then((p) => p.slice(0, 1).map((item) => ({ ...item, source: "Etsy", searchQuery: q }))))),
    Promise.all(queries.slice(0, 2).map((q) => searchEbayListings(q, budget).then((p) => p.slice(0, 1).map((item) => ({ ...item, source: "eBay", searchQuery: q }))))),
  ]);

  const bestBuyProducts = bestBuyResults.status === "fulfilled"
    ? bestBuyResults.value.flat()
    : [];

  const etsyProducts = etsyResults.status === "fulfilled"
    ? etsyResults.value.flat()
    : [];

  const ebayProducts = ebayResults.status === "fulfilled"
    ? ebayResults.value.flat()
    : [];

  // Normalize all products to a common shape
  type GiftProduct = {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    url: string;
    source: string;
    searchQuery: string;
    onSale?: boolean;
    condition?: string;
  };

  const allProducts: GiftProduct[] = [
    ...bestBuyProducts.map((p) => ({
      id: `bb-${p.sku}`,
      name: p.name,
      price: p.salePrice,
      originalPrice: p.regularPrice > p.salePrice ? p.regularPrice : undefined,
      image: p.image,
      url: p.url,
      source: "Best Buy",
      searchQuery: p.searchQuery,
      onSale: p.onSale,
    })),
    ...etsyProducts.map((p) => ({
      id: `etsy-${p.listing_id}`,
      name: p.title,
      price: p.price,
      image: p.imageUrl,
      url: p.url,
      source: "Etsy",
      searchQuery: p.searchQuery,
    })),
    ...ebayProducts.map((p) => ({
      id: `ebay-${p.itemId}`,
      name: p.title,
      price: p.price,
      image: p.imageUrl,
      url: p.itemUrl,
      source: "eBay",
      searchQuery: p.searchQuery,
      condition: p.condition,
    })),
  ];

  // Dedupe by id and cap at 12
  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).slice(0, 12);

  const occasionStr = occasion ? ` ${occasion.replace(/-/g, " ")}` : "";
  const recipientStr = `${recipient}${occasionStr} gift ${interests[0] || ""}`.trim();

  return NextResponse.json({
    recipient,
    interests,
    budget,
    products: unique,
    totalFound: unique.length,
    amazonUrl: amazonSearchUrl(recipientStr),
    walmartUrl: walmartSearchUrl(recipientStr),
    sources: {
      bestbuy: !!process.env.BESTBUY_API_KEY,
      etsy: !!process.env.ETSY_API_KEY,
      ebay: !!process.env.EBAY_APP_ID,
    },
  });
}
