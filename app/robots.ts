import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/for/", "/join/", "/explore", "/privacy", "/terms"],
        disallow: ["/dashboard", "/onboarding", "/admin/", "/api/"],
      },
    ],
    sitemap: "https://giftbutler.io/sitemap.xml",
  };
}
