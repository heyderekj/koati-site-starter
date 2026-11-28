#!/usr/bin/env node
/**
 * The brand check: does this site keep to the brand in `brand/`?
 *
 * `npm run brand-check`. Plain Node, nothing to install, done in a second, so
 * an assistant runs it before it opens a pull request and the repository's
 * own check runs it on every pull request after (`.github/workflows/brand-check.yml`).
 *
 * It checks what `brand/rules.json` asks for, the rules the team set in Koati:
 *
 * - "Only the kit's colors" (`kit_colours`): every color written in `src/`
 *   is one in `brand/tokens.json`.
 * - "Only the kit's type" (`kit_type`): every font family is one of the kit's.
 * - The word rules (`never`, `max_chars`, `no_exclamation`) on the words in
 *   `src/content/pages/`: the fields a page shows, and its body.
 * - The parts in `brand/parts.json`, when the site lists them: each one's
 *   file is there, and every component in `src/components/` is on the list.
 *
 * Lines at a width, and rules for one element picked on the site, need the
 * page in a browser: Koati checks those on the live page, as it always has.
 * And whatever the rules say, `src/styles/tokens.css` has to carry the same
 * values as `brand/tokens.json`.
 *
 * The word rules read words the way Koati does (`App\Support\BrandRules` in
 * Koati): spaces run together, characters counted one by one, a never-word
 * matched whole and in any case.
 */
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * The fields of a page that show on it, and what kind of part each one is on
 * the live page, so a rule for "Buttons" reaches the button's words here too.
 * The same fields as `FIELDS` in `src/lib/content-manifest.ts`: a new one
 * people will read on the page goes in both.
 */
export const FIELDS = {
    heading: { name: 'Heading', kinds: ['Main heading', 'Heading'] },
    lede: { name: 'Lede', kinds: ['Paragraph'] },
    'cta.label': { name: 'Button label', kinds: ['Button'] },
};

const CODE = new Set(['.astro', '.css', '.scss', '.sass', '.less', '.html', '.svg', '.vue', '.svelte', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.mdx']);
const STYLESHEET = new Set(['.css', '.scss', '.sass', '.less']);
const TOKENS_CSS = 'src/styles/tokens.css';

/** What a part can be written as: a component in `src/components/`. */
const PART = new Set(['.astro', '.tsx', '.jsx', '.vue', '.svelte']);

/** Families that name no typeface: allowed after one of the kit's, as the fallback. */
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong']);
const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar']);
const NOT_A_COLOR = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none']);

/** Properties whose words can be a named color. Hex and rgb() are looked for everywhere. */
const COLOR_PROPERTY = /^(--.*|color|background(-color)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|(box|text)-shadow|text-decoration(-color)?|caret-color|accent-color|column-rule(-color)?|(stop|flood|lighting)-color|scrollbar-color)$/i;

const NAMED = Object.fromEntries(
    (
    'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 ' +
    'blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 ' +
    'chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b ' +
    'darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b darkmagenta:8b008b ' +
    'darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f ' +
    'darkslateblue:483d8b darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 ' +
    'deepskyblue:00bfff dimgray:696969 dimgrey:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 ' +
    'fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f ' +
    'grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa ' +
    'lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff ' +
    'lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a ' +
    'lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 ' +
    'lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd ' +
    'mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a ' +
    'mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 ' +
    'navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 ' +
    'palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f ' +
    'pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 ' +
    'saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d silver:c0c0c0 skyblue:87ceeb ' +
    'slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 ' +
    'thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32'
    )
        .split(' ')
        .map((pair) => pair.split(':')),
);

// ——— Reading the brand

function readJson(root, file, problems) {
    const path = join(root, file);
    if (!existsSync(path)) {
        problems.push({ file, line: 1, what: `${file} isn't here`, why: 'Write it from Koati’s get_brand (AGENTS.md § The brand).' });
        return null;
    }
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
        problems.push({ file, line: 1, what: `${file} isn't JSON a program can read`, why: String(e.message) });
        return null;
    }
}

/** A family as compared: no quotes, one space, any case. */
const family = (name) => name.trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').toLowerCase();

/** A font list split at its commas, leaving commas inside quotes alone. */
function families(list) {
    return (list.match(/"[^"]*"|'[^']*'|[^,]+/g) ?? []).map(family).filter(Boolean);
}

function kitOf(tokens) {
    const colors = (tokens?.colors ?? [])
        .map((c) => ({ ...c, rgb: rgbOf(String(c.hex ?? '')) }))
        .filter((c) => c.rgb);
    const type = new Set((tokens?.type ?? []).flatMap((t) => families(String(t.family ?? ''))));

    return { colors, type };
}

// ——— Colors

/** `#abc`, `#aabbcc`, `#aabbccdd`, `rgb()`, `hsl()` or a named color, as [r, g, b]; null when it can't be read as one. */
export function rgbOf(value) {
    const v = value.trim().toLowerCase();
    let m = v.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
        const h = m[1];
        if (h.length === 3 || h.length === 4) return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16));
        if (h.length === 6 || h.length === 8) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        return null;
    }
    if (NAMED[v]) return rgbOf('#' + NAMED[v]);
    m = v.match(/^rgba?\(([^)]*)\)$/);
    if (m) {
        const parts = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
        if (parts.length < 3) return null;
        return parts.map((p) => Math.round(Math.min(255, Math.max(0, p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p)))));
    }
    m = v.match(/^hsla?\(([^)]*)\)$/);
    if (m) {
        const [h, s, l] = m[1].split(/[\s,/]+/).filter(Boolean).map((p) => parseFloat(p));
        if ([h, s, l].some(Number.isNaN)) return null;
        const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
        const f = (n) => {
            const k = (n + h / 30) % 12;
            return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
        };
        return [f(0), f(8), f(4)];
    }
    return null;
}

const hexOf = (rgb) => '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('');

/** The kit's color nearest by eye: a weighted distance, good enough to say "closest". */
function closest(rgb, colors) {
    const far = ([r1, g1, b1], [r2, g2, b2]) => {
        const r = (r1 + r2) / 2;
        return Math.sqrt((2 + r / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - r) / 256) * (b1 - b2) ** 2);
    };
    return colors.slice().sort((a, b) => far(rgb, a.rgb) - far(rgb, b.rgb))[0];
}

const said = (c) => `${c.name ?? c.role ?? 'a color'} (${String(c.hex).toLowerCase()})${c.token ? `, var(${c.token})` : ''}`;

// ——— Reading files

function walk(dir, root, out = []) {
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path, root, out);
        else if (CODE.has(extname(name).toLowerCase())) out.push(relative(root, path).split(sep).join('/'));
    }
    return out;
}

/** Which line an offset is on, counting from 1. */
function liner(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
    return (offset) => {
        let lo = 0;
        let hi = starts.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (starts[mid] <= offset) lo = mid;
            else hi = mid - 1;
        }
        return lo + 1;
    };
}

/** The same text with these spans blanked out, newlines kept, so offsets and lines still line up. */
const blank = (text) => text.replace(/[^\n]/g, ' ');

/**
 * The parts of a file that are CSS, at their offsets in it: a whole
 * stylesheet, or the `<style>` blocks and `style=""` attributes of a page.
 */
function cssIn(file, text) {
    if (STYLESHEET.has(extname(file).toLowerCase())) return [{ at: 0, css: text }];
    const spans = [];
    for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) spans.push({ at: m.index + m[0].indexOf(m[1]), css: m[1] });
    for (const m of text.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi)) spans.push({ at: m.index + m[0].indexOf(m[2]), css: m[2] });
    return spans;
}

/** Every `property: value` in some CSS, comments and strings left out. */
function* declarations(css) {
    const clean = css
        .replace(/\/\*[\s\S]*?\*\//g, blank)
        .replace(/url\([^)]*\)/gi, blank);
    for (const m of clean.matchAll(/(?<![\w-])(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+?)\s*(?=[;}]|$)/gi)) {
        yield { property: m[1].toLowerCase(), value: m[2], at: m.index + m[0].indexOf(m[2], m[1].length) };
    }
}

/** The colors written in one CSS value, each with its offset in the value. */
function* colorsIn(property, value) {
    const v = value.replace(/(["'])(?:(?!\1).)*\1/g, blank);
    for (const m of v.matchAll(/#[0-9a-f]{3,8}(?![\w-])/gi)) yield { written: m[0], at: m.index };
    for (const m of v.matchAll(/(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi)) yield { written: m[0], at: m.index };
    if (COLOR_PROPERTY.test(property)) {
        for (const m of v.matchAll(/(?<![\w-])[a-z]+(?![\w(-])/gi)) {
            if (NAMED[m[0].toLowerCase()]) yield { written: m[0], at: m.index };
        }
    }
}

/** The family list of a `font` shorthand: whatever follows its size. */
function shorthandFamilies(value) {
    const parts = value.match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];
    const size = /^([\d.]+(px|r?em|%|pt|pc|vw|vh|vmin|vmax|ch|ex|cap|lh|q|mm|cm|in)|(xx?-|xxx-)?(small|large)|medium|smaller|larger)(\/\S+)?$/i;
    let last = -1;
    parts.forEach((p, i) => {
        if (size.test(p)) last = i;
    });
    return last >= 0 && last < parts.length - 1 ? parts.slice(last + 1).join(' ').replace(/^\/\s*\S+\s*/, '') : null;
}

// ——— The words on the pages

/**
 * The frontmatter of a page, as `key` or `parent.key` to its words and line.
 * Enough YAML for a page: keys, one level of nesting, quoted words and
 * `|` or `>` blocks. Lists are left out; nothing a page shows is one.
 */
export function frontmatter(text) {
    const lines = text.split('\n');
    if (lines[0].trim() !== '---') return { fields: {}, bodyFrom: 0 };
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (end < 0) return { fields: {}, bodyFrom: 0 };

    const fields = {};
    const parents = [];
    for (let i = 1; i < end; i++) {
        const m = lines[i].match(/^(\s*)([\w-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const indent = m[1].length;
        while (parents.length && parents[parents.length - 1].indent >= indent) parents.pop();
        const key = [...parents.map((p) => p.key), m[2]].join('.');
        let raw = m[3];

        if (raw === '' || raw.startsWith('#')) {
            parents.push({ indent, key: m[2] });
            continue;
        }
        if (/^[|>][-+]?$/.test(raw.trim())) {
            const block = [];
            while (i + 1 < end && (lines[i + 1].trim() === '' || lines[i + 1].match(/^\s*/)[0].length > indent)) block.push(lines[++i].trim());
            fields[key] = { text: raw.startsWith('>') ? block.join(' ') : block.join('\n'), line: i - block.length + 1 };
            continue;
        }
        if (raw.startsWith('"')) raw = raw.replace(/^"((?:[^"\\]|\\.)*)".*$/, (_, s) => JSON.parse(`"${s}"`));
        else if (raw.startsWith("'")) raw = raw.replace(/^'((?:[^']|'')*)'.*$/, (_, s) => s.replace(/''/g, "'"));
        else raw = raw.replace(/\s+#.*$/, '');
        fields[key] = { text: raw, line: i + 1 };
    }
    return { fields, bodyFrom: end + 1 };
}

/** A page's body as the parts a reader sees: headings, list items, paragraphs. */
export function bodyParts(lines, from) {
    const parts = [];
    let para = null;
    let fenced = false;
    const plain = (s) =>
        s
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/[*_`~]+/g, '')
            .replace(/<[^>]+>/g, '');
    const close = () => {
        if (para) parts.push({ ...para, text: plain(para.text) });
        para = null;
    };

    for (let i = from; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*(```|~~~)/.test(line)) {
            close();
            fenced = !fenced;
            continue;
        }
        if (fenced) continue;
        let m;
        if (line.trim() === '' || /^\s*</.test(line)) close();
        else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
            close();
            parts.push({ text: plain(m[2]), line: i + 1, kinds: m[1] === '#' ? ['Main heading', 'Heading'] : ['Heading'], what: 'a heading' });
        } else if ((m = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/))) {
            close();
            parts.push({ text: plain(m[1]), line: i + 1, kinds: ['List item'], what: 'a list item' });
        } else if (para) para.text += ' ' + line.trim();
        else para = { text: line.trim(), line: i + 1, kinds: ['Paragraph'], what: 'a paragraph' };
    }
    close();
    return parts;
}

/** Words cut to fit on one line of the report. */
const clip = (s, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Which of these word rules the words break, the way Koati judges them. */
export function breaks(rules, words) {
    const w = words.replace(/\s+/gu, ' ').trim();
    const found = [];
    for (const r of rules) {
        let detail = null;
        if (r.kind === 'max_chars' && [...w].length > Number(r.value)) detail = `${[...w].length} characters`;
        if (r.kind === 'no_exclamation' && w.includes('!')) detail = 'has an exclamation point';
        if (r.kind === 'never') {
            const word = (r.words ?? []).find((n) => n && new RegExp(`(?<![\\p{L}\\p{N}])${escape(n)}(?![\\p{L}\\p{N}])`, 'iu').test(w));
            if (word) detail = `uses “${word}”`;
        }
        if (detail) found.push({ rule: r, detail });
    }
    return found;
}

/** Whether a rule reaches a part of this kind, the way it does on the live page. */
function reaches(rule, kinds) {
    if ((rule.reach ?? 'all') === 'all') return true;
    return rule.reach === 'kind' && kinds.includes(rule.element_kind);
}

// ——— The check

/**
 * @returns {{agreed: string|null, problems: Array<{file: string, line: number, what: string, why: string}>, notes: Array<{file: string, line: number, what: string, why: string}>, passed: string[], live: number}}
 */
export function checkRepository(root) {
    const problems = [];
    const notes = [];
    const passed = [];

    const tokens = readJson(root, 'brand/tokens.json', problems);
    const ruleFile = readJson(root, 'brand/rules.json', problems);
    if (!tokens || !ruleFile) return { agreed: null, problems, notes, passed, live: 0 };

    const kit = kitOf(tokens);
    const rules = Array.isArray(ruleFile.rules) ? ruleFile.rules : [];
    const colorsRule = rules.find((r) => r.kind === 'kit_colours');
    const typeRule = rules.find((r) => r.kind === 'kit_type');
    const wordRules = rules.filter((r) => ['never', 'max_chars', 'no_exclamation'].includes(r.kind) && (r.reach ?? 'all') !== 'element');
    const live = rules.filter((r) => r.kind === 'max_lines' || ((r.reach ?? 'all') === 'element' && !['kit_colours', 'kit_type'].includes(r.kind))).length;

    // tokens.css carries the same values as tokens.json, whatever the rules.
    const cssPath = join(root, TOKENS_CSS);
    if (existsSync(cssPath)) {
        const css = readFileSync(cssPath, 'utf8');
        const line = liner(css);
        const before = problems.length;
        for (const t of [...(tokens.colors ?? []), ...(tokens.type ?? [])]) {
            if (!t.token) continue;
            const m = css.match(new RegExp(`${escape(t.token)}\\s*:\\s*([^;]+);`));
            const want = t.hex ?? t.family;
            if (!m) {
                problems.push({ file: TOKENS_CSS, line: 1, what: `${t.token} isn't in ${TOKENS_CSS}`, why: `brand/tokens.json has it as ${want}. Write both from get_brand.` });
                continue;
            }
            const same = t.hex ? String(rgbOf(m[1]) ?? '') === String(rgbOf(String(t.hex)) ?? 'x') : families(m[1]).join(',') === families(String(t.family)).join(',');
            if (!same) {
                problems.push({ file: TOKENS_CSS, line: line(m.index), what: `${t.token}: ${m[1].trim()}`, why: `brand/tokens.json says ${want}. The two are written together from get_brand.` });
            }
        }
        if (problems.length === before) passed.push(`${TOKENS_CSS} carries the same values as brand/tokens.json`);
    } else {
        problems.push({ file: TOKENS_CSS, line: 1, what: `${TOKENS_CSS} isn't here`, why: 'Every color and font on the site comes from it (brand/DESIGN.md).' });
    }

    const files = walk(join(root, 'src'), root).filter((f) => f !== TOKENS_CSS);
    const colorProblems = [];
    const typeProblems = [];

    for (const file of files) {
        const text = readFileSync(join(root, file), 'utf8');
        const line = liner(text);
        const ext = extname(file).toLowerCase();
        if (ext === '.md' || ext === '.mdx') continue;

        const spans = cssIn(file, text);
        for (const { at, css } of spans) {
            for (const d of declarations(css)) {
                if (colorsRule) {
                    for (const c of colorsIn(d.property, d.value)) {
                        const where = at + d.at + c.at;
                        const rgb = rgbOf(c.written);
                        const kitColor = rgb && kit.colors.find((k) => String(k.rgb) === String(rgb));
                        const what = `${d.property}: ${clip(d.value.trim())}`;
                        if (kitColor) {
                            notes.push({ file, line: line(where), what, why: `${c.written} is ${said(kitColor)}. Write the variable, so a new kit reaches it.` });
                        } else {
                            const near = rgb && closest(rgb, kit.colors);
                            colorProblems.push({
                                file,
                                line: line(where),
                                what,
                                why: `${c.written} isn't one of the kit's colors.${near ? ` Closest: ${said(near)}.` : ' Use one of brand/tokens.json.'}`,
                            });
                        }
                    }
                }
                if (typeRule && (d.property === 'font-family' || d.property === 'font')) {
                    const list = d.property === 'font' ? shorthandFamilies(d.value) : d.value;
                    if (list && !/var\(/i.test(list) && !KEYWORDS.has(family(list))) {
                        const bad = offKit(families(list), kit.type);
                        if (bad) typeProblems.push({ file, line: line(at + d.at), what: `${d.property}: ${clip(d.value.trim())}`, why: bad });
                    }
                }
            }
        }

        // Outside the CSS: a color or a font written into a script or an attribute.
        let rest = text;
        for (const { at, css } of spans) rest = rest.slice(0, at) + blank(css) + rest.slice(at + css.length);
        if (colorsRule) {
            for (const m of rest.matchAll(/(?<![\w-])(fill|stroke|color|stop-color|bgcolor)\s*=\s*(["'])([^"']+)\2/gi)) {
                const rgb = rgbOf(m[3]);
                if (rgb && !kit.colors.some((k) => String(k.rgb) === String(rgb))) {
                    const near = closest(rgb, kit.colors);
                    colorProblems.push({ file, line: line(m.index), what: `${m[1]}="${m[3]}"`, why: `Not one of the kit's colors.${near ? ` Closest: ${said(near)}.` : ''}` });
                }
            }
            for (const m of rest.matchAll(/(["'`])(#[0-9a-f]{6}|#[0-9a-f]{3}|#[0-9a-f]{8}|(?:rgba?|hsla?)\([^)"'`]*\))\1/gi)) {
                const rgb = rgbOf(m[2]);
                if (rgb && !kit.colors.some((k) => String(k.rgb) === String(rgb))) {
                    const near = closest(rgb, kit.colors);
                    colorProblems.push({ file, line: line(m.index), what: m[0], why: `Not one of the kit's colors.${near ? ` Closest: ${said(near)}.` : ''}` });
                }
            }
        }
        if (typeRule) {
            for (const m of rest.matchAll(/fontFamily\s*[:=]\s*(["'`])([^"'`]+)\1/g)) {
                const bad = !/var\(/i.test(m[2]) && offKit(families(m[2]), kit.type);
                if (bad) typeProblems.push({ file, line: line(m.index), what: m[0], why: bad });
            }
            for (const m of text.matchAll(/fonts\.(?:googleapis\.com|bunny\.net)\/css2?\?([^"'`)\s>]+)/g)) {
                const asked = m[1]
                    .split('&')
                    .filter((p) => p.startsWith('family='))
                    .flatMap((p) => decodeURIComponent(p.slice(7).replace(/\+/g, ' ')).split('|'))
                    .map((f) => f.split(':')[0].trim());
                for (const f of asked.filter((f) => !kit.type.has(family(f)))) {
                    typeProblems.push({ file, line: line(m.index), what: `Loads ${f}`, why: `Not one of the kit's typefaces (${[...kit.type].join(', ') || 'none'}).` });
                }
            }
        }
    }

    problems.push(...colorProblems, ...typeProblems);
    if (colorsRule && colorProblems.length === 0) passed.push(`Colors: only the kit's (${kit.colors.map((c) => c.name ?? c.hex).join(', ')})`);
    if (typeRule && typeProblems.length === 0) passed.push(`Type: only the kit's (${[...kit.type].join(', ')})`);

    // The parts: each listed one where the list says, and no component the list doesn't name.
    if (existsSync(join(root, 'brand/parts.json'))) {
        const partFile = readJson(root, 'brand/parts.json', problems);
        const parts = Array.isArray(partFile?.parts) ? partFile.parts.filter((p) => p && typeof p.file === 'string') : null;
        if (partFile && !parts) {
            problems.push({ file: 'brand/parts.json', line: 1, what: 'No list of parts', why: 'It holds "parts": a list, each with its name, file and when to use it.' });
        }
        if (parts) {
            const before = problems.length;
            const listed = new Set(parts.map((p) => p.file.replace(/^\.\//, '')));
            for (const p of parts.filter((p) => !existsSync(join(root, p.file)))) {
                problems.push({ file: 'brand/parts.json', line: 1, what: `${p.name ?? 'A part'}: ${p.file}`, why: "That file isn't here. Fix its path, or take the part off the list." });
            }
            for (const file of walk(join(root, 'src/components'), root).filter((f) => PART.has(extname(f).toLowerCase()) && !listed.has(f))) {
                problems.push({ file, line: 1, what: 'A part brand/parts.json doesn’t name', why: 'Build from a part on the list, or add this one to brand/parts.json with when to use it, so a person can say yes to it.' });
            }
            if (problems.length === before) passed.push(`Parts: ${parts.length}, each where brand/parts.json says`);
        }
    }

    // The words on each page.
    const pages = walk(join(root, 'src/content/pages'), root).filter((f) => /\.mdx?$/.test(f));
    const wordsBefore = problems.length;
    if (wordRules.length) {
        for (const file of pages) {
            const text = readFileSync(join(root, file), 'utf8');
            const { fields, bodyFrom } = frontmatter(text);
            const parts = [
                ...Object.entries(FIELDS).flatMap(([key, f]) => (fields[key] ? [{ ...fields[key], kinds: f.kinds, what: f.name }] : [])),
                ...bodyParts(text.split('\n'), bodyFrom),
            ];
            for (const part of parts) {
                for (const { rule, detail } of breaks(wordRules.filter((r) => reaches(r, part.kinds)), part.text)) {
                    problems.push({ file, line: part.line, what: `${part.what}: “${clip(part.text)}”`, why: `${detail[0].toUpperCase()}${detail.slice(1)}. ${rule.says ?? rule.kind}.` });
                }
            }
        }
        if (problems.length === wordsBefore) passed.push(`Words: ${wordRules.length} ${wordRules.length === 1 ? 'rule' : 'rules'} on ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`);
    }

    return { agreed: tokens.agreed ?? ruleFile.agreed ?? null, problems, notes, passed, live, rules: rules.length };
}

/** Why a font list isn't the kit's, or null when it is. */
function offKit(list, kitType) {
    if (!list.length) return null;
    const [first, ...rest] = list;
    if (!kitType.has(first)) return `${first} isn't one of the kit's typefaces (${[...kitType].join(', ') || 'none'}).`;
    const other = rest.find((f) => !GENERIC.has(f) && !kitType.has(f));
    return other ? `${other} isn't one of the kit's typefaces (${[...kitType].join(', ')}).` : null;
}

// ——— Saying it

function report(result, { actions = false } = {}) {
    const out = [];
    const { agreed, problems, notes, passed, live, rules } = result;

    out.push(agreed ? `Read brand/: agreed in Koati ${agreed}` : 'Read brand/: the starter’s own, not copied from Koati yet');
    if (!rules) out.push('No rules in brand/rules.json. Set them on Brand in Koati, then copy them here from get_brand.');
    out.push('');
    for (const p of problems) out.push(`✕ ${p.file}:${p.line}`, `  ${p.what}`, `  ${p.why}`, '');
    for (const p of passed) out.push(`✓ ${p}`);
    if (live) out.push(`· ${live} ${live === 1 ? 'rule needs' : 'rules need'} the page in a browser (lines at a width, one element): Koati checks ${live === 1 ? 'it' : 'them'} on the live page.`);
    if (notes.length) {
        out.push('', 'Worth a look:');
        for (const n of notes) out.push(`· ${n.file}:${n.line}  ${n.what}. ${n.why}`);
    }
    out.push('', problems.length ? `${problems.length} to fix.` : 'Keeps to the brand.');

    if (actions) {
        const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
        const prop = (s) => esc(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
        for (const p of problems) console.log(`::error file=${prop(p.file)},line=${p.line},title=${prop('Brand check')}::${esc(`${p.what}. ${p.why}`)}`);
        for (const n of notes) console.log(`::notice file=${prop(n.file)},line=${n.line},title=${prop('Brand check')}::${esc(`${n.what}. ${n.why}`)}`);
    }
    return out.join('\n');
}

function summary(result) {
    const { problems, passed } = result;
    const lines = [`### Brand check: ${problems.length ? `${problems.length} to fix` : 'keeps to the brand'}`, ''];
    for (const p of problems) lines.push(`- ✕ \`${p.file}:${p.line}\` ${p.what.replace(/\|/g, '\\|')}. ${p.why}`);
    for (const p of passed) lines.push(`- ✓ ${p}`);
    return lines.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const root = process.argv[2] ?? join(fileURLToPath(new URL('.', import.meta.url)), '..');
    const result = checkRepository(root);
    const actions = process.env.GITHUB_ACTIONS === 'true';
    console.log(report(result, { actions }));
    if (actions && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(result));
    process.exitCode = result.problems.length ? 1 : 0;
}
