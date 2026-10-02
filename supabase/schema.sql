-- Run this once in the Supabase SQL editor.

create extension if not exists vector;

create table jobs (
  id bigint generated always as identity primary key,
  title text not null,
  company text,
  location text,
  description text not null,
  embedding vector(768)
);

-- Approximate nearest-neighbour index using cosine distance.
create index on jobs using hnsw (embedding vector_cosine_ops);

-- Block public access; the app talks to the database server-side with the secret key.
alter table jobs enable row level security;

-- Returns the jobs whose embeddings are closest to the query embedding.
create or replace function match_jobs(
  query_embedding vector(768),
  match_count int default 10
)
returns table (
  id bigint,
  title text,
  company text,
  location text,
  description text,
  similarity float
)
language sql stable
as $$
  select id, title, company, location, description,
         1 - (embedding <=> query_embedding) as similarity
  from jobs
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
