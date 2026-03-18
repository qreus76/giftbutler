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

// Categories to exclude when searching for adult gifts
const ADULT_EXCLUDED_CATEGORIES = ["toys", "lego", "action figure", "doll", "children", "kids", "infant", "baby", "learning & development"];

export async function searchBestBuy(
  query: string,
  budget?: number,
  excludeToys = false
): Promise<BestBuyProduct[]> {
  const apiKey = process.env.BESTBUY_API_KEY;
  if (!apiKey) return [];

  const budgetFilter = budget ? `&salePrice<=${budget}` : "";
  const encoded = encodeURIComponent(query);

  // type=HardGood filters out service plans, warranties, subscriptions
  const url = `https://api.bestbuy.com/v1/products((search=${encoded})&(type=HardGood)${budgetFilter})?apiKey=${apiKey}&show=sku,name,salePrice,regularPrice,url,image,onSale,categoryPath&pageSize=6&format=json`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  const products = data.products || [];

  const JUNK_KEYWORDS = ["applecare", "care+", "service fee", "service plan", "protection plan", "warranty", "monthly plan", "geek squad"];

  return products
    .filter((p: Record<string, unknown>) => p.salePrice && (p.salePrice as number) > 0)
    .filter((p: Record<string, unknown>) => !budget || (p.salePrice as number) <= budget)
    .filter((p: Record<string, unknown>) => {
      const name = (p.name as string || "").toLowerCase();
      return !JUNK_KEYWORDS.some((kw) => name.includes(kw));
    })
    .filter((p: Record<string, unknown>) => {
      if (!excludeToys) return true;
      const categoryArr = Array.isArray(p.categoryPath)
        ? (p.categoryPath as Array<{ name: string }>).map((c) => c.name).join(" ").toLowerCase()
        : String(p.categoryPath || "").toLowerCase();
      const name = (p.name as string || "").toLowerCase();
      return !ADULT_EXCLUDED_CATEGORIES.some((kw) => categoryArr.includes(kw) || name.includes(kw));
    })
    .map((p: Record<string, unknown>) => ({
      sku: p.sku,
      name: p.name,
      salePrice: p.salePrice,
      regularPrice: p.regularPrice || p.salePrice,
      url: p.url as string,
      image: p.image || "",
      onSale: p.onSale || false,
      categoryPath: Array.isArray(p.categoryPath)
        ? (p.categoryPath as Array<{ name: string }>).map((c) => c.name).join(" > ")
        : String(p.categoryPath || ""),
    }));
}
