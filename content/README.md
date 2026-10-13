# Shop content snapshot

This folder is a dated copy of some of the shop's content, taken on **13 October 2026**.

It is a copy only. **Shopify stays the source of truth.** Never edit these files to change the shop: edit it in the Shopify admin, then refresh this folder.

## What is in this snapshot

| File | What it is |
| --- | --- |
| `products.json` | The 3 products (XX Formula, XY Formula, Ovulation Test Strips): title, tags, options, variants with prices, and image links. |
| `products/<handle>.html` | Each product's description, as published. |
| `collections.json` | The 2 collections (Fertility, Home page) and the products in each. |

`products.json` and `collections.json` in this snapshot came from the shop's **public data** (`genesyx.co.uk/products.json` and `genesyx.co.uk/collections.json`), not from the Shopify admin. Public data has less detail. These fields are not in it and are saved as `null`: product status, template, search-engine title and description, stock policy and image alt text. A `null` means "not available here", not "none": on 13 October 2026 the live site had alt text on the images of two of the three products. A refresh with a working token (see below) fills them in.

## What the full export also writes

When the script can read everything, it also writes these files. They are **not in this snapshot**:

| File | What it is |
| --- | --- |
| `pages.json` and `pages/<handle>.html` | Every page: title, template, published state, search-engine title and description, and the page text. |
| `menus.json` | The navigation menus, with their nested links. |
| `redirects.json` | Every URL redirect. |
| `blogs.json` (and `articles/`) | The blogs and their articles. |
| `policies.json` | The shop's policy pages (Settings, then Policies). |

Not exported: no Admin API token was set up on the computer that took this snapshot, so pages, menus, redirects, blogs and policies were not exported. Nothing was guessed or filled in for them. For reference only, the shop's public sitemap listed 18 published pages on 13 October 2026.

## How to refresh

1. Run `npm install` once in the top folder of the repository.
2. Copy `.env.example` to `.env` and fill it in. Never commit `.env`.
   - `SHOPIFY_STORE` is the store's handle without `.myshopify.com`. Try `genesyx1` first: the Shopify CLI uses it and the live site's own pages show `genesyx1.myshopify.com`. The example file has `trygenesyx` (the admin name) instead. Which one the Admin API accepts has not been confirmed. If the script cannot reach the store, try the other, then correct the example file in a separate change.
   - `SHOPIFY_ADMIN_TOKEN` is an Admin API token with these read-only permissions: `read_content`, `read_products`, `read_online_store_navigation` and `read_legal_policies`. How to get one is in `docs/HANDOVER.md`, section 6. Shopify no longer lets you make a new custom app in its admin, so that section explains the current route.
3. Run `npm run export:content`. This only reads from Shopify. It cannot change the shop.
4. Run `git diff content/` to see what changed, then commit it.

The script accepts `--out <folder>` to write somewhere other than `content/`. If Shopify refuses access to products or collections, it uses the public data described above instead. If a part cannot be read for any other reason, it prints `SKIP` with the reason and carries on with the rest. At the end it lists which files were refreshed and which were not, and it exits with an error if any part was skipped, because an older copy of a skipped file stays in the folder unchanged. If Shopify says the token is missing or not valid (HTTP 401), it stops straight away and does not fall back to public data. Files are sorted and laid out the same way each time, so a refresh only shows real changes.

**This script has not yet been run against the live shop with a real token.** Treat the first real run as its test: all seven sections should print `DONE`.

## What is deliberately left out

Customers, orders, payments, staff, the uploaded image and video files (`npm run export` downloads those), store settings and installed apps. The theme is in `theme/`.

## A caution about the Ovulation Test Strips price

The price stored in Shopify for Ovulation Test Strips is **not an agreed price**. It is deliberately not shown on the site. It appears in `products.json` only because that file copies what Shopify holds. Do not use it as a price.
