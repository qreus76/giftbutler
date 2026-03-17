const AFFILIATE_TAG = "giftbutler09-20";

export function amazonSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://www.amazon.com/s?k=${encoded}&tag=${AFFILIATE_TAG}`;
}

export function amazonProductUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}
