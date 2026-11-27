# Changelog

What changed in the starter, newest first. A site made from it brings these in through its own assistant (`AGENTS.md` § Updating from the starter). Each entry says what changed and where, so an assistant can tell which a site already has.

## 2026-11-27 — The brand check

- `npm run brand-check` (`scripts/brand-check.mjs`): plain Node, nothing to install. It reads `brand/` and fails on a color or a font the kit hasn't got (when `brand/rules.json` has Koati's "only the kit's colors" or "only the kit's type"), on words a word rule rules out in `src/content/pages/`, and on a `src/styles/tokens.css` that says something `brand/tokens.json` doesn't. Each problem has its file and line, and for a color the kit's closest one. `npm test` checks the check.
- `.github/workflows/brand-check.yml` runs it on each pull request that changes `src/` or `brand/`: a few seconds, no install or build, one billed minute on a private repository and none on a public one. Koati reads the result onto the card.
- `AGENTS.md`: run it before you open the pull request.
- `src/layouts/Base.astro`: the button's words are `var(--paper)`, not `white`, so the starter passes its own check.
- To bring it in: copy `scripts/brand-check.mjs`, `scripts/brand-check.test.mjs` and `.github/workflows/brand-check.yml`, add `brand-check` and `test` to `package.json`'s scripts, and take the line from rule 4 and § The brand in `AGENTS.md`. Remove the workflow's `if:` line, which only skips the starter's own repository. If your site shows more fields than `heading`, `lede` and the button label, add them to `FIELDS` at the top of the script.

## 2026-11-27 — The brand as files in the repository

- `brand/DESIGN.md`, `brand/tokens.json` and `brand/rules.json`. The map says where the brand lives and what never to do; the two JSON files are a dated copy of what was approved in Koati, written by your assistant from `get_brand`. An assistant that never calls Koati still finds the brand in the repository.
- `AGENTS.md` § The brand: write all of them, and `src/styles/tokens.css`, on the first pull request and again whenever an approved brand card is left for the assistant.
- To bring it in: copy `brand/`, then have your assistant fill the two JSON files from `get_brand`, keeping your `tokens.css` as it is. Replace § The brand in your `AGENTS.md` with the starter's.

## 2026-11-26 — Koati can read and change the words

- `/.well-known/koati-content.json`, built on every deploy from `src/content/pages/*.md` (`src/pages/.well-known/koati-content.json.ts`, `src/lib/content-manifest.ts`). Version 2 of Koati's format: each page's heading, lede and button label, and the file and frontmatter key the first two live at. With it, Koati reads the site's words and can turn a change somebody approves into a pull request on a `koati/` branch. The button label is nested, so its changes still go to your assistant.
- `data-koati-field` now names the page too: `index.heading`, `index.lede`, `index.cta_label` (was `heading`, `lede`, `cta.label`). Koati reads it as `entry.field`, so the bare names never matched an entry.
- To bring it in: copy both new files, add any of your own frontmatter fields to `FIELDS`, and change each `data-koati-field` to `{field(page, '<slug>')}`. Check that your host serves `/.well-known/koati-content.json` after the deploy.

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
