import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { embedQuery } from "@/lib/gemini";

export async function POST(request: Request) {
  let query = "";
  try {
    const body = await request.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (query.length < 2 || query.length > 200) {
    return NextResponse.json(
      { error: "Search text must be between 2 and 200 characters." },
      { status: 400 }
    );
  }

  try {
    const embedding = await embedQuery(query);

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const { data, error } = await supabase.rpc("match_jobs", {
      query_embedding: embedding,
      match_count: 10,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ results: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
