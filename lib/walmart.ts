export interface WalmartProduct {
  itemId: string;
  name: string;
  salePrice: number;
  msrp: number;
  imageUrl: string;
  productUrl: string;
  categoryPath: string;
  inStock: boolean;
}

export async function searchWalmart(
  query: string,
  budget?: number
): Promise<WalmartProduct[]> {
  const apiKey = process.env.WALMART_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    query,
    apiKey,
    format: "json",
    numItems: "6",
  });

  const res = await fetch(
    `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?${params}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data.items || [])
    .filter((p: Record<string, unknown>) => !budget || (p.salePrice as number) <= budget)
    .map((p: Record<string, unknown>) => ({
      itemId: String(p.itemId),
      name: p.name,
      salePrice: p.salePrice || p.msrp || 0,
      msrp: p.msrp || p.salePrice || 0,
      imageUrl: p.thumbnailImage as string || "",
      productUrl: p.productUrl as string || "",
      categoryPath: p.categoryPath as string || "",
      inStock: p.availableOnline as boolean || false,
    }));
}

export function walmartSearchUrl(query: string): string {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
}
