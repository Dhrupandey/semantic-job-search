import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
 
type Job = {
  title: string;
  company?: string;
  location?: string;
  description: string;
};
 
const MODEL = "gemini-embedding-001";
const DIMS = 768; // must match vector(768) in the jobs table
const BATCH_SIZE = 20;
const DELAY_MS = 12_000; // pause between batches to stay inside free-tier limits
const MAX_CHARS = 1500; // trim long descriptions before embedding
 
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}
 
const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_KEY")
);
const geminiKey = requireEnv("GEMINI_API_KEY");
 
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
 
// Embeddings that are not 3072-dimensional come back un-normalized, so normalize them.
function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return v.map((x) => x / norm);
}
 
function jobToText(j: Job): string {
  const head = [j.title, j.company, j.location].filter(Boolean).join(" | ");
  return `${head}\n${j.description}`.slice(0, MAX_CHARS);
}
 
async function embedBatch(texts: string[], attempt = 1): Promise<number[][]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: DIMS,
        })),
      }),
    }
  );
 
  // Rate limited: wait and retry a few times.
  if (res.status === 429 && attempt <= 4) {
    console.log(`Rate limited, waiting 30s (retry ${attempt}/4)...`);
    await sleep(30_000);
    return embedBatch(texts, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }
 
  const data = (await res.json()) as { embeddings: { values: number[] }[] };
  return data.embeddings.map((e) => normalize(e.values));
}
 
async function main() {
  const file = process.argv[2] ?? "data/sample-jobs.json";
  const jobs: Job[] = JSON.parse(readFileSync(file, "utf8")).filter(
    (j: Job) => j.title && j.description
  );
  console.log(`Loaded ${jobs.length} jobs from ${file}`);
 
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch.map(jobToText));
 
    const rows = batch.map((job, k) => ({
      title: job.title,
      company: job.company ?? null,
      location: job.location ?? null,
      description: job.description,
      embedding: vectors[k],
    }));
 
    const { error } = await supabase.from("jobs").insert(rows);
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
 
    console.log(`Stored ${Math.min(i + BATCH_SIZE, jobs.length)} / ${jobs.length}`);
    if (i + BATCH_SIZE < jobs.length) await sleep(DELAY_MS);
  }
  console.log("Done.");
}
 
main().catch((err) => {
  console.error(err);
  process.exit(1);
});