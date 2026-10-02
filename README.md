# Semantic Job Search

Search job postings by meaning instead of exact keywords. Describe the kind of work you want in plain language and the app returns the closest matching jobs.

**Live demo:** (https://semantic-job-search-beta.vercel.app/)

## How it works

1. Each job posting (title, company, location, description) is turned into a 768-dimensional embedding with Google's `gemini-embedding-001` model and stored in a Supabase Postgres table using the `pgvector` extension.
2. When you search, the query is embedded with the same model.
3. A Postgres function, `match_jobs`, ranks jobs by cosine distance to the query embedding and returns the closest ones. An HNSW index keeps the lookup fast.
4. A Next.js API route (`/api/search`) handles the request on the server, so the Gemini and Supabase secrets never reach the browser.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Supabase Postgres with `pgvector`
- Google Gemini embeddings (`gemini-embedding-001`, 768 dimensions)
- Deployed on Vercel

## Data

The live demo searches a random sample of 400 job postings from Indeed Job Postings
 by Spandana Kalakonda, published on Kaggle: https://www.kaggle.com/datasets/spandanakalakonda/job-postings. The dataset page does not state a license, so the data is used for demonstration only and is shown as short snippets. It is not included in this repository, and I will remove the demo data on request.

`data/sample-jobs.json` contains six made-up jobs that are only for testing the pipeline.

## Run it yourself

1. Install dependencies: `npm install`
2. Create a Supabase project, open the SQL editor, and run `supabase/schema.sql`.
3. Create `.env.local` in the project root:
```
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_secret_key
```
   The Supabase key has full database access. Keep it server-side and never commit it.
4. Load the six test jobs: `npx tsx --env-file=.env.local scripts/embed.ts`
5. Or load your own data. Download a jobs CSV, convert it, then embed it:
```
   npx tsx scripts/csv-to-json.ts path/to/jobs.csv --title <col> --company <col> --location <col> --description <col> --limit 400 --shuffle
   npx tsx --env-file=.env.local scripts/embed.ts data/jobs.json
```
   The embed script pauses between batches to stay within API rate limits.
6. Start the app: `npm run dev` and open http://localhost:3000

## Project structure

```
app/page.tsx              Search page
app/api/search/route.ts   Search API: embeds the query and calls match_jobs
lib/gemini.ts             Query embedding helper
scripts/embed.ts          Embeds jobs and loads them into Supabase
scripts/csv-to-json.ts    Converts a jobs CSV into the format embed.ts reads
supabase/schema.sql       Table, index and match_jobs function
```

## Limitations

- The search endpoint is public and only limits query length. There is no authentication or per-user rate limiting.
- Results depend on the 400-job sample, so coverage of any one industry is limited.
- Search is purely semantic. There are no filters for location, salary or experience yet.

