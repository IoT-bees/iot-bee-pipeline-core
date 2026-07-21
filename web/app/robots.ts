import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/app/",
        "/billing/",
        "/demo",
        "/direcciones-visuales",
        "/groups/",
        "/login",
        "/pipelines/",
        "/schemas/",
        "/sources/",
        "/stores/",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
