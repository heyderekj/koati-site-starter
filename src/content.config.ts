import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Every page's words, as a file. Change a heading here, or point at it on the
 * live page from Koati and let your assistant change it here for you.
 */
const pages = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        heading: z.string(),
        lede: z.string(),
        cta: z.object({ label: z.string(), href: z.string() }).optional(),
    }),
});

export const collections = { pages };
