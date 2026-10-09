import { readFileSync } from 'node:fs';

/**
 * Koati's one line, and what it needs to know about this build.
 *
 * The snippet is inert for every visitor: it wakes only when somebody on
 * your team opens the site from Koati, or adds #koati to its address. It
 * can't change the site. Set PUBLIC_KOATI_SITE to the `ws_…` your board's
 * Website tab shows, and PUBLIC_KOATI_URL if your Koati isn't koati.app.
 */
const env = (name: string) => (process.env[name] ?? import.meta.env[name] ?? '').toString().trim();

const site = env('PUBLIC_KOATI_SITE');
const app = env('PUBLIC_KOATI_URL') || 'https://koati.app';

/** The commit this build was made from, as each host names it. Koati's Site view uses it to say which pull request is live. */
const build = (env('WORKERS_CI_COMMIT_SHA') || env('CF_PAGES_COMMIT_SHA') || env('VERCEL_GIT_COMMIT_SHA') || env('COMMIT_REF')).toLowerCase();

/** A preview build, as each host says it. Production unless one of them says otherwise. */
const branch = env('WORKERS_CI_BRANCH') || env('CF_PAGES_BRANCH') || env('VERCEL_GIT_COMMIT_REF') || env('BRANCH');
export const isPreview =
    env('VERCEL_ENV') === 'preview' || (env('CONTEXT') !== '' && env('CONTEXT') !== 'production') || (branch !== '' && branch !== (env('PRODUCTION_BRANCH') || 'main'));

export const snippet = site ? { src: `${app}/w.js`, site, build: /^[0-9a-f]{7,40}$/.test(build) ? build : undefined } : null;

/**
 * Where a part's words live, written on the element as data-koati-src so
 * the assistant is handed the file and line a comment is about. Previews by
 * default; KOATI_SOURCE=always writes it on production too.
 */
const writeSource = isPreview || env('KOATI_SOURCE') === 'always' || import.meta.env.DEV;

export function src(entry: { filePath?: string }, key: string): string | undefined {
    if (!writeSource || !entry.filePath) return undefined;

    try {
        const lines = readFileSync(entry.filePath, 'utf8').split('\n');
        const line = lines.findIndex((l) => l.trimStart().startsWith(`${key}:`));
        return `${entry.filePath}:${line >= 0 ? line + 1 : 1}`;
    } catch {
        return entry.filePath;
    }
}
