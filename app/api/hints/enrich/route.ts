import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || "giftbutler09-20";

function extractMeta(html: string, property: string): string | null {
  // Try property="..." content="..."
  let m = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"));
  if (m) return m[1];
  // Try content="..." property="..."
  m = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"));
  if (m) return m[1];
  // Try name="..." content="..."
  m = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"));
  if (m) return m[1];
  return null;
}

function isAmazonHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "");
  return host === "amazon.com" || host.endsWith(".amazon.com") || host === "a.co" || host === "amzn.to" || host === "amzn.com";
}

function extractAsin(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/,
    /\/product\/([A-Z0-9]{10})/,
  ];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function amazonWidgetImageUrl(asin: string): string {
  return `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL250_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1&tag=${AFFILIATE_TAG}`;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function cleanTitle(title: string): string {
  // Remove common store suffixes like " - Amazon.com", " | Target", " : Walmart.com"
  return title.replace(/\s*[-|:]\s*(amazon\.com|amazon|target|walmart\.com|walmart|etsy|best buy|ebay|nordstrom|macys|zappos)[^-|:]*$/i, "").trim();
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let url: string;
  try {
    const body = await req.json();
    url = body.url?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  // Basic URL validation — require http or https
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ error: "Could not load that page" }, { status: 400 });

    const html = await res.text();
    const finalUrl = res.url; // URL after all redirects

    const ogTitle = extractMeta(html, "og:title");

    // For Amazon URLs, extract ASIN from the final URL and use the affiliate image widget
    let ogImage = extractMeta(html, "og:image");
    try {
      const finalHostname = new URL(finalUrl).hostname;
      if (isAmazonHost(finalHostname)) {
        const asin = extractAsin(finalUrl);
        if (asin) ogImage = amazonWidgetImageUrl(asin);
      }
    } catch { /* keep ogImage as-is */ }
    const ogPrice =
      extractMeta(html, "og:price:amount") ||
      extractMeta(html, "product:price:amount") ||
      extractMeta(html, "twitter:data1") ||
      null;

    const rawTitle = ogTitle || extractTitle(html) || "Unknown product";
    const title = cleanTitle(rawTitle);

    // Format price
    let price: string | null = null;
    if (ogPrice) {
      const num = parseFloat(ogPrice.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) price = `$${num.toFixed(2)}`;
    }

    return NextResponse.json({ title, image: ogImage || null, price });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return NextResponse.json({ error: "That page took too long to load" }, { status: 408 });
    }
    return NextResponse.json({ error: "Could not read that page — try a different link" }, { status: 400 });
  }
}
