// Static endpoint → /index.md : the paper body (title, abstract, main sections,
// references) as Markdown for LLM/agent consumption. See src/lib/markdown.ts.
import type { APIRoute } from "astro";
import { bodyMarkdown } from "../lib/markdown";

export const GET: APIRoute = () =>
  new Response(bodyMarkdown(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
