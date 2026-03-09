/**
 * Seed script: Create company notebooks with AI-generated profiles.
 *
 * Usage:
 *   npx tsx scripts/seed-companies.ts
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 *
 * Also needs SEED_USER_ID env var, the Supabase auth user ID to own all notebooks.
 * Find yours: Supabase Dashboard > Authentication > Users > copy UUID
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import crypto from "crypto";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const USER_ID = process.env.SEED_USER_ID!;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY || !USER_ID) {
  console.error("Missing required env vars. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, and SEED_USER_ID.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Company {
  name: string;
  website: string;
  category: string;
  description: string;
}

const companies: Company[] = JSON.parse(
  readFileSync(resolve(__dirname, "companies.json"), "utf-8")
);

// --- Gemini helpers ---

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;
const GENERATION_MODEL = "gemini-2.0-flash";

async function generateProfile(company: Company): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Write a comprehensive company profile for ${company.name} (${company.website}).

Company description: ${company.description}
Category: ${company.category}

Write 1500-2500 words covering:
1. Company Overview: what they do, when founded, headquarters
2. Products & Services: main offerings, key features
3. Technology Stack & Engineering: known technologies, engineering culture, open source contributions
4. Market Position: competitors, market share, unique value proposition
5. Company Culture: work environment, values, employee reviews highlights
6. Recent Developments: latest funding, product launches, partnerships (use what you know up to early 2026)
7. Career Opportunities: typical engineering roles, what they look for in candidates

Write in a professional but engaging tone. Use headers (##) for each section.
Do not use markdown bullet points excessively. Write flowing paragraphs where possible.
Be factual. If you are unsure about something, say "reportedly" or omit it.` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini generation error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function embedText(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      // Rate limited, wait and retry
      console.log("    Rate limited on embedding, waiting 10s...");
      await sleep(10_000);
      return embedText(text);
    }
    throw new Error(`Embedding error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

// --- Text splitting (simple, matches RecursiveCharacterTextSplitter behavior) ---

function splitText(text: string, chunkSize = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

// --- Utilities ---

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// --- Company slogans ---

const COMPANY_SLOGANS: Record<string, string> = {
  "Wix": "Create a Website You're Proud Of",
  "monday.com": "A New Way of Working",
  "JFrog": "Liquid Software",
  "Fiverr": "Change How the World Works Together",
  "Gong": "Revenue AI OS",
  "AppsFlyer": "When Data Leads, Performance Follows",
  "Snyk": "Develop Fast. Stay Secure.",
  "Check Point": "Securing Your AI Transformation",
  "CyberArk": "Identity Security Leader",
  "Tabnine": "AI Coding Agents, Total Control",
  "WalkMe": "Defeat Friction. Accelerate Adoption.",
  "Cloudinary": "Image and Video API Platform",
  "Redis": "The Real-time Data Platform",
  "Lightrun": "AI SRE for Production Reliability",
  "Qodo": "Deploy with Confidence",
  "Prompt Security": "Secure Your AI Everywhere",
  "Armis": "See Everything. Identify True Risk.",
  "Cato Networks": "The Single-Vendor SASE Platform",
  "Pentera": "AI-Powered Security Validation",
  "Silverfort": "Secure All Identities, Everywhere",
  "Payoneer": "We Make Global Commerce Local",
  "Melio": "Pay and Get Paid, Simply",
  "Tipalti": "One Solution for All Finance Operations",
  "Pagaya": "AI Connecting People with Opportunity",
  "Lemonade": "Forget Everything You Know About Insurance",
  "Yotpo": "Drive Revenue Growth",
  "Riskified": "Unleash Your Ecommerce Growth",
  "Forter": "AI Decisions for the Future of Commerce",
  "Dynamic Yield": "Experiences as Unique as Your Customers",
  "Coralogix": "Complete Observability. Zero Compromises.",
  "BigPanda": "Agentic AI for IT Operations",
  "Via": "Reimagining Public Transit",
  "Innoviz": "Leading the World to Safety",
  "Optibus": "Making Public Transportation Better",
  "Winn.AI": "Sales Execution Without the Pain",
  "Nimble": "Live Web Into Structured Intelligence",
  "Anima": "Design to Production-Ready Apps",
  "Second Nature": "AI Sales Training That Works",
  "Singular": "Unify Marketing Data, Measure True ROI",
  "Bringg": "Any Order. Any Fleet. Delivered.",
  "Viz.ai": "The Face of Better Outcomes",
  "TytoCare": "Healthcare From Anywhere",
  "Orca Security": "Cloud Security Made Easy",
  "Rapyd": "Accept, Send and Manage Funds Globally",
  "Matia": "The Unified DataOps Platform",
  "Legato": "Connected Ideas, Technologies, and People",
  "Brandlight": "AI Visibility for Leading Enterprises",
  "Take2": "AI Agents for Healthcare Recruiting",
  "Guidde": "Capture Knowledge and Train Teams",
  "SimilarWeb": "AI-Powered Digital Data Intelligence",
};

// --- Main ---

async function seedCompany(company: Company, index: number): Promise<void> {
  const slogan = COMPANY_SLOGANS[company.name] || "AI Analysis";
  const title = `${company.name} - ${slogan}`;

  // Check if already seeded
  const { data: existing } = await supabase
    .from("notebooks")
    .select("id")
    .eq("user_id", USER_ID)
    .eq("title", title)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`  [${index + 1}] ${company.name} - already exists, skipping`);
    return;
  }

  // 1. Generate profile
  console.log(`  [${index + 1}] ${company.name} - generating profile...`);
  const profile = await generateProfile(company);
  if (!profile || profile.length < 100) {
    console.error(`  [${index + 1}] ${company.name} - profile too short, skipping`);
    return;
  }

  // 2. Create notebook
  const { data: notebook, error: nbError } = await supabase
    .from("notebooks")
    .insert({
      user_id: USER_ID,
      title,
      description: `${company.category} | ${company.website}`,
      status: "processing",
    })
    .select("id")
    .single();

  if (nbError || !notebook) {
    console.error(`  [${index + 1}] ${company.name} - failed to create notebook:`, nbError?.message);
    return;
  }

  const notebookId = notebook.id;

  // 3. Insert file record
  const fileName = `${company.name} Company Profile.pdf`;
  await supabase.from("notebook_files").insert({
    notebook_id: notebookId,
    user_id: USER_ID,
    file_name: fileName,
    storage_path: `companies/${company.website}/${fileName}`,
    status: "ready",
    page_count: 1,
  });

  // 4. Split and embed
  const chunks = splitText(profile);
  console.log(`  [${index + 1}] ${company.name} - embedding ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    const embeddings = await Promise.all(batch.map((c) => embedText(c)));

    const rows = batch.map((content, j) => ({
      notebook_id: notebookId,
      user_id: USER_ID,
      content,
      embedding: JSON.stringify(embeddings[j]),
      file_name: fileName,
      chunk_index: i + j,
    }));

    const { error: chunkError } = await supabase.from("chunks").insert(rows);
    if (chunkError) {
      console.error(`  [${index + 1}] ${company.name} - chunk insert error:`, chunkError.message);
    }

    // Rate limit delay between embedding batches
    if (i + 5 < chunks.length) {
      await sleep(6_500);
    }
  }

  // 5. Mark notebook ready
  await supabase
    .from("notebooks")
    .update({ status: "ready" })
    .eq("id", notebookId);

  // 6. Create share link
  const shareToken = generateShareToken();
  await supabase.from("shared_links").insert({
    notebook_id: notebookId,
    user_id: USER_ID,
    token: shareToken,
    permissions: "chat",
    is_active: true,
  });

  // 7. Insert company record
  await supabase.from("companies").insert({
    name: company.name,
    website: company.website,
    category: company.category,
    notebook_id: notebookId,
    share_token: shareToken,
  });

  console.log(`  [${index + 1}] ${company.name} - done! Token: ${shareToken}`);
}

async function main() {
  console.log(`Seeding ${companies.length} companies for user ${USER_ID}...`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log();

  for (let i = 0; i < companies.length; i++) {
    try {
      await seedCompany(companies[i], i);
      // Delay between companies to respect Gemini rate limits (10 RPM)
      if (i < companies.length - 1) {
        await sleep(7_000);
      }
    } catch (err) {
      console.error(`  [${i + 1}] ${companies[i].name} - ERROR:`, err instanceof Error ? err.message : err);
      // Continue with next company
      await sleep(5_000);
    }
  }

  console.log("\nDone! All companies seeded.");
}

main().catch(console.error);
