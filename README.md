# A site you own

A marketing site as files in your own repository, on your own host, changed by the assistant your team already uses — inside your brand's rules. Nothing here needs Koati to run, and every part of it can move somewhere else this afternoon.

## Put it on your host

Each button copies this template into a new repository on your own GitHub and deploys it from there.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/heyderekj/koati-site-starter)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/heyderekj/koati-site-starter)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/heyderekj/koati-site-starter&env=PUBLIC_KOATI_SITE)

Then, on GitHub, protect `main` (Settings → Branches) so changes arrive as pull requests a person merges.

## Connect it to Koati

1. On your board in Koati, open **Website**, add the site's address, and copy the `ws_…` it shows.
2. Set `PUBLIC_KOATI_SITE` to it in your host's environment settings and deploy again. The one line is now on every page — inert for visitors, awake when somebody on your team opens the site from Koati or adds `#koati` to its address.
3. In the site's settings in Koati, **Connect the repository**. Koati hears deploys and pull requests and puts them beside the cards they're for. It can't read or change a file.

## Change it

- **By pointing:** open the live page from Koati, point at a heading, change its words or comment. It lands on a card.
- **By your assistant:** leave the card for it in Koati. It reads `AGENTS.md`, makes the change in `src/content/pages/`, and opens a pull request naming the card. You merge; Koati sees it go live.
- **By hand:** edit `src/content/pages/*.md` and open a pull request.

`npm install`, then `npm run dev` to work on it locally.
