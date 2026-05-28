// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Custom domain (CNAME) — adjust if deploying under a subpath.
  site: "https://functionalwelfare.com",
  trailingSlash: "ignore",
  build: {
    // Emit /appendix/a/index.html style paths for clean URLs.
    format: "directory",
  },
});
