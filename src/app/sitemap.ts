import type { MetadataRoute } from "next";
import { SITE } from "@/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE.url, lastModified: new Date("2026-10-04"), changeFrequency: "monthly", priority: 1 }];
}
