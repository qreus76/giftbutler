import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/for/", "/explore", "/privacy", "/terms"],
        disallow: ["/dashboard", "/onboarding", "/api/"],
      },
    ],
    sitemap: "https://giftbutler.io/sitemap.xml",
  };
}
