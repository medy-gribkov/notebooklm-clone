import type { FeaturedStudioContent } from "@/lib/featured-content";

/**
 * Generate company profile content using Gemini 2.0 Flash with Google Search grounding.
 * Used by both clone-featured and admin generate routes.
 */
export async function generateCompanyContent(
  name: string,
  website: string,
  category: string,
): Promise<FeaturedStudioContent | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = `Write a comprehensive, factual company profile for ${name} (${website}) using current information as of February 2026.
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
If you are unsure about something, say "reportedly" or omit it.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`[generate-company] Gemini API error ${res.status} for ${name}`);
      return null;
    }

    const data = await res.json();
    const profileText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (profileText.length < 200) return null;

    const fileName = `${name} Company Profile.pdf`;
    return {
      description: `AI-generated analysis of ${name}, a ${category} company.`,
      files: [{ fileName, content: profileText }],
      quiz: [
        { question: `What category does ${name} belong to?`, options: [category, "E-commerce", "HealthTech", "Gaming"], correctIndex: 0, explanation: `${name} is a ${category} company based in Israel.` },
      ],
      flashcards: [{ front: name, back: `${category} company. Website: ${website}` }],
      report: [{ heading: "Company Summary", content: `${name} is an Israeli tech company in the ${category} space. Visit ${website} for more information.` }],
      mindmap: { label: name, children: [{ label: "Products" }, { label: "Engineering" }, { label: "Culture" }] },
      datatable: { columns: ["Attribute", "Details"], rows: [["Name", name], ["Website", website], ["Category", category], ["HQ", "Israel"]] },
      infographic: [{ heading: "Overview", content: `${name} operates in ${category}.` }],
      slidedeck: [{ heading: name, content: `A ${category} company from Israel.` }],
    };
  } catch (e) {
    console.error("[generate-company] Failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
