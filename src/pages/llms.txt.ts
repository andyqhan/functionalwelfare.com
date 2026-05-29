// Static endpoint → /llms.txt : the curated index per llmstxt.org (title,
// summary, links to the per-page .md files and the full dump).
import type { APIRoute } from "astro";
import { llmsTxt } from "../lib/markdown";

export const GET: APIRoute = () =>
  new Response(llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
