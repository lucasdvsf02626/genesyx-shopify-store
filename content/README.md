# Shop content snapshot

This folder is a dated copy of some of the shop's content, taken on **13 October 2026**.

It is a copy only. **Shopify stays the source of truth.** Never edit these files to change the shop: edit it in the Shopify admin, then refresh this folder.

## What is in this snapshot

| File | What it is |
| --- | --- |
| `products.json` | The 3 products (XX Formula, XY Formula, Ovulation Test Strips): title, tags, options, variants with prices, and image links. |
| `products/<handle>.html` | Each product's description, as published. |
| `collections.json` | The 2 collections (Fertility, Home page) and the products in each. |

`products.json` and `collections.json` in this snapshot came from the shop's **public data** (`genesyx.co.uk/products.json` and `genesyx.co.uk/collections.json`), not from the Shopify admin. Public data has less detail. These fields are not in it and are saved as `null`: product status, template, search-engine title and description, and stock policy. A refresh with a working token (see below) fills them in.

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
2. Copy `.env.example` to `.env` and fill it in. The token comes from a custom app in the Shopify admin with these read-only permissions: `read_content`, `read_products`, `read_online_store_navigation` and `read_legal_policies`. Never commit `.env`.
3. Run `npm run export:content`. This only reads from Shopify. It cannot change the shop.
4. Run `git diff content/` to see what changed, then commit it.

The script accepts `--out <folder>` to write somewhere other than `content/`. If it cannot read one part, it prints `SKIP` with the reason and carries on with the rest. Only for products and collections, it then uses the public data described above. Files are sorted and laid out the same way each time, so a refresh only shows real changes.

## What is deliberately left out

Customers, orders, payments, staff, the uploaded image and video files (`npm run export` downloads those), store settings and installed apps. The theme is in `theme/`.

## A caution about the Ovulation Test Strips price

The price stored in Shopify for Ovulation Test Strips is **not an agreed price**. It is deliberately not shown on the site. It appears in `products.json` only because that file copies what Shopify holds. Do not use it as a price.
