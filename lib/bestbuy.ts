export interface BestBuyProduct {
  sku: string;
  name: string;
  salePrice: number;
  regularPrice: number;
  url: string;
  image: string;
  onSale: boolean;
  categoryPath: string;
}

export async function searchBestBuy(
  query: string,
  budget?: number
): Promise<BestBuyProduct[]> {
  const apiKey = process.env.BESTBUY_API_KEY;
  if (!apiKey) return [];

  const priceFilter = budget ? `&salePrice<=600` : "";
  const encoded = encodeURIComponent(query);

  const url = `https://api.bestbuy.com/v1/products((search=${encoded})${priceFilter})?apiKey=${apiKey}&show=sku,name,salePrice,regularPrice,url,image,onSale,categoryPath&pageSize=6&format=json`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  const products = data.products || [];

  return products
    .filter((p: Record<string, unknown>) => p.salePrice && (p.salePrice as number) > 0)
    .filter((p: Record<string, unknown>) => !budget || (p.salePrice as number) <= budget)
    .map((p: Record<string, unknown>) => ({
      sku: p.sku,
      name: p.name,
      salePrice: p.salePrice,
      regularPrice: p.regularPrice || p.salePrice,
      url: p.url as string,
      image: p.image || "",
      onSale: p.onSale || false,
      categoryPath: p.categoryPath || "",
    }));
}
