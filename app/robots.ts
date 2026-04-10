import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contact", "/onboarding"],
        disallow: [
          "/dashboard/",
          "/tenant/",
          "/auth/",
          "/api/",
          "/super-admin/",
          "/sign-lease/",
          "/subscription-expired/",
          "/unauthorized/",
        ],
      },
    ],
    sitemap: "https://makejahomes.co.ke/sitemap.xml",
  }
}
