import { NextRequest, NextResponse } from "next/server";
import { getGiftQueries, type Recipient, type Interest } from "@/lib/giftQueries";
import { searchBestBuy } from "@/lib/bestbuy";
import { amazonSearchUrl } from "@/lib/amazon";

export async function GET(req: NextRequest) {
  const recipient = req.nextUrl.searchParams.get("for") as Recipient;
  const interestsParam = req.nextUrl.searchParams.get("interests") || "";
  const budgetParam = req.nextUrl.searchParams.get("budget");

  if (!recipient) {
    return NextResponse.json({ error: "Missing recipient" }, { status: 400 });
  }

  const interests = interestsParam.split(",").filter(Boolean) as Interest[];
  const budget = budgetParam ? parseFloat(budgetParam) : undefined;
  const queries = getGiftQueries(recipient, interests, budget);

  // Run all queries in parallel
  const results = await Promise.all(
    queries.map(async (query) => {
      const products = await searchBestBuy(query, budget);
      return { query, products: products.slice(0, 2) };
    })
  );

  // Flatten and dedupe by name similarity, keep best results
  const allProducts = results
    .flatMap(({ query, products }) =>
      products.map((p) => ({ ...p, searchQuery: query }))
    )
    .filter((p, index, self) =>
      index === self.findIndex((t) => t.sku === p.sku)
    )
    .slice(0, 12);

  return NextResponse.json({
    recipient,
    interests,
    budget,
    queries,
    products: allProducts,
    amazonUrl: amazonSearchUrl(`${recipient} gift ${interests[0] || ""}`),
  });
}
