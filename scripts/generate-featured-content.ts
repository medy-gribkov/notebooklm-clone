/**
 * Generate rich pre-cached content for all featured companies.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx npx tsx scripts/generate-featured-content.ts
 *
 * Skips companies already present in lib/featured-content.ts contentMap.
 * Outputs TypeScript entries to stdout. Paste into contentMap manually.
 *
 * Rate limiting: 6.5s between Gemini calls to respect 10 RPM.
 */

/* eslint-disable no-console */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY env var required");
  process.exit(1);
}

// ── Company list (from lib/featured-notebooks.ts) ──────────────────────

interface Company {
  slug: string;
  name: string;
  website: string;
  category: string;
}

// Already cached slugs in lib/featured-content.ts. Skip these.
const CACHED_SLUGS = new Set([
  "wix", "monday-com", "jfrog", "gong", "check-point", "tabnine", "snyk", "appsflyer",
]);

const ALL_COMPANIES: Company[] = [
  { slug: "wix", name: "Wix", website: "wix.com", category: "SaaS" },
  { slug: "monday-com", name: "monday.com", website: "monday.com", category: "SaaS" },
  { slug: "jfrog", name: "JFrog", website: "jfrog.com", category: "DevTools" },
  { slug: "fiverr", name: "Fiverr", website: "fiverr.com", category: "E-commerce" },
  { slug: "gong", name: "Gong", website: "gong.io", category: "AI/ML" },
  { slug: "appsflyer", name: "AppsFlyer", website: "appsflyer.com", category: "SaaS" },
  { slug: "snyk", name: "Snyk", website: "snyk.io", category: "Cybersecurity" },
  { slug: "check-point", name: "Check Point", website: "checkpoint.com", category: "Cybersecurity" },
  { slug: "cyberark", name: "CyberArk", website: "cyberark.com", category: "Cybersecurity" },
  { slug: "tabnine", name: "Tabnine", website: "tabnine.com", category: "AI/ML" },
  { slug: "walkme", name: "WalkMe", website: "walkme.com", category: "SaaS" },
  { slug: "cloudinary", name: "Cloudinary", website: "cloudinary.com", category: "DevTools" },
  { slug: "redis", name: "Redis", website: "redis.io", category: "DevTools" },
  { slug: "lightrun", name: "Lightrun", website: "lightrun.com", category: "DevTools" },
  { slug: "qodo", name: "Qodo", website: "qodo.ai", category: "AI/ML" },
  { slug: "prompt-security", name: "Prompt Security", website: "prompt.security", category: "Cybersecurity" },
  { slug: "armis", name: "Armis", website: "armis.com", category: "Cybersecurity" },
  { slug: "cato-networks", name: "Cato Networks", website: "catonetworks.com", category: "Cybersecurity" },
  { slug: "pentera", name: "Pentera", website: "pentera.io", category: "Cybersecurity" },
  { slug: "silverfort", name: "Silverfort", website: "silverfort.com", category: "Cybersecurity" },
  { slug: "payoneer", name: "Payoneer", website: "payoneer.com", category: "Fintech" },
  { slug: "melio", name: "Melio", website: "meliopayments.com", category: "Fintech" },
  { slug: "tipalti", name: "Tipalti", website: "tipalti.com", category: "Fintech" },
  { slug: "pagaya", name: "Pagaya", website: "pagaya.com", category: "Fintech" },
  { slug: "lemonade", name: "Lemonade", website: "lemonade.com", category: "Fintech" },
  { slug: "yotpo", name: "Yotpo", website: "yotpo.com", category: "E-commerce" },
  { slug: "riskified", name: "Riskified", website: "riskified.com", category: "E-commerce" },
  { slug: "forter", name: "Forter", website: "forter.com", category: "E-commerce" },
  { slug: "dynamic-yield", name: "Dynamic Yield", website: "dynamicyield.com", category: "E-commerce" },
  { slug: "coralogix", name: "Coralogix", website: "coralogix.com", category: "DevTools" },
  { slug: "bigpanda", name: "BigPanda", website: "bigpanda.io", category: "AI/ML" },
  { slug: "via", name: "Via", website: "ridewithvia.com", category: "Mobility" },
  { slug: "innoviz", name: "Innoviz", website: "innoviz.tech", category: "Mobility" },
  { slug: "optibus", name: "Optibus", website: "optibus.com", category: "Mobility" },
  { slug: "winn-ai", name: "Winn.AI", website: "winn.ai", category: "AI/ML" },
  { slug: "nimble", name: "Nimble", website: "nimbleway.com", category: "SaaS" },
  { slug: "anima", name: "Anima", website: "animaapp.com", category: "DevTools" },
  { slug: "second-nature", name: "Second Nature", website: "secondnature.ai", category: "AI/ML" },
  { slug: "singular", name: "Singular", website: "singular.net", category: "SaaS" },
  { slug: "bringg", name: "Bringg", website: "bringg.com", category: "Mobility" },
  { slug: "viz-ai", name: "Viz.ai", website: "viz.ai", category: "HealthTech" },
  { slug: "tytocare", name: "TytoCare", website: "tytocare.com", category: "HealthTech" },
  { slug: "orca-security", name: "Orca Security", website: "orca.security", category: "Cybersecurity" },
  { slug: "rapyd", name: "Rapyd", website: "rapyd.net", category: "Fintech" },
  { slug: "matia", name: "Matia", website: "matia.io", category: "AI/ML" },
  { slug: "legato", name: "Legato", website: "legato.co", category: "AI/ML" },
  { slug: "brandlight", name: "Brandlight", website: "brandlight.org", category: "AI/ML" },
  { slug: "take2", name: "Take2", website: "take2.co", category: "AI/ML" },
  { slug: "guidde", name: "Guidde", website: "guidde.com", category: "DevTools" },
  { slug: "similarweb", name: "SimilarWeb", website: "similarweb.com", category: "SaaS" },
];

// ── Gemini helpers ─────────────────────────────────────────────────────

const MODEL = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 10_000;
        console.error(`  429 rate limited, waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        console.error(`  Gemini ${res.status}: ${res.statusText}`);
        return "";
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      console.error(`  Attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
      await sleep(5000);
    }
  }
  return "";
}

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  // Find first [ or { and last ] or }
  const start = cleaned.search(/[[\{]/);
  const lastBracket = cleaned.lastIndexOf("]");
  const lastBrace = cleaned.lastIndexOf("}");
  const end = Math.max(lastBracket, lastBrace);
  if (start === -1 || end === -1) return cleaned;
  return cleaned.slice(start, end + 1);
}

// ── Studio content prompts (matching app/api/studio/route.ts) ──────────

const STUDIO_PROMPTS = {
  profile: (name: string, website: string, category: string) =>
    `Write a comprehensive, factual company profile for ${name} (${website}) using current information.
Category: ${category}

Write 1500-2500 words covering:
1. Company Overview - what they do, when founded, headquarters, key leadership
2. Products & Services - main offerings, key features, pricing model
3. Technology Stack & Engineering - known technologies, engineering culture, open source contributions
4. Market Position - competitors, market share, unique value proposition
5. Company Culture - work environment, values, employee reviews highlights
6. Recent Developments - latest funding rounds, product launches, partnerships, acquisitions
7. Career Opportunities - typical engineering roles, what they look for in candidates

Write in a professional but engaging tone. Use markdown headers (##) for each section.
Be factual and specific. Include real metrics, funding amounts, and employee counts where available.
If you are unsure about something, say "reportedly" or omit it.`,

  quiz: (profileText: string) =>
    `From the company profile below, create a 10-question multiple choice quiz testing knowledge of the company's products, technology, market position, culture, and competitive landscape. Return ONLY valid JSON with no additional text: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,

  flashcards: (profileText: string) =>
    `From the company profile below, create 10-15 flashcards covering the most important facts: products, tech stack, leadership, funding, competitors, and culture. Return ONLY a valid JSON array with no additional text: [{"front":"question or term","back":"answer or definition"}]

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,

  report: (profileText: string) =>
    `Write a structured analysis report of the company below. Return ONLY valid JSON with no additional text: [{"heading":"Company Overview","content":"..."},{"heading":"Products & Technology","content":"..."},{"heading":"Market Position & Competition","content":"..."},{"heading":"Engineering Culture & Opportunities","content":"..."}]. Each content field should be 2-4 paragraphs.

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,

  mindmap: (profileText: string) =>
    `Extract the hierarchical structure of the company below into a mind map covering products, technology, market, culture, and opportunities. Return ONLY valid JSON with no additional text: {"label":"Company Name","children":[{"label":"Products","children":[{"label":"Product A"},{"label":"Product B"}]},{"label":"Technology","children":[]}]}. Maximum 3 levels deep, 4-8 top-level children.

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,

  datatable: (profileText: string) =>
    `Extract all key facts, metrics, funding rounds, employee counts, revenue figures, founding dates, and notable statistics from the company profile below. Return ONLY valid JSON with no additional text: {"columns":["Metric","Value","Context"],"rows":[["Founded","2006","Tel Aviv, Israel"]]}. Include at least 8 rows.

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,

  infographic: (profileText: string) =>
    `Create a structured company snapshot from the profile below. Break into 4-6 sections: overview, key metrics, technology stack, market position, culture highlights, and career opportunities. Return ONLY valid JSON with no additional text: [{"heading":"Section Title","content":"Brief description paragraph"}]. Each section should be concise and visually oriented.

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,

  slidedeck: (profileText: string) =>
    `Create a presentation deck about the company below with 8-12 slides covering: overview, products, technology, market position, competitive landscape, culture, and career opportunities. Return ONLY valid JSON with no additional text: [{"heading":"Slide Title","content":"2-4 bullet points"}].

===BEGIN DOCUMENT===
${profileText}
===END DOCUMENT===`,
};

// ── Main ───────────────────────────────────────────────────────────────

async function generateForCompany(company: Company): Promise<string> {
  console.error(`\n[${company.slug}] Generating profile...`);
  const profileText = await callGemini(STUDIO_PROMPTS.profile(company.name, company.website, company.category));
  if (profileText.length < 200) {
    console.error(`  SKIP: profile too short (${profileText.length} chars)`);
    return "";
  }
  await sleep(6500);

  console.error(`  Generating quiz...`);
  const quizRaw = await callGemini(STUDIO_PROMPTS.quiz(profileText));
  await sleep(6500);

  console.error(`  Generating flashcards...`);
  const flashcardsRaw = await callGemini(STUDIO_PROMPTS.flashcards(profileText));
  await sleep(6500);

  console.error(`  Generating report...`);
  const reportRaw = await callGemini(STUDIO_PROMPTS.report(profileText));
  await sleep(6500);

  console.error(`  Generating mindmap...`);
  const mindmapRaw = await callGemini(STUDIO_PROMPTS.mindmap(profileText));
  await sleep(6500);

  console.error(`  Generating datatable...`);
  const datatableRaw = await callGemini(STUDIO_PROMPTS.datatable(profileText));
  await sleep(6500);

  console.error(`  Generating infographic...`);
  const infographicRaw = await callGemini(STUDIO_PROMPTS.infographic(profileText));
  await sleep(6500);

  console.error(`  Generating slidedeck...`);
  const slidedeckRaw = await callGemini(STUDIO_PROMPTS.slidedeck(profileText));
  await sleep(6500);

  // Parse JSON safely with fallbacks
  const parse = <T>(raw: string, fallback: T): T => {
    try {
      return JSON.parse(extractJSON(raw)) as T;
    } catch {
      console.error(`  WARN: JSON parse failed, using fallback`);
      return fallback;
    }
  };

  const quiz = parse(quizRaw, [{ question: `What category does ${company.name} belong to?`, options: [company.category, "E-commerce", "HealthTech", "Gaming"], correctIndex: 0, explanation: `${company.name} is a ${company.category} company.` }]);
  const flashcards = parse(flashcardsRaw, [{ front: company.name, back: `${company.category} company. Website: ${company.website}` }]);
  const report = parse(reportRaw, [{ heading: "Company Summary", content: `${company.name} is a ${company.category} company.` }]);
  const mindmap = parse(mindmapRaw, { label: company.name, children: [{ label: "Products" }, { label: "Engineering" }, { label: "Culture" }] });
  const datatable = parse(datatableRaw, { columns: ["Metric", "Value"], rows: [["Name", company.name], ["Website", company.website], ["Category", company.category]] });
  const infographic = parse(infographicRaw, [{ heading: "Overview", content: `${company.name} operates in ${company.category}.` }]);
  const slidedeck = parse(slidedeckRaw, [{ heading: company.name, content: `A ${company.category} company.` }]);

  // Escape backticks in profile text for template literal
  const escapedProfile = profileText.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `  "${company.slug}": {
    description: "AI-generated analysis of ${company.name}, a ${company.category} company.",
    files: [{ fileName: "${company.name} Company Profile.pdf", content: \`${escapedProfile}\` }],
    quiz: ${JSON.stringify(quiz)},
    flashcards: ${JSON.stringify(flashcards)},
    report: ${JSON.stringify(report)},
    mindmap: ${JSON.stringify(mindmap)},
    datatable: ${JSON.stringify(datatable)},
    infographic: ${JSON.stringify(infographic)},
    slidedeck: ${JSON.stringify(slidedeck)},
  },`;
}

async function main() {
  const toGenerate = ALL_COMPANIES.filter((c) => !CACHED_SLUGS.has(c.slug));
  console.error(`Found ${toGenerate.length} companies to generate (${CACHED_SLUGS.size} already cached)`);
  console.error(`Estimated time: ~${Math.ceil(toGenerate.length * 8 * 6.5 / 60)} minutes\n`);

  const results: string[] = [];

  for (const company of toGenerate) {
    const entry = await generateForCompany(company);
    if (entry) {
      results.push(entry);
      console.error(`  Done: ${company.slug}`);
    }
  }

  // Output all entries as TypeScript to stdout
  console.log("// ── Auto-generated featured content ──");
  console.log("// Paste these entries into the contentMap in lib/featured-content.ts\n");
  for (const r of results) {
    console.log(r);
  }

  console.error(`\nGenerated ${results.length}/${toGenerate.length} companies successfully.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
