// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Static output, no adapter, so the same build runs on Cloudflare, Netlify
 * and Vercel. Nothing here needs to run on a request.
 */
export default defineConfig({
    site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
    trailingSlash: 'never',
    build: { format: 'file' },
    devToolbar: { enabled: false },
});
