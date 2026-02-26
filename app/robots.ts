import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/shared/",
      disallow: ["/api/", "/dashboard", "/notebook/", "/settings"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://docchat-cagb.onrender.com"}/sitemap.xml`,
  };
}
