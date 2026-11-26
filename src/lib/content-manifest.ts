/**
 * The fields of a page Koati can name, and which of them it can write.
 *
 * `key` is the frontmatter key the words live at. Koati writes only a
 * top-level key on one line, so a field inside an object (the button's
 * label) is read but not given a key: a change to it goes to your
 * assistant. A field's slug has no `.` in it; on the page, a part says
 * which it shows as `data-koati-field="<page id>.<slug>"`.
 */
export const FIELDS = [
    { slug: 'heading', name: 'Heading', key: 'heading', read: (d: Data) => d.heading },
    { slug: 'lede', name: 'Lede', key: 'lede', read: (d: Data) => d.lede },
    { slug: 'cta_label', name: 'Button label', key: null, read: (d: Data) => d.cta?.label },
] as const;

type Data = { title: string; heading: string; lede: string; cta?: { label: string; href: string } };
type Field = { slug: string; name: string; key: string | null; read: (d: Data) => string | undefined };
type Page = { id: string; filePath?: string; data: Data };

/** What a part says it shows, for `data-koati-field`. */
export const field = (page: { id: string }, slug: (typeof FIELDS)[number]['slug']) => `${page.id}.${slug}`;

/** The page's path on the site, the way `[...slug].astro` builds it. */
const pathOf = (id: string) => (id === 'index' ? '/' : `/${id}`);

export function manifestFor(pages: Page[], fields: readonly Field[], now: Date) {
    return {
        version: 2,
        generated_at: now.toISOString(),
        collections: [
            {
                id: 'pages',
                name: 'Pages',
                slug: 'pages',
                fields: fields.map((f) => ({ slug: f.slug, name: f.name })),
                entries: pages
                    .slice()
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map((page) => ({
                        id: page.id,
                        slug: page.id,
                        name: page.data.title,
                        url: pathOf(page.id),
                        fields: Object.fromEntries(
                            fields.flatMap((f) => {
                                const text = f.read(page.data);
                                if (typeof text !== 'string') return [];
                                const source = f.key && page.filePath ? { file: page.filePath, key: f.key } : undefined;
                                return [[f.slug, source ? { text, source } : { text }]];
                            }),
                        ),
                    })),
            },
        ],
    };
}
