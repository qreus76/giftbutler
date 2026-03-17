export interface EbayListing {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  imageUrl: string;
  itemUrl: string;
  seller: string;
}

export interface EbayMarketSummary {
  averageSoldPrice: number;
  lowestSoldPrice: number;
  highestSoldPrice: number;
  recentSoldCount: number;
}

// Simple in-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getEbayToken(appId: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const secret = process.env.EBAY_CLIENT_SECRET || "";
  const credentials = Buffer.from(`${appId}:${secret}`).toString("base64");

  try {
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
      cache: "no-store",
    });
    const data = await res.json();
    cachedToken = data.access_token || "";
    // Cache for 90 minutes (tokens last 2 hours)
    tokenExpiry = now + 90 * 60 * 1000;
    return cachedToken ?? "";
  } catch {
    return "";
  }
}

export async function searchEbayListings(
  query: string,
  budget?: number
): Promise<EbayListing[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return [];

  try {
    const token = await getEbayToken(appId);
    if (!token) return [];

    const params = new URLSearchParams({ q: query, limit: "20", sort: "price" });
    if (budget) params.set("price", `[0..${budget}]`);

    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.itemSummaries || []).map((item: Record<string, unknown>) => ({
      itemId: item.itemId as string,
      title: item.title as string,
      price: parseFloat((item.price as Record<string, string>)?.value || "0"),
      currency: (item.price as Record<string, string>)?.currency || "USD",
      condition: (item.condition as string) || "Unknown",
      imageUrl: (item.image as Record<string, string>)?.imageUrl || "",
      itemUrl: item.itemWebUrl as string,
      seller: (item.seller as Record<string, string>)?.username || "",
    }));
  } catch {
    return [];
  }
}

export async function getEbaySoldSummary(
  query: string
): Promise<EbayMarketSummary | null> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;

  try {
    const params = new URLSearchParams({
      "OPERATION-NAME": "findCompletedItems",
      "SERVICE-VERSION": "1.0.0",
      "SECURITY-APPNAME": appId,
      "RESPONSE-DATA-FORMAT": "JSON",
      "keywords": query,
      "itemFilter(0).name": "SoldItemsOnly",
      "itemFilter(0).value": "true",
      "paginationInput.entriesPerPage": "20",
      "sortOrder": "EndTimeSoonest",
    });

    const res = await fetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    if (items.length === 0) return null;

    const prices = items
      .map((i: Record<string, unknown>) => {
        const status = (i.sellingStatus as Record<string, unknown>[])?.[0] as Record<string, unknown> | undefined;
        const cp = (status?.currentPrice as Record<string, unknown>[])?.[0] as Record<string, unknown> | undefined;
        return parseFloat((cp?.["__value__"] as string) || "0");
      })
      .filter((p: number) => p > 0);

    if (prices.length === 0) return null;

    const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    return {
      averageSoldPrice: Math.round(avg * 100) / 100,
      lowestSoldPrice: Math.min(...prices),
      highestSoldPrice: Math.max(...prices),
      recentSoldCount: prices.length,
    };
  } catch {
    return null;
  }
}
