# Changelog

What changed in the starter, newest first. A site made from it brings these in through its own assistant (`AGENTS.md` § Updating from the starter). Each entry says what changed and where, so an assistant can tell which a site already has.

## 2026-10-23 — Parts named by their field

- `data-koati-field` beside `data-koati-src` on the heading, the lede and the call to action (`src/pages/[...slug].astro`): `heading`, `lede`, `cta.label`. Koati names the part from it ("Heading", "CTA label"). Written on production too, since it names a field, never a file.
- To bring it in: add `data-koati-field="<the frontmatter key>"` to each element that already has `data-koati-src`.

## 2026-10-23 — The first one

- Astro site, one Markdown file per page in `src/content/pages/`, with `heading`, `lede` and `cta` in the frontmatter.
- Koati's one line on every page (`src/layouts/Base.astro`, `src/lib/koati.ts`) when `PUBLIC_KOATI_SITE` is set, with `data-build` for the commit it was built from.
- `data-koati-src="file:line"` on the parts people point at.
- The brand's tokens in `src/styles/tokens.css`, written from Koati's `get_brand` on the first pull request.
- Deploy buttons for Cloudflare, Netlify and Vercel (`wrangler.jsonc`, `netlify.toml`).
- MCP setup for Koati and GitHub in `.mcp.json`, `.cursor/mcp.json` and `.vscode/mcp.json`.
- `AGENTS.md`: work only on what's left, pull requests never `main`, hand it back.
