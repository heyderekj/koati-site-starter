// `npm test`: the brand check against small sites made for each case.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { breaks, checkRepository, frontmatter, rgbOf } from './brand-check.mjs';

const starter = fileURLToPath(new URL('..', import.meta.url));
const made = [];
after(() => made.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const RULES = [
    { id: 'colours', kind: 'kit_colours', reach: 'all', says: "The site: only the kit's colors" },
    { id: 'type', kind: 'kit_type', reach: 'all', says: "The site: only the kit's type" },
    { id: 'never', kind: 'never', words: ['artisanal'], reach: 'all', says: 'All copy: never “artisanal”' },
    { id: 'buttons', kind: 'max_chars', value: 20, reach: 'kind', element_kind: 'Button', says: 'Buttons: at most 20 characters' },
    { id: 'bang', kind: 'no_exclamation', reach: 'all', says: 'All copy: no exclamation points' },
    { id: 'lines', kind: 'max_lines', value: 2, width: 'phone', reach: 'kind', element_kind: 'Heading', says: 'Headings: at most 2 lines at phone width' },
];

/** The starter, with these files written over it. */
function site(files = {}, rules = RULES) {
    const dir = mkdtempSync(join(tmpdir(), 'brand-check-'));
    made.push(dir);
    cpSync(starter, dir, { recursive: true, filter: (src) => !/node_modules|\.git$|[\\/]dist/.test(src) });
    writeFileSync(join(dir, 'brand/rules.json'), JSON.stringify({ agreed: '2026-11-27', rules }));
    for (const [file, text] of Object.entries(files)) writeFileSync(join(dir, file), text);
    return checkRepository(dir);
}

const whats = (result) => result.problems.map((p) => `${p.file}:${p.line} ${p.what}`);

test('the starter keeps to its own brand, with every rule on', () => {
    const result = site();
    assert.deepEqual(whats(result), []);
    assert.equal(result.live, 1, 'the line rule is left to the live page');
});

test('a color the kit has not got fails, with the closest one named', () => {
    const result = site({
        'src/layouts/Hero.astro': ['---', "const shade = '#e85d2a';", '---', '<style>', '  .hero { color: #E85D2A; background: var(--paper); }', '  .rule { border: 1px solid tomato; }', '</style>', '<p style="color: rgb(22 32 27)">ok</p>', ''].join('\n'),
    });
    assert.deepEqual(whats(result), [
        'src/layouts/Hero.astro:5 color: #E85D2A',
        'src/layouts/Hero.astro:6 border: 1px solid tomato',
        "src/layouts/Hero.astro:2 '#e85d2a'",
    ]);
    assert.match(result.problems[0].why, /Closest: Accent \(#e8572a\), var\(--accent\)/);
    assert.deepEqual(result.notes.map((n) => `${n.line} ${n.what}`), ['8 color: rgb(22 32 27)'], 'a kit color written out is worth a look, not a failure');
});

test('without the rule, colors and type are not checked', () => {
    const result = site({ 'src/styles/extra.css': 'a { color: hotpink; font-family: "Comic Sans MS"; }\n' }, RULES.filter((r) => !r.kind.startsWith('kit_')));
    assert.deepEqual(whats(result), []);
});

test('a typeface the kit has not got fails; the kit’s with a fallback passes', () => {
    const result = site({
        'src/styles/extra.css': [
            'h2 { font-family: system-ui, sans-serif; }',
            'h3 { font-family: "Comic Sans MS", cursive; }',
            'code { font: 600 0.9rem/1.4 monospace; }',
            'p { font-family: var(--font); font: inherit; }',
            '@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600&display=swap");',
            '',
        ].join('\n'),
    });
    assert.deepEqual(whats(result), [
        'src/styles/extra.css:2 font-family: "Comic Sans MS", cursive',
        'src/styles/extra.css:3 font: 600 0.9rem/1.4 monospace',
        'src/styles/extra.css:5 Loads Bricolage Grotesque',
    ]);

    const loaded = site({ 'src/layouts/Fonts.astro': '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Bricolage+Grotesque" rel="stylesheet" />\n' });
    assert.deepEqual(whats(loaded), ['src/layouts/Fonts.astro:1 Loads Inter', 'src/layouts/Fonts.astro:1 Loads Bricolage Grotesque']);
});

test('the words on a page, by the part they are', () => {
    const page = ['---', 'title: Weekend box', 'description: Boxes!', 'heading: "Fresh, every weekend"', 'lede: >', '  Fruit and bread', '  from people nearby.', 'cta:', '    label: Order your artisanal weekend box', '    href: /order', '---', '', '# Why it works!', '', 'We bake it', 'on Friday.', '', '- Artisanal loaves', ''].join('\n');
    const result = site({ 'src/content/pages/index.md': page });
    assert.deepEqual(
        result.problems.map((p) => `${p.line} ${p.what} | ${p.why}`),
        [
            '9 Button label: “Order your artisanal weekend box” | Uses “artisanal”. All copy: never “artisanal”.',
            '9 Button label: “Order your artisanal weekend box” | 32 characters. Buttons: at most 20 characters.',
            '13 a heading: “Why it works!” | Has an exclamation point. All copy: no exclamation points.',
            '18 a list item: “Artisanal loaves” | Uses “artisanal”. All copy: never “artisanal”.',
        ],
        'the description is not on the page, and the button rule reaches only the button',
    );
});

test('tokens.css has to say what tokens.json says', () => {
    const result = site({ 'src/styles/tokens.css': ':root {\n    --ink: #16201b;\n    --paper: #ffffff;\n    --font: Georgia, serif;\n}\n' });
    assert.deepEqual(whats(result), ['src/styles/tokens.css:3 --paper: #ffffff', 'src/styles/tokens.css:1 --accent isn\'t in src/styles/tokens.css', 'src/styles/tokens.css:4 --font: Georgia, serif']);
});

test('words are judged the way Koati judges them', () => {
    const never = { kind: 'never', words: ['synergy', 'e-cargo solution'] };
    assert.equal(breaks([never], 'Real Synergy here').length, 1);
    assert.equal(breaks([never], 'Synergystic is not the word').length, 0);
    assert.equal(breaks([never], 'Our e-cargo solution').length, 1);
    assert.equal(breaks([{ kind: 'max_chars', value: 20 }], 'Haul more.   Drive less.').length, 1);
    assert.equal(breaks([{ kind: 'max_chars', value: 20 }], ' Haul more. ').length, 0);
    assert.equal(breaks([{ kind: 'no_exclamation' }], 'Ride today!').length, 1);
});

test('colors read the way a browser reads them', () => {
    assert.deepEqual(rgbOf('#E8572A'), [232, 87, 42]);
    assert.deepEqual(rgbOf('#fff'), [255, 255, 255]);
    assert.deepEqual(rgbOf('White'), [255, 255, 255]);
    assert.deepEqual(rgbOf('rgba(232, 87, 42, 0.5)'), [232, 87, 42]);
    assert.deepEqual(rgbOf('hsl(0 100% 50%)'), [255, 0, 0]);
    assert.equal(rgbOf('oklch(70% 0.1 30)'), null);
});

test('frontmatter, with quotes and nesting', () => {
    const { fields } = frontmatter(['---', "heading: 'It''s here' # a comment", 'cta:', '  label: "Say \\"hi\\""', 'plain: words # gone', '---'].join('\n'));
    assert.deepEqual(fields, { heading: { text: "It's here", line: 2 }, 'cta.label': { text: 'Say "hi"', line: 4 }, plain: { text: 'words', line: 5 } });
});
