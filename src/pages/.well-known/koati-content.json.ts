import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { FIELDS, manifestFor } from '../../lib/content-manifest';

/**
 * The site's words, as Koati reads them: every page's fields and the file
 * and key each lives at. Written on every build from the same files the
 * pages are built from, so it never says anything the site doesn't.
 *
 * Koati fetches this one file and nothing else. With it, a word changed in
 * Koati becomes a commit to that key on a `koati/` branch and a pull
 * request a person merges. Without it, every change goes to your assistant.
 * The format: Koati's docs/content-view.md § A site you own, version 2.
 */
export const prerender = true;

export const GET: APIRoute = async () => {
    const pages = await getCollection('pages');

    return new Response(JSON.stringify(manifestFor(pages, FIELDS, new Date()), null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
};
