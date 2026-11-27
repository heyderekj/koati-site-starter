# The brand, for whoever is about to change this site

Read this before you write a line of markup or CSS. It's short on purpose: it says where the brand lives and what never to do, and the files beside it hold the values.

## Where things are

- `brand/tokens.json`: the brand's colors and type, each named by the job it does. Agreed in Koati; this is a copy with its date.
- `brand/rules.json`: the rules the words and the look have to pass, each with the sentence a person reads for it.
- `src/styles/tokens.css`: the same colors and type as CSS variables. Every color and font on the site comes from here.

## How to use them

- A color is a variable: `var(--ink)`, `var(--paper)`, `var(--accent)`. Never a hex value in a page or a component.
- A font is `var(--font)`. Never a font family written out.
- Text sits on `--paper`. `--accent` is for the one thing on the page that should be pressed.
- Need a color or a size the tokens don't have? Don't make one up. Say so when you hand the card back, and a person decides whether the brand gets it.

## Never

- A color or font that isn't in `brand/tokens.json`.
- A new kind of button. There is one, `.cta` in `src/pages/[...slug].astro`.
- A word or a length `brand/rules.json` rules out.
- Anything from `pending` in Koati's `get_brand`. Nobody has approved it yet.

## Keeping it current

These files change only when the brand does: a brand card approved in Koati and left for an assistant (`AGENTS.md` § The brand). `agreed` in both JSON files says which approval they were copied from. If Koati's `get_brand` shows a later one, the copy is behind; say so, and don't fix it unless a card asks.
