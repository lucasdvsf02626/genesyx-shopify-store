# Genesyx website: handover notes

Read this first.
It explains what Genesyx's website is made of, where things stand on **13 October 2026**, and what the new owner needs. It is written for someone who may not be a developer.

Where a line says "checked today", it was re-checked on 13 October 2026.
Other facts come from the project notes and the 5 October audit, and may have changed.
The commands and branch rules are in [../README.md](../README.md).

## 1. What Genesyx's website is made of

| Part | Where its code or content lives | How a change goes live |
| --- | --- | --- |
| **The shop**, genesyx.co.uk. A Shopify store (store handle `genesyx1`, admin name `trygenesyx`). | The look and code (the "theme") is in this repository, in `theme/`. Products, page text, menus, redirects, uploaded files and settings live inside Shopify. | Theme: build on an unpublished copy, preview it, then publish by hand in the Shopify admin. Products, page text and menus: edit them in the Shopify admin and they are live straight away. |
| **The guides site**, www.genesyx.life. | Separate repository `FORZA-Industries/genesyx_astro`. Built with Astro and hosted on Vercel. | Merging a pull request into `main` is what Vercel deploys, according to the project notes. |
| **The quiz**, shown on the shop's "Personalise Your Conception Journey" page. | An app made with Lovable, hosted at `trygenesyx.lovable.app`. Its code is not in either repository. The shop page contains the quiz inside a frame that points to `trygenesyx.lovable.app/quiz`. | Changes are made in the Lovable project. How they are published was not confirmed. |
| **The iPhone and Android apps.** | Separate projects. Their code is not in either repository and where it is kept was not confirmed. | Released through App Store Connect (iPhone) and Google Play Console (Android). |

A second Lovable app, `genesyx-journey-guide.lovable.app`, is shown in a frame on the shop page `/pages/journey-guide` (template `page.journey-guide.liquid`).
That page is still listed in the shop's sitemap (checked today). How that app is published was not confirmed.

**Key addresses**

| What | Address |
| --- | --- |
| Shop | https://genesyx.co.uk |
| Guides site | https://www.genesyx.life |
| Quiz | https://trygenesyx.lovable.app/quiz |
| Shopify admin | https://admin.shopify.com/store/trygenesyx |
| Shop repository (private) | https://github.com/lucasdvsf02626/genesyx-shopify-store |
| Guides repository | https://github.com/FORZA-Industries/genesyx_astro |

## 2. State on 13 October 2026

**Published theme (what visitors see):** "Genesyx — mobile menu (dev)", id `208758374730`.
Checked today with `shopify theme list`.
The previous owner published it on 5 October 2026, according to the project notes.
The `theme/` folder in this repository is an exact copy of it.

**Waiting draft (not published):** "Genesyx — search & AI visibility (dev)", id `208834593098`.
Visitors cannot see it.
Compared with the published theme it contains, as listed in pull request #3 of the shop repository:

- Search and AI fixes: the page language is set to British English. The privacy policy points search engines to `/pages/privacy-policy` as the main copy. Products tagged `coming-soon` no longer send a price to search engines.
- Prices and wording: a sale is shown only when the cheapest version of a product is itself discounted. "Add to cart" becomes "Add to basket".
- App links: the App Store links no longer point at the US store. The home page "Explore the app" button goes to the download page.
- Page speed: the homepage videos start only when scrolled into view, and images load in a better order.
- Six app feature pages no longer show the review-quotes section (see the 4.8 rating item in section 5).

The store also holds 12 other unpublished themes. This document does not say what each is for.

**Products (checked today on the public site)**

| Product | Versions and prices | Can it be bought? |
| --- | --- | --- |
| XX Formula | 1 month (1 box) £99.00. 3-month kit (3 boxes + tests) £267.00. | 1 month: yes. Kit: no. |
| XY Formula | 1 month (1 box) £99.00. 3-month kit (3 boxes + tests) £267.00. | 1 month: yes. Kit: no. |
| Ovulation Test Strips | 25 strips. No agreed price, so none is shown. | No. "Coming soon". |

**Open pull requests**

| Repository | Pull request | What it means |
| --- | --- | --- |
| Shop (`lucasdvsf02626/genesyx-shopify-store`) | #3, draft | A copy of the waiting draft theme. Do not merge until that theme is published, then refresh `theme/` from it first. |
| Shop | #1 | An old, documentation-only update to the GEO paste guide (opened 30 September). Merging it changes nothing on the store. Still undecided. |
| Guides (`FORZA-Industries/genesyx_astro`) | #17 | Search and AI fixes for genesyx.life: sitemap dates, a more accurate `llms.txt`, the Android app, and a redirect from a duplicate address. Open and not merged. |
| Guides | #18, draft | Adds `hreflang` tags, an IndexNow submission step for Bing, and monitoring notes. It also removes Google Play from the site's schema and says no Android app exists, which disagrees with #17 and the audit checklist. Settle that before merging either. |

Pull request #2 on the shop repository is already merged. It brought the published theme and the README into `main`.
The pull request that adds this document is also open until it is merged.

## 3. How the shop is built

- **Theme base.**
  The theme is Shopify's Dawn (version 15.5.0, named in `theme/config/settings_schema.json`) with a lot of custom sections. Many of them are named `withings-*`.
- **Styling trap.**
  Those sections use a ready-made stylesheet, `assets/withings.css`.
  A new Tailwind class with a value in square brackets, such as `min-h-[11rem]`, silently does nothing.
  Put new sizes in the section's own style block.
  The page's base text size is 10px, so `rem` sizes come out smaller than they look.
  These two points come from the project notes.
- **Header menu.**
  The header is a custom block, `blocks/ai_gen_block_ffe8d02.liquid`, set to the menu with handle `main-menu`.
  Menus are store data, not theme code.
  Editing the main menu in the Shopify admin changes the header on every theme at once.
  It can take a page or two to show because of caching.
  Footer links are in `sections/footer-group.json`.
- **Products.**
  There are three: XX Formula, XY Formula and Ovulation Test Strips (table in section 2).
  XX and XY each have an option called "Supply": "1 month (1 box)" and "3-month kit (3 boxes + tests)".
  The kit has a compare-at price of £297 and no stock, so it cannot be bought yet.
  Ovulation Test Strips are "coming soon".
- **The strips have no agreed price.**
  Shopify still holds a price that was never agreed, and the site deliberately does not show it.
  It can still be read in Shopify's own data feeds.
  Until the draft theme is published, it is also in the strips page's hidden tags that search engines read (checked today on the live theme).
  Only entering the real price fixes the data feeds.
  Do not set it to £0, because that would publish it as free.
- **Two tags drive "coming soon".**
  `coming-soon` on a product (the strips) makes the button say "Coming soon" and hides the price everywhere.
  `coming-soon-variants` (on XX and XY) makes an unavailable version say "Coming soon" instead of "Sold out", and keeps the price visible.
  The theme code for both is in four places: `snippets/price.liquid`, `snippets/buy-buttons.liquid` (the button label), `sections/genesyx-shop-products.liquid` (the shop card) and `templates/product.json` (a label override).
- **To launch the kit:** give the kit versions of XX and XY some stock, or stop tracking their stock. **To launch the strips:** remove the `coming-soon` tag, enter the agreed price, and set stock.
- **Two privacy-policy addresses.**
  `genesyx.co.uk/pages/privacy-policy` is a normal page.
  `genesyx.co.uk/policies/privacy-policy` is Shopify's own policy page.
  Both are live (checked today).
  The project notes say both must be kept matching for Apple and Google app review, and that the Android app links to the page while the iPhone app links to the policy page. That was not re-checked.
  The two texts are not identical. Checked today: the policy page is dated 26 August 2026 and the page 3 September 2026, and they differ in other places too (for example where data is stored and how accounts are deleted). Both mention Apple and Google sign-in.
  The project notes say the policy page's Apple and Google sign-in wording must be kept when it is edited. The audit checklist advises pasting the September text into the policy page, so compare the two texts first and do not paste one over the other blindly.
  The previous owner could edit the page through the API but not the policy page.
  The policy page is edited in the Shopify admin under Settings, then Policies.
- **The blog goes to the guides site.**
  `genesyx.co.uk/blogs/news` redirects to `www.genesyx.life/learn` (checked today).
- **The quiz is an outside app in a frame.**
  The frame sits in the page text (kept in Shopify, not in the theme) and is at least 920px tall.
  Changes to the quiz itself are made in Lovable, not in the shop.

## 4. Making a change safely

1. **Check the repository matches the shop.** Run `shopify theme list --store genesyx1.myshopify.com`. The theme marked `[live]` is what visitors see. If `theme/` is out of date, refresh it first with the `shopify theme pull` command in the README.
2. **Work on a branch.** Change files in `theme/`. Never work directly on `main`.
3. **Send the changes to an unpublished theme, never the live one.** Use `--nodelete` and `--only`, as the README shows. If there is no suitable unpublished theme, duplicate the live one in the Shopify admin (Online Store, then Themes).
4. **Preview.** Open the unpublished theme in the admin preview, and check it on a phone-sized screen. You can also load any page with `?preview_theme_id=<theme id>` added to the address.
5. **Publish by hand.** In the Shopify admin go to Online Store, then Themes, and publish the theme. This step is manual on purpose.
6. **Refresh the repository.** Pull the newly live theme into `theme/`, open a pull request to `main`, and merge it with a merge commit, not "squash". Then update `shopify-live` as the README describes.

**Checking what is really live.** Shopify caches pages. Add `?v=` and any text to the address to skip the cache. The page's `server-timing` response header names the theme that served it, for example `theme;desc="208758374730"` (checked today on the live shop). A plain `curl` is sent a redirect first, so use `curl -sL` with a cookie jar. These tips come from the project notes.

**A caution.** `npm run seo:apply` writes to the live shop and hides six old pages. Run it only after reading the plan from `npm run seo:plan`.

Full commands and the branch rules are in [../README.md](../README.md).

## 5. Open decisions and known issues

These come from the audit on 5 October 2026.
Some may have changed since.
Only the items marked "checked today" were re-checked.
The reasons are in [search-ai-visibility-checklist.md](search-ai-visibility-checklist.md), a copy of the audit's checklist.
The AI assistant that ran the audit wrote it, speaking to the previous owner, so "I" and "you" in it mean those two.
It mentions longer health-claim lists (30 items for the shop, 37 for the guides). Those lists are not in this repository. If the previous owner can find them, add them to `docs/` after checking they hold no personal data.

- **Health-claim wording needs review.**
  The audit flagged: the XX and XY product text about "conceiving a female child" and "a male child"; "Over 99% accurate" on the strips; a "4.8 average" rating and placeholder quotes on app pages; and pH ranges that disagree between pages.
  **This is a flag list, not legal advice.**
  It needs a regulatory adviser.
  Nothing has been rewritten, and health wording should not be changed without the owner's go-ahead.
- **Which company name to use.**
  Four versions are in use: Genesyx Ltd (shop schema and privacy policy), SF MEDIA & PR LTD (guides site and App Store seller), Supplement Factory Ltd (Google Play developer), and none in the shop footer.
- **Which contact email to use.**
  The shop footer and contact page say `hello@genesyx.co.uk`.
  Everything else says `info@genesyx.co.uk`.
  The support email on the Google Play listing is a personal address and should become a brand mailbox.
- **The Ovulation Test Strips price.**
  No price has been agreed (see section 3).
- **Off-site presence has not started.**
  There are no reviews, press, YouTube channel, Google Business Profile or company profiles.
  The audit called this the biggest lever.
- **Two things are waiting to be released.**
  The unpublished draft theme (section 2) and the guides-site pull request #17.
  Checked today: both are still unreleased.
- **Other owner decisions.**
  Whether AI training bots stay allowed (they currently are).
  Clearing four leftover entries from the shop's sitemap (checked today: all four are still listed).
  Submitting both sitemaps to Google Search Console and Bing Webmaster Tools.
  The shipping, refund and terms policies in Shopify's policy settings, which the audit found missing.
- **The home page picture.**
  A new hero picture was supplied on 5 October and then withdrawn as the wrong one. According to the project notes, the hero has not been changed. Ask the previous owner which picture is meant before swapping it.
- **An old copy of the guides site.**
  The audit says `genesyx.pages.dev`, an old Cloudflare Pages copy, should be deleted by whoever owns that project. It still answers (checked today).

## 6. Access the new owner will need

No passwords or tokens are stored in this repository.
The helper scripts need an Admin API token, a secret code that lets a script talk to the shop. Put it in a local `.env` file that is never committed. The one exception is `npm run export:content:public`, which reads only the public website and needs no token. It refreshes the pages, products, collections and privacy policy in `content/`, but not the menus, redirects or blogs.
How to get one has changed. This was checked against Shopify's developer documentation on 13 October 2026:

- If the store already has a custom app (Settings, then Apps and sales channels, then Develop apps), use its token or replace it. Whether the store has one was not checked. Shopify's documentation says new ones can no longer be made there (the cut-off was 1 January 2026).
- Otherwise, create an app in Shopify's Dev Dashboard, give it the read permissions the scripts need, and install it on the store. Shopify's page "Authenticate an app for stores in your organization" (https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant) explains the steps. That route only works if the app and the store are in the same Shopify organisation. Its tokens expire after 24 hours, so you would need a new one each time you run a script.

If an older custom app exists, remove it once you have your own, so the previous owner's token stops working.

- [ ] Shopify admin staff account, added under Settings, then Users. The admin name is `trygenesyx`.
- [ ] Shopify store ownership. A staff account is not the same as owning the store. Only the current store owner can change or transfer ownership (see Shopify Help Center, "Change or transfer ownership").
- [ ] The `hello@genesyx.co.uk` and `info@genesyx.co.uk` mailboxes. Where they are hosted was not confirmed.
- [ ] GitHub access to both repositories. The shop repository sits under an individual's GitHub account, not an organisation, so consider transferring it.
- [ ] The Vercel project that hosts the guides site.
- [ ] The Lovable project for the quiz.
- [ ] App Store Connect and Google Play Console, for the two apps.
- [ ] Google Search Console and Bing Webmaster Tools, once they are set up. The 5 October audit listed this as still to do.
- [ ] Wherever the DNS for the two domains (genesyx.co.uk and genesyx.life) is managed. Which provider that is has not been confirmed.

## 7. What is not in git at all

- **Uploaded images and videos.** They live in Shopify. `npm run export` downloads them to your computer, but they are not committed.
- **Store settings**, and Shopify's own policy pages other than a dated copy of the privacy policy in `content/policies/`.
- **Installed apps** and their settings.
- **Payments.**
- **Customers and orders.** These are personal data and must never be added to a repository.

A dated copy of the shop's content, taken on 13 October 2026, is in `content/`: the published pages, a list of all pages, the menus, the redirects, the blog (titles only), the products, the collections and the privacy policy. Its [README.md](../content/README.md) says where each part came from and what is not included, for example the text of the six unpublished pages and five unpublished blog articles. The menus, redirects and blog list were read from the Shopify admin by hand and can only be refreshed with an Admin API token.
Shopify remains the source of truth.
