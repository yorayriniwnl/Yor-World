import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.yorayriniwnl.in";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/internal/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
