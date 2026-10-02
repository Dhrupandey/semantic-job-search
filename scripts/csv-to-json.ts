// Converts a jobs CSV (e.g. from Kaggle) into data/jobs.json for embed.ts.
//
// Usage:
//   npx tsx scripts/csv-to-json.ts path/to/jobs.csv \
//     --title job_title --company company --location location \
//     --description job_description --limit 400
//
// Use the real column names from your CSV's header row for the flags.
// Requires: npm install -D csv-parse

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse } from "csv-parse/sync";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const input = process.argv[2];
if (!input || input.startsWith("--")) {
  console.error("Usage: npx tsx scripts/csv-to-json.ts <file.csv> --title <col> --description <col> [--company <col>] [--location <col>] [--limit 400] [--out data/jobs.json]");
  process.exit(1);
}

const titleCol = arg("title");
const descCol = arg("description");
const companyCol = arg("company");
const locationCol = arg("location");
const limit = Number(arg("limit") ?? 400);
const out = arg("out") ?? "data/jobs.json";

if (!titleCol || !descCol) {
  console.error("--title and --description are required.");
  process.exit(1);
}

const rows = parse(readFileSync(input, "utf8"), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Record<string, string>[];

console.log(`Read ${rows.length} rows. Columns: ${Object.keys(rows[0] ?? {}).join(", ")}`);
if (process.argv.includes("--shuffle")) {
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
}

for (const col of [titleCol, descCol, companyCol, locationCol]) {
  if (col && !(col in (rows[0] ?? {}))) {
    console.error(`Column "${col}" not found. Check the names above.`);
    process.exit(1);
  }
}

const seen = new Set<string>();
const jobs: {
  title: string;
  company?: string;
  location?: string;
  description: string;
}[] = [];

for (const row of rows) {
  const title = row[titleCol]?.trim();
  const description = row[descCol]?.replace(/\s+/g, " ").trim();
  if (!title || !description || description.length < 100) continue;

  const company = companyCol ? row[companyCol]?.trim() : undefined;
  const key = `${title}|${company ?? ""}|${description.slice(0, 80)}`.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  jobs.push({
    title,
    company: company || undefined,
    location: (locationCol ? row[locationCol]?.trim() : undefined) || undefined,
    description,
  });
  if (jobs.length >= limit) break;
}

mkdirSync("data", { recursive: true });
writeFileSync(out, JSON.stringify(jobs, null, 2));
console.log(`Wrote ${jobs.length} jobs to ${out}`);

// npx tsx scripts/csv-to-json.ts "C:\Users\dpand\Downloads\job_postings.csv" --title title --company company --location location --description job_description --limit 400 --shuffle