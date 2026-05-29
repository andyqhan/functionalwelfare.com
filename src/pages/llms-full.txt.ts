// Static endpoint → /llms-full.txt : the entire paper (body + all appendices)
// in one Markdown file, per the llmstxt.org convention.
import type { APIRoute } from "astro";
import { fullMarkdown } from "../lib/markdown";

export const GET: APIRoute = () =>
  new Response(fullMarkdown(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
