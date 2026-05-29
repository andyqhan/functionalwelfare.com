// Static endpoint → /appendix/<x>.md : one appendix as a standalone Markdown
// document. Mirrors the page routes in [slug].astro.
import type { APIRoute, GetStaticPaths } from "astro";
import { appendixSummaries, appendixParam } from "../../lib/ir";
import { appendixMarkdown } from "../../lib/markdown";

export const getStaticPaths: GetStaticPaths = () =>
  appendixSummaries().map((s) => ({
    params: { slug: appendixParam(s.slug) },
    props: { unitSlug: s.slug },
  }));

export const GET: APIRoute = ({ props }) =>
  new Response(appendixMarkdown((props as { unitSlug: string }).unitSlug), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
