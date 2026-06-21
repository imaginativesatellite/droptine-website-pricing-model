import type { MetadataRoute } from "next";

// Private internal tool - keep the whole site out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
