export interface EtsyListing {
  listing_id: number;
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl: string;
  shopName: string;
  isFeatured: boolean;
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
  if (budget) {
    params.set("max_price", String(budget));
  }

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/listings/active?${params}`,
    {
      headers: { "x-api-key": apiKey },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map((item: Record<string, unknown>) => {
    const price = item.price as Record<string, unknown>;
    const images = item.images as Record<string, unknown>[];
    return {
      listing_id: item.listing_id,
      title: item.title,
      price: parseFloat((price?.amount as number) / (price?.divisor as number || 100) as unknown as string),
      currency: price?.currency_code || "USD",
      url: item.url as string,
      imageUrl: images?.[0]?.url_570xN as string || "",
      shopName: (item.shop as Record<string, unknown>)?.shop_name as string || "",
      isFeatured: item.featured_rank !== null,
    };
  });
}
