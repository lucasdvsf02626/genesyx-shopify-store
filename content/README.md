# Shop content snapshot

This folder is a dated copy of the shop's content, taken on **13 October 2026**.

It is a copy only. **Shopify stays the source of truth.** Never edit these files to change the shop: edit it in the Shopify admin, then refresh this folder.

## What is in this snapshot

| File | What it is | Where it came from |
| --- | --- | --- |
| `pages.json` | The 24 published pages: handle (the last part of the address), title, when published, when last changed (UTC), and `hasBody` (whether the page has text of its own). | Public feed |
| `pages/<handle>.html` | The text of the 11 published pages that have any, exactly as the shop serves it. | Public feed |
| `pages-admin.json` | All 30 pages, including the 6 unpublished ones: handle, title, whether published, template, and when last changed (UTC). | Shopify admin, read by hand |
| `menus.json` | The 3 menus and their links: `main-menu` (7 links), `footer` (1) and `customer-account-main-menu` (2). | Shopify admin, read by hand |
| `redirects.json` | The 9 URL redirects. | Shopify admin, read by hand |
| `blogs.json` | The 1 blog, `learn-archive`, and its 5 articles (handle and title only; all 5 are unpublished). | Shopify admin, read by hand |
| `products.json` | The 3 products (XX Formula, XY Formula, Ovulation Test Strips): title, tags, options, variants with prices, and image links. | Public feed |
| `products/<handle>.html` | Each product's description, as published. | Public feed |
| `collections.json` | The 2 collections (Fertility, Home page) and the products in each. | Public feed |
| `policies.json` | Which of Shopify's six policy addresses exist (answer 200) and which do not (answer 404). | Public feed |
| `policies/privacy-policy.html` | The text of the shop's privacy policy page, `genesyx.co.uk/policies/privacy-policy`. | Public feed |

**Public feed** means the shop's public web addresses, which anyone can read without logging in: `genesyx.co.uk/pages.json`, `/products.json`, `/collections.json` and the pages under `/policies/`. Public data has less detail than the admin (see "Fields that are empty because the source did not have them" below).

**Shopify admin, read by hand** means the information was read from the Shopify admin on 13 October 2026 through a read-only connection and written into the files by a small one-off script that is not kept in the repository. The export script can only refresh these files with an Admin API token (see "How to refresh"). Until someone does that, they are a picture of 13 October 2026 and can go out of date.

`pages.json`, `pages-admin.json`, `menus.json`, `redirects.json`, `blogs.json` and `policies.json` start with `source` (where it came from) and `capturedOn` (the date). `products.json` and `collections.json` are plain lists with no such lines; this copy of them came from the public feed. A refresh always changes `capturedOn`; that line is not a real change.

### Pages with no text of their own

13 of the 24 published pages have no text in the public feed: `contact`, `cycle-aware-nutrition`, `cycle-awareness`, `daily-tracking`, `download`, `my-logs` and `tailored-insights` report none, and `desktop`, `genesyx-landing`, `journey-guide`, `ph-tracking`, `shettles-method-research-evidence` and `vaginal-ph-fertility-science` report an empty text. That is why they have no file in `pages/` and show `hasBody: false`.

Their content comes from the page templates in `theme/templates/` (for example `page.contact.json`, `page.ph-tracking.json`, `page.journey-guide.liquid`). Twelve of the thirteen are set to a template with a matching file. `genesyx-landing` is recorded with the template name "Default page", which is not the name of a template file, so where its content comes from was not checked.

### Unpublished pages

`pages-admin.json` lists six pages that are not published: `about` (About Genesyx), `delete-your-data` (Delete your data), `faq` (Genesyx FAQs), `privacy-policy_v1-0` (Privacy Policy_V1.0), `shettles-method` (Shettles method) and `why-genesyx` (Why Genesyx). Visitors cannot see them and the public feed leaves them out, so **their text is not saved here**. Only a refresh with an Admin API token can save it.

The same applies to the 5 unpublished blog articles in `blogs.json` (`evidence`, `how-to-conceive-a-girl-or-boy`, `ovulation-tests`, `shettles-method`, `vaginal-ph`). The shop redirects each old blog address to a page on the guides site, www.genesyx.life (see `redirects.json`).

### Policies

Only the privacy policy exists as a Shopify policy page. On 13 October 2026 the addresses for the refund policy, shipping policy, terms of service, contact information and legal notice answered 404, so the shop has none of those set up. The shop also has an ordinary page with a privacy policy at `/pages/privacy-policy` (saved as `pages/privacy-policy.html`). The two texts are not identical: the policy page is dated 26 August 2026 and the ordinary page 3 September 2026.

### Fields that are empty because the source did not have them

`products.json` and `collections.json` came from public data. These fields are not in it and are saved as `null`: product status, template, search-engine title and description, stock policy and image alt text. A `null` means "not available here", not "none": on 13 October 2026 the live site had alt text on the images of two of the three products. A refresh with a working token (see below) fills them in.

Page times are saved in UTC. The public feed gives them in the shop's local time zone, so they are converted to the same instant in UTC, which is how the Admin API gives them.

## How to refresh

Both commands only read from Shopify. They cannot change the shop. Run `npm install` once in the top folder of the repository first, then `git diff content/` afterwards to see what changed, and commit it.

**Without a token: `npm run export:content:public`**

- Needs no token and no settings file. It makes no Admin API request.
- Refreshes `pages.json`, `pages/`, `products.json`, `products/`, `collections.json`, `policies.json` and `policies/`.
- Does not touch `menus.json`, `redirects.json`, `blogs.json` or `pages-admin.json`. They keep their 13 October 2026 contents and may go out of date.
- Cannot see unpublished pages or draft products. It leaves any file in `pages/` or `products/` it does not recognise as it is and prints a warning (for example the text of an unpublished page, or the description of a draft product, saved by a run with a token). It removes the file of a published page that no longer has any text.
- If the folder was last refreshed with a token, this command puts the less detailed public versions of `pages.json`, `products.json`, `collections.json` and `policies.json` back: published items only, the template, published state and search-engine fields of pages dropped, and the status, template and search-engine fields of products and collections back to `null`. Check `git diff content/` before committing.
- If the privacy policy page cannot be found in the expected place, it saves nothing from the policy step and says so.

**With a token: `npm run export:content`**

1. Copy `.env.example` to `.env` and fill it in. Never commit `.env`.
   - `SHOPIFY_STORE` is the store's handle without `.myshopify.com`. Try `genesyx1` first: the Shopify CLI uses it and the live site's own pages show `genesyx1.myshopify.com`. The example file has `trygenesyx` (the admin name) instead. Which one the Admin API accepts has not been confirmed. If the script cannot reach the store, try the other, then correct the example file in a separate change.
   - `SHOPIFY_ADMIN_TOKEN` is an Admin API token with these read-only permissions: `read_content`, `read_products`, `read_online_store_navigation` and `read_legal_policies`. How to get one is in `docs/HANDOVER.md`, section 6. Shopify no longer lets you make a new custom app in its admin, so that section explains the current route.
2. Run `npm run export:content`.

- It also refreshes `menus.json`, `redirects.json` and `blogs.json`, and rewrites `pages-admin.json`.
- `pages.json` then lists all 30 pages, with template, published state and search-engine title and description, and `pages/` also gets the text of unpublished pages. The text of blog articles is saved in `articles/` when there are fewer than 20.
- `policies.json` then holds the policy text itself instead of the 200 and 404 list, and `policies/` is not updated by this command.
- If Shopify refuses access to products or collections, it uses the public data described above instead. If a part cannot be read for any other reason, it prints `SKIP` with the reason and carries on with the rest. At the end it lists which files were refreshed and which were not, and it exits with an error if any part was skipped, because an older copy of a skipped file stays in the folder unchanged. If Shopify says the token is missing or not valid (HTTP 401), it stops straight away and does not fall back to public data.

**This command has not yet been run against the live shop with a real token.** Treat the first real run as its test: all seven sections should print `DONE`. It has only been tried against made-up answers, not against Shopify.

Files are sorted and laid out the same way each time, so when you use the same command as last time, apart from the `capturedOn` date a refresh only shows real changes. Switching between the two commands also changes the `source` lines and the fields that only the Admin API provides, so the first refresh with a token will show a larger difference than later ones.

## What is deliberately left out

Customers, orders, payments, staff, the uploaded image and video files (`npm run export` downloads those), store settings and installed apps. The text of the six unpublished pages and five unpublished articles is not saved (see above). The theme is in `theme/`.

## A caution about the Ovulation Test Strips price

The price stored in Shopify for Ovulation Test Strips is **not an agreed price**. It is deliberately not shown on the site. It appears in `products.json` only because that file copies what Shopify holds. Do not use it as a price.
