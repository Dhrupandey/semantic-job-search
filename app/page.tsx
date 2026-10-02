"use client";

import { useState } from "react";

type Job = {
  id: number;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  similarity: number;
};

const EXAMPLES = [
  "someone to build REST APIs and tune databases",
  "turn data into dashboards for managers",
  "train deep learning models",
  "help companies hire engineers",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(text: string) {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Semantic Job Search</h1>
        <p className="mt-2 text-neutral-600">
          Describe the kind of work you want. Results are matched by meaning,
          not just keywords.
        </p>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. build APIs and optimise databases"
            maxLength={200}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                search(ex);
              }}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-700 hover:border-neutral-900"
            >
              {ex}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-red-600">{error}</p>}

        {results && results.length === 0 && (
          <p className="mt-6 text-neutral-600">No results found.</p>
        )}

        <ul className="mt-6 space-y-3">
          {results?.map((job) => (
            <li
              key={job.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium">{job.title}</h2>
                  <p className="text-sm text-neutral-600">
                    {[job.company, job.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  title="Cosine similarity between the query and this job"
                  className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                >
                  {job.similarity.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                {job.description.length > 220
                  ? job.description.slice(0, 220) + "..."
                  : job.description}
              </p>
            </li>
          ))}
        </ul>
           <p className="mt-8 text-xs text-neutral-500">
     Demo data: a random sample of 400 job postings from a public Kaggle
     dataset, shown as short snippets for demonstration only.
   </p>
      </div>
    </main>
  );
}
