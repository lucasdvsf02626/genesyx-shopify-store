# Genesyx Shopify store

This repository holds the code for the Genesyx online shop (genesyx.co.uk). It keeps two things together:

- the **Shopify theme**, which is the code that controls how the shop looks, and
- a few **helper scripts** for jobs outside the theme, such as downloading the store's images and fixing page titles for search engines.

Store details: Shopify store handle `genesyx1`, admin name `trygenesyx`.

## What is in here

| Path | What it is |
| --- | --- |
| `theme/` | The Shopify theme code. This is the part that matters most. It has the usual Shopify folders: `assets`, `blocks`, `config`, `layout`, `locales`, `sections`, `snippets` and `templates`. |
| `export-files.ts` | Downloads the images and videos uploaded to the store into an `exports/` folder on your computer. Can use `files-genesyx1.json` instead of asking Shopify for the list. |
| `apply-seo-fixes.ts` | Plans, and when asked applies, search-engine fixes to store pages (page titles, descriptions, small wording fixes and redirects). It only shows a plan unless you tell it to apply. Applying writes to the live store. |
| `files-genesyx1.json` | A saved list of the files in the store, used by `export-files.ts`. |
| `GEO-THEME-PASTE.md` | Ready-to-paste code snippets for the theme editor that help search engines and AI assistants understand the site. |
| `package.json` | Lists the four scripts below. |

The four scripts (run with `npm run <name>`):

- `export` downloads all the store's files.
- `export:images` downloads images only.
- `seo:plan` shows what `apply-seo-fixes.ts` would change, without changing anything.
- `seo:apply` makes those changes in the live store.

To use them, copy `.env.example` to `.env` and fill it in. Never commit `.env`: it is kept out of the repository on purpose.

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

Use the ID of an **unpublished** theme only. Run `shopify theme list --store genesyx1.myshopify.com` first and never use the one marked `[live]` (currently `208758374730`). If the CLI asks whether to push to the live theme, answer **No**.

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
