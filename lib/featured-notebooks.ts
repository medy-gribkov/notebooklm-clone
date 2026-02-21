export interface FeaturedNotebook {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  icon: string;
  author: string;
  date: string;
  sourceCount: number;
  /** Decorative SVG pattern key for the card background */
  pattern: "circles" | "grid" | "waves" | "dots" | "hexagons" | "triangles" | "lines" | "diamond";
}

export const featuredNotebooks: FeaturedNotebook[] = [
  {
    slug: "getting-started",
    titleKey: "gettingStarted",
    descriptionKey: "gettingStartedDesc",
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
    icon: "rocket",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 3,
    pattern: "circles",
  },
  {
    slug: "research-analysis",
    titleKey: "researchAnalysis",
    descriptionKey: "researchAnalysisDesc",
    gradient: "from-violet-600 via-purple-500 to-fuchsia-500",
    icon: "research",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 5,
    pattern: "hexagons",
  },
  {
    slug: "meeting-organizer",
    titleKey: "meetingOrganizer",
    descriptionKey: "meetingOrganizerDesc",
    gradient: "from-emerald-500 via-green-500 to-teal-400",
    icon: "meeting",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 4,
    pattern: "grid",
  },
  {
    slug: "study-guide",
    titleKey: "studyGuide",
    descriptionKey: "studyGuideDesc",
    gradient: "from-amber-500 via-orange-500 to-red-400",
    icon: "study",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 6,
    pattern: "waves",
  },
  {
    slug: "data-analysis",
    titleKey: "dataAnalysis",
    descriptionKey: "dataAnalysisDesc",
    gradient: "from-indigo-600 via-blue-500 to-cyan-400",
    icon: "data",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 7,
    pattern: "dots",
  },
  {
    slug: "legal-review",
    titleKey: "legalReview",
    descriptionKey: "legalReviewDesc",
    gradient: "from-slate-600 via-gray-500 to-zinc-400",
    icon: "legal",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 4,
    pattern: "triangles",
  },
  {
    slug: "product-specs",
    titleKey: "productSpecs",
    descriptionKey: "productSpecsDesc",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-400",
    icon: "product",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 5,
    pattern: "lines",
  },
  {
    slug: "literature-review",
    titleKey: "literatureReview",
    descriptionKey: "literatureReviewDesc",
    gradient: "from-teal-600 via-emerald-500 to-green-400",
    icon: "literature",
    author: "DocChat Team",
    date: "Feb 2026",
    sourceCount: 8,
    pattern: "diamond",
  },
];

export function getFeaturedBySlug(slug: string): FeaturedNotebook | undefined {
  return featuredNotebooks.find((fn) => fn.slug === slug);
}
