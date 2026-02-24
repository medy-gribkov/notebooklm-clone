export interface FeaturedNotebook {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  bgClass: string;
  icon: string;
  author: string;
  date: string;
  sourceCount: number;
  /** Decorative SVG pattern key for the card background */
  pattern: "circles" | "grid" | "waves" | "dots" | "hexagons" | "triangles" | "lines" | "diamond";
  /** Company website domain for logo (Clearbit) */
  website?: string;
}

export const featuredNotebooks: FeaturedNotebook[] = [
  {
    slug: "wix",
    titleKey: "wix",
    descriptionKey: "wixDesc",
    bgClass: "bg-[#191919] text-[#FAFAF7]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "circles",
    website: "wix.com",
  },
  {
    slug: "monday",
    titleKey: "monday",
    descriptionKey: "mondayDesc",
    bgClass: "bg-[#CC785C] text-[#FAFAF7]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "hexagons",
    website: "monday.com",
  },
  {
    slug: "jfrog",
    titleKey: "jfrog",
    descriptionKey: "jfrogDesc",
    bgClass: "bg-[#D4A27F] text-[#191919]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "grid",
    website: "jfrog.com",
  },
  {
    slug: "gong",
    titleKey: "gong",
    descriptionKey: "gongDesc",
    bgClass: "bg-[#40403E] text-[#FAFAF7]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "waves",
    website: "gong.io",
  },
  {
    slug: "check-point",
    titleKey: "checkPoint",
    descriptionKey: "checkPointDesc",
    bgClass: "bg-[#FAFAF7] text-[#191919] border border-black/5 dark:bg-[#262626] dark:text-[#FAFAF7] dark:border-white/5",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "dots",
    website: "checkpoint.com",
  },
  {
    slug: "tabnine",
    titleKey: "tabnine",
    descriptionKey: "tabnineDesc",
    bgClass: "bg-[#262626] text-[#FAFAF7]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "triangles",
    website: "tabnine.com",
  },
  {
    slug: "snyk",
    titleKey: "snyk",
    descriptionKey: "snykDesc",
    bgClass: "bg-[#666666] text-[#FAFAF7]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "lines",
    website: "snyk.io",
  },
  {
    slug: "appsflyer",
    titleKey: "appsflyer",
    descriptionKey: "appsflyerDesc",
    bgClass: "bg-[#E5E4DF] text-[#191919] dark:bg-[#40403E] dark:text-[#FAFAF7]",
    icon: "company",
    author: "DocChat",
    date: "Feb 2026",
    sourceCount: 1,
    pattern: "diamond",
    website: "appsflyer.com",
  },
];

export function getFeaturedBySlug(slug: string): FeaturedNotebook | undefined {
  return featuredNotebooks.find((fn) => fn.slug === slug);
}
