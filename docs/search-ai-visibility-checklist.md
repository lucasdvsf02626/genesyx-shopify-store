# Genesyx: search and AI visibility checklist

Run on 5 October 2026 against **genesyx.co.uk** (shop) and **genesyx.life** (guides). Every problem below was checked twice: once by the auditor, once by a second reviewer who tried to disprove it.

**How to read this**

- `[x]` done, or already fine
- `[~]` fixed, waiting for you to publish or merge
- `[ ]` open: needs your decision or can only be done by you

**Two things to release**

1. Shop: publish the draft theme **"Genesyx — search & AI visibility (dev)"**
   https://admin.shopify.com/store/trygenesyx/themes/208834593098/editor
   Preview first: https://genesyx.co.uk/?preview_theme_id=208834593098
2. Guides: merge pull request **#17**
   https://github.com/FORZA-Industries/genesyx_astro/pull/17

---

## 1. Crawl access

- [x] **robots.txt allows search and AI search bots** (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Applebot). Both sites.
- [x] **Nothing blocks the bots.** Ten different bot identities got the same full page as a normal browser on both sites.
- [x] **Content is plain HTML.** Product names, prices and guide text are all readable without JavaScript.
- [x] **No noindex or canonical errors** on any live key page; http and www redirect correctly.
- [ ] **Training bots (GPTBot, ClaudeBot, Google-Extended, CCBot): your decision.** All four are currently allowed on both sites. My recommendation is to leave them allowed: it helps the brand get known, and blocking them would not affect AI search results either way.
- [~] **Sitemap dates (guides).** 5 of 12 pages had no "last modified" date. Fixed in PR #17.
- [~] **Duplicate copy of the guides site** at `genesyx-astro.vercel.app` now redirects to genesyx.life. PR #17. (A second old copy at `genesyx.pages.dev` needs you to delete the old Cloudflare Pages project.)
- [~] **Duplicate privacy policy (shop).** `/policies/privacy-policy` (dated 26 August) and `/pages/privacy-policy` (dated 3 September) both exist. The draft tells search engines the September one is the real one. You should still paste the September text into Settings → Policies so both match.
- [ ] **Sitemap clean-up (shop): needs your OK.** Four leftovers are listed for search engines: `/pages/journey-guide`, `/pages/copy-of-delete-your-data`, the empty `/blogs/learn-archive`, and `/collections/frontpage`. I can hide them from search; it is a change to live store data, so I have not done it.
- [ ] **Submit both sitemaps** in Google Search Console and Bing Webmaster Tools (only you can).
  - Shop: `https://genesyx.co.uk/sitemap.xml`
  - Guides: `https://www.genesyx.life/sitemap-index.xml`
- [~] **Speed (shop homepage).** It loaded 10.7 MB up front; the draft loads 2.7 MB. Two videos (7.6 MB) now wait until you scroll to them. On a simulated slow phone the main picture appears in about 5.4 s instead of 6.8 s. Product page speed is unchanged (about 4.1 s).
- [ ] **Speed: three files to move into Shopify (needs your OK).** One marquee picture is a 4.95 MB file loaded from an outside server, and both homepage videos would load better as Shopify-hosted files. I need your go-ahead to download and re-upload them.
- [x] **Speed (guides).** Already fast: about 1 second, 150 KB per page.
- [x] **llms.txt.** The guides site has a good one, and PR #17 corrects it (formulas on sale now, Android app, product links). The shop uses Shopify's default, which Shopify recommends keeping.

## 2. Entity and brand clarity

- [x] **Brand name is spelled "Genesyx" everywhere.** No "Genesxy" found on either site.
- [x] **Organization, WebSite and app schema exist** on both sites and are valid.
- [~] **The two sites now point at each other in schema**, and the shop's description mentions the supplements as well as the app. Draft theme.
- [~] **Android app added to the guides site** (links, schema, footer). PR #17.
- [~] **App Store links fixed (shop).** They pointed at the US store; six feature pages showed "App Store — coming soon" although the iPhone app is live; and the homepage "Explore the app" button sent everyone to Google Play. Draft theme.
- [ ] **Homepage title and description (shop): needs your OK.** The homepage's search title is just "Genesyx" and it has no description. Suggested:
  - Title: `Genesyx | XX & XY Formula supplements and free fertility app`
  - Description: `Genesyx makes XX Formula and XY Formula food supplements and a free fertility, cycle and vaginal pH tracking app. Made in the UK.`
- [ ] **Which company runs Genesyx? Your decision.** Four names are in use:
  - Shop schema and privacy policy: Genesyx Ltd (company no. 16913651)
  - Guides site and App Store seller: SF MEDIA & PR LTD
  - Google Play developer: Supplement Factory Ltd
  - Shop footer: no company name at all
- [ ] **Which email? Your decision.** The shop footer and contact page say `hello@genesyx.co.uk`; everything else says `info@genesyx.co.uk`.
- [ ] **Google Play support email is a personal Gmail address.** Change it to the brand mailbox in Play Console.
- [ ] **No About page on the shop.** The guides site has one, but it lacks the company number and address.
- [ ] **No LinkedIn, Crunchbase or Wikidata entry.** `linkedin.com/company/genesyx` belongs to an unrelated German company, so create the page under a different handle (for example `genesyx-app`).
- [ ] **Instagram.** `instagram.com/genesyx.app` looks official. Confirm it and I will add it to the schema.

## 3. Showing up in the UK

- [~] **Pages now declare British English** (`en-GB`); the shop said plain `en`. Draft theme.
- [x] **Prices are in GBP** throughout.
- [~] **"Add to cart" is now "Add to basket"** on product pages, matching the rest of the shop. Draft theme.
- [ ] **"luteinizing" → "luteinising"** in the Ovulation Test Strips description: needs your OK (live product text).
- [ ] **Cookie banner says "personalize".** Change in Settings → Customer privacy.
- [ ] **No delivery or returns information anywhere on the shop.** The shipping, refund and terms policy pages return "not found". Write them in Settings → Policies; I can then add a "UK delivery" line by the buy button.
- [ ] **No company address, number or phone in the shop footer.** Waiting on the company-name decision above.
- [ ] **Health claims: see the review list at the end.** This is the most important open item.

## 4. Content AI engines can quote

- [x] **FAQ with schema (guides).** Present and valid.
- [~] **Availability wording (guides).** Pages contradicted each other ("pre-launch" vs "available now"). One agreed sentence is now used everywhere. PR #17. Note: the headings "Join the XX first release" became "Join the XX waitlist".
- [~] **Collection pages showed a false sale (shop).** Both formulas appeared as "Sale — £297 → From £99", because the 3-month kit's compare-at price was mixed with the single-box price. The draft shows "From £99" with no sale badge, and the strips say "Coming soon" instead of "Sold out".
- [~] **Placeholder testimonials and an unsupported rating (shop).** Five app feature pages showed visible "Placeholder quote" text and all six showed "4.8 average" although neither app store has any ratings. Hidden in the draft. The pH page's three named quotes are hidden too: if they are real customers, tell me and I will switch them back on without the rating.
- [ ] **No page opens with a short direct answer** under a question heading (shop: none; guides: some). Worth doing after the claims review, since the answers would be about what the products do.
- [ ] **No comparison pages**, no author names or credentials on health content, no original data. These need you or a writer.
- [ ] **pH numbers disagree across the shop.** The daily-tracking page shows 6.0–7.5 as the "optimal window"; the homepage says 3.8–4.5; the pH page says 3.8–5.0; the App Store listing talks about urine pH.

## 5. Off-site mentions (the biggest lever, and nothing exists yet)

- [ ] **Reviews: none anywhere.** No Trustpilot page, no app-store ratings, no forum mentions. Best first step: claim the free Trustpilot profile for genesyx.co.uk and send its link to every buyer.
- [ ] **Press: none.** The only outside mention is the agency's own case study.
- [ ] **YouTube: none.** `@genesyx` is taken by someone else; `@genesyxapp` was free.
- [ ] **Google Business Profile: none.** Only possible if customers can visit or collect from the address.

## 6. Verification

- [x] **Schema parses on every template** checked on both sites.
- [ ] **Search Console and Bing Webmaster Tools.** Only you can open them. The guides site already has its Bing verification file.
- [ ] **Analytics.** The shop only has Shopify's built-in analytics; AI visitors (chatgpt.com, perplexity.ai and so on) show there under referrers. The guides site has no analytics at all. Turning on Vercel Web Analytics (no cookies) takes one switch in the Vercel dashboard plus a small code change I can add.
- [ ] **Monthly prompt check.** Not started; I can draft the 15–20 prompts whenever you want.

---

## The strips price is still readable behind the scenes

The draft removes £14.99 from the tags and schema that search and AI engines read. It is **still present** in Shopify's own data feeds (`/products/ovulation-test-strips.json`, the analytics data on product pages), which a theme cannot change. The only full fix is to enter the real price once it is agreed. Do not set it to £0: it would then be published as free.

## Health-claims review list (for you and a regulatory adviser)

I am not a lawyer; this is a flag list, not legal advice. Nothing here was rewritten. The reviewers checked the wording against the UK advertising code (CAP sections 3, 12 and 15).

**Highest risk on the shop**

1. XX Formula page: "optimal environment for conceiving a female child". XY Formula page: the same for "a male child". A food supplement claiming to influence a baby's sex is not a permitted claim. The guides site's own FAQ says the formula "does not influence the sex of a baby".
2. Ovulation Test Strips page: "Over 99% accurate" and "increasing your chances of conception". Both need evidence that matches the manufacturer's instructions and marking.
3. The "4.8 average" rating and placeholder testimonials (hidden in the draft, still live until you publish).
4. The 6.0–7.5 "optimal window" for vaginal pH on the daily-tracking page.

**Highest risk on the guides site**

1. The product names "XX Formula" and "XY Formula" shown next to "a girl" and "a boy".
2. "XX- or XY-specific preparation" and "route-specific supplement".
3. The standing disclaimer says evidence for the Shettles theory "is mixed", while the site's own Shettles page says the results "do not support it".

The full lists (30 items for the shop, 37 for the guides) are saved with the audit; ask and I will send them.
