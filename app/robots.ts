import type { MetadataRoute } from "next";
import { PUBLIC_SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Public images use this API path; the longer Allow overrides /api/.
      allow: ["/", "/api/uploads/"],
      disallow: ["/dashboard", "/login", "/recuperar", "/api/"]
    },
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`
  };
}
