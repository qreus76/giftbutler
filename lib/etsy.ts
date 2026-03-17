export interface EtsyListing {
  listing_id: number;
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl: string;
  shopName: string;
}

export async function searchEtsy(
  query: string,
  budget?: number
): Promise<EtsyListing[]> {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    keywords: query,
    limit: "6",
    sort_on: "score",
    includes: "Images",
  });
  if (budget) params.set("max_price", String(budget));

  try {
    const res = await fetch(
      `https://openapi.etsy.com/v3/application/listings/active?${params}`,
      { headers: { "x-api-key": apiKey }, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((item: Record<string, unknown>) => {
      const price = item.price as Record<string, number> | undefined;
      const images = item.images as Record<string, string>[] | undefined;
      const amount = price?.amount ?? 0;
      const divisor = price?.divisor || 100;
      return {
        listing_id: item.listing_id as number,
        title: item.title as string,
        price: amount / divisor,
        currency: (price as Record<string, string> | undefined)?.currency_code || "USD",
        url: item.url as string || "",
        imageUrl: images?.[0]?.url_570xN || "",
        shopName: (item.shop as Record<string, string> | undefined)?.shop_name || "",
      };
    });
  } catch {
    return [];
  }
}
