// One-time backfill: fetch og:image for hints that have a URL but no product_image
// Usage: node scripts/backfill-images.mjs
//        (reads .env.local automatically)

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {
  console.error("Could not read .env.local — make sure you're running from the project root");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || "giftbutler09-20";

function isAmazonHost(hostname) {
  const host = hostname.replace(/^www\./, "");
  return host === "amazon.com" || host.endsWith(".amazon.com") || host === "a.co" || host === "amzn.to" || host === "amzn.com";
}

function extractAsin(url) {
  const patterns = [/\/dp\/([A-Z0-9]{10})/, /\/gp\/product\/([A-Z0-9]{10})/, /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/, /\/product\/([A-Z0-9]{10})/];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function amazonImageUrl(asin) {
  return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`;
}

function extractOgImage(html) {
  let m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (m) return m[1];
  m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (m) return m[1];
  return null;
}

async function fetchImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const finalUrl = res.url;
    const html = await res.text();

    // For Amazon URLs, resolve ASIN to a direct CDN image URL
    try {
      const hostname = new URL(finalUrl).hostname;
      if (isAmazonHost(hostname)) {
        const asin = extractAsin(finalUrl);
        if (asin) return amazonImageUrl(asin);
      }
    } catch { /* fall through */ }

    return extractOgImage(html);
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

const { data: hints, error } = await supabase
  .from("hints")
  .select("id, url")
  .not("url", "is", null)
  .is("product_image", null);

if (error) {
  console.error("Failed to fetch hints:", error.message);
  process.exit(1);
}

console.log(`Found ${hints.length} hint(s) with a URL but no image.\n`);

let updated = 0;
let skipped = 0;

for (const hint of hints) {
  process.stdout.write(`  ${hint.id} — ${hint.url.slice(0, 60)}... `);
  const image = await fetchImage(hint.url);
  if (!image) {
    console.log("no image found");
    skipped++;
    continue;
  }
  const { error: updateError } = await supabase
    .from("hints")
    .update({ product_image: image })
    .eq("id", hint.id);
  if (updateError) {
    console.log(`update failed: ${updateError.message}`);
    skipped++;
  } else {
    console.log("✓");
    updated++;
  }
}

console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
