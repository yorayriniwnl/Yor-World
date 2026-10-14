import { publicBaseUrl } from "@/config/public-base-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicBaseUrl;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/internal/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
