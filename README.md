# Genesyx Shopify store

This repository holds the code for the Genesyx online shop (genesyx.co.uk). It keeps these things together:

- the **Shopify theme**, which is the code that controls how the shop looks,
- a few **helper scripts** for jobs outside the theme, such as downloading the store's images and fixing page titles for search engines,
- a dated copy of the shop's content (`content/`), and
- the handover notes (`docs/`).

Store details: Shopify store handle `genesyx1`, admin name `trygenesyx`.

New here? Start with [docs/HANDOVER.md](docs/HANDOVER.md).

## What is in here

| Path | What it is |
| --- | --- |
| `theme/` | The Shopify theme code. This is the part that matters most. It has the usual Shopify folders: `assets`, `blocks`, `config`, `layout`, `locales`, `sections`, `snippets` and `templates`. |
| `export-files.ts` | Downloads the images, videos and other uploaded files (such as PDFs) from the store into an `exports/` folder on your computer. It normally asks Shopify for the list of files. It can read the saved list `files-genesyx1.json` instead, but only when started with the extra option `--from files-genesyx1.json`, which none of the six scripts below uses. |
| `apply-seo-fixes.ts` | Plans, and when asked applies, search-engine fixes to store pages (page titles, descriptions, small wording fixes and redirects). Applying also unpublishes (hides) six old pages; they are listed in the file. It only shows a plan unless you tell it to apply. Applying writes to the live store. |
| `files-genesyx1.json` | A saved list of the files in the store, used by `export-files.ts`. |
| `GEO-THEME-PASTE.md` | Ready-to-paste code snippets for the theme editor that help search engines and AI assistants understand the site. |
| `export-content.ts` | Reads the shop's content and saves a copy in `content/`. It only reads; it never changes the store. With the option `--public-only` it reads only the public website and needs no token. Without it, it reads everything through the Admin API and needs a token. |
| `content/` | A dated copy (13 October 2026) of the shop's pages, products, collections, menus, redirects and privacy policy, plus a list of its blog articles. See `content/README.md`. |
| `docs/` | Handover notes (`HANDOVER.md`) and the search and AI visibility checklist. |
| `package.json` | Lists the six scripts below. |

The six scripts (run with `npm run <name>`):

- `export` downloads all the store's files.
- `export:images` downloads images only.
- `export:content` saves a copy of the shop's pages, products, collections, menus and redirects (plus blogs and policies) in `content/`. It needs an Admin API token. It only reads from Shopify and changes nothing.
- `export:content:public` refreshes the pages, products, collections and privacy policy in `content/` from the public website. It needs no token. It cannot refresh the menus, redirects or blogs, or see unpublished pages. It only reads and changes nothing.
- `seo:plan` shows what `apply-seo-fixes.ts` would change, without changing anything.
- `seo:apply` makes those changes in the live store. This includes unpublishing (hiding) six old pages.

Because `seo:apply` changes the live shop, it should only be run by someone who has read the plan from `seo:plan` first.

Before using any of them, run `npm install` once in the top folder of the repository. None of the scripts will work without it.

To use them (all except `export:content:public`), copy `.env.example` to `.env` and fill it in. Never commit `.env`: it is kept out of the repository on purpose.

## What is not in this repository

- This repository has the shop's theme (its design and code) and, in `content/`, a dated copy of the shop's content taken on 13 October 2026: the 24 published pages (text for the 11 that have any), a list of all 30 pages, the menus, the redirects, the blog (titles only), the 3 products, the 2 collections and the privacy policy. The `content/README.md` file says where each part came from and what is missing, such as the text of the 6 unpublished pages and 5 unpublished blog articles. Shopify remains the source of truth, and the content is managed in the Shopify admin. Not in the repository at all: uploaded images and videos (`export-files.ts` can download them), store settings, installed apps, customers and orders.
- The guides website, www.genesyx.life, is a separate project with its own repository: `FORZA-Industries/genesyx_astro`. It is built with Astro and published through Vercel.
- The quiz shown on the shop's "Personalise Your Conception Journey" page is a separate app, hosted at `trygenesyx.lovable.app`. It is embedded in that page. Its code is not here.
- The Genesyx mobile apps (iPhone and Android) are separate projects and are not in this repository.

## Branches

- **`main`** is the project branch. Its `theme/` folder should mirror the theme that is published on the shop.
- **`shopify-live`** is a generated copy of `theme/` with the theme files at the very top level, which is the layout Shopify's GitHub connection needs. Do not edit it by hand: it is rebuilt from `main`.
- **Feature branches** change `theme/` and reach `main` through a pull request. Merge them with a **merge commit, not "squash"**. Squashing rewrites the history, which stops the generated `shopify-live` branch from lining up with `main`.

## Routine commands

Run these from the top folder of the repository. They need the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli), logged in to the `genesyx1` store. Replace `<THEME_ID>` with the number of the theme (shown in the Shopify admin address when you open a theme, or via `shopify theme list`).

Bring a Shopify theme's current code into `theme/`:

```
shopify theme pull --store genesyx1.myshopify.com --theme <THEME_ID> --path theme
```

Send changes to an **unpublished** theme (one file at a time is safest). Write the file path relative to `theme/`, for example `sections/header-group.json`:

```
shopify theme push --store genesyx1.myshopify.com --theme <UNPUBLISHED_THEME_ID> --path theme --nodelete --only sections/header-group.json
```

Use the ID of an **unpublished** theme only. If you do not have one, make a safe copy: in the Shopify admin go to Online Store, then Themes, open the three-dot menu on the live theme and choose Duplicate. Run `shopify theme list --store genesyx1.myshopify.com` first and never use the one marked `[live]` (currently `208758374730`). If the CLI asks whether to push to the live theme, answer **No**.

Rebuild the theme-only `shopify-live` branch from `theme/`:

```
git subtree push --prefix=theme origin shopify-live
```

Run this only while on `main`, after the pull request has been merged and you have pulled (`git checkout main && git pull`). Never run it from a feature branch: that would send unreviewed code to `shopify-live`. If Git refuses the push, stop and ask a developer. Do not force it.

## Going live

Changes are never pushed straight to the published theme. Push them to an unpublished theme, check it in the Shopify admin preview, and then publish that theme by hand in the Shopify admin (Online Store, then Themes). After publishing, refresh `theme/` with a pull (above) so `main` matches the live shop again.

## Connecting `shopify-live` to Shopify (optional)

This lets Shopify read the theme straight from GitHub.

1. In the Shopify admin go to **Online Store, then Themes, then Add theme, then Connect from GitHub**.
2. Shopify's GitHub app must be approved for this repository.
3. Choose this repository and the `shopify-live` branch.

Once connected, `shopify-live` is **one-way: from `main` to Shopify**. Every `git subtree push` updates the connected theme, and if that theme is published, the change goes live on the shop straight away. So only push to `shopify-live` from `main`, after review (see above).

Do not save edits in the theme editor of the connected theme. Shopify would commit them to `shopify-live`, which is not built to be merged back into `main`, and the next `git subtree push` would then be refused. If editor changes were made anyway, bring them into the repository the usual way: on a new feature branch run

```
shopify theme pull --store genesyx1.myshopify.com --theme <CONNECTED_THEME_ID> --path theme
```

and open a pull request. If Git then refuses the next `git subtree push`, stop and ask a developer. Do not force it.
