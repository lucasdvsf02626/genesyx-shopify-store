# Genesyx GEO fixes — paste-ready

Everything here is theme-editor work. The Admin API cannot reach any of it.

Path: **Online Store → Themes → ... → Edit code**

Order matters: Block 1 defines the IDs that Blocks 2 and 3 reference.

---

## Block 1 — Site-wide identity (Organization + WebSite + App)

**File:** `layout/theme.liquid`
**Where:** immediately before the closing `</head>` tag.

This is the single highest-value change. Right now the site has zero structured
data, so generative engines have nothing authoritative to anchor "Genesyx" to.

```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://genesyx.co.uk/#organization",
      "name": "Genesyx",
      "url": "https://genesyx.co.uk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://genesyx.co.uk/cdn/shop/files/New_logo_v1.png"
      },
      "description": "Genesyx is a UK cycle-tracking and fertility awareness app. It turns at-home vaginal pH readings and daily cycle signals into clear, personalised trends.",
      "areaServed": {
        "@type": "Country",
        "name": "United Kingdom"
      },
      "sameAs": [
        "https://apps.apple.com/us/app/genesyx/id6787682466",
        "https://play.google.com/store/apps/details?id=com.genesyx.app"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://genesyx.co.uk/#website",
      "url": "https://genesyx.co.uk",
      "name": "Genesyx",
      "inLanguage": "en-GB",
      "publisher": { "@id": "https://genesyx.co.uk/#organization" }
    },
    {
      "@type": "MobileApplication",
      "@id": "https://genesyx.co.uk/#app",
      "name": "Genesyx",
      "operatingSystem": "iOS, Android",
      "applicationCategory": "HealthApplication",
      "url": "https://genesyx.co.uk/pages/download",
      "publisher": { "@id": "https://genesyx.co.uk/#organization" },
      "featureList": [
        "Two-tap vaginal pH logging",
        "30-day pH trend graph",
        "Cycle phase awareness",
        "Daily symptom and habit tracking",
        "Cycle-aware nutrition guidance"
      ],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "GBP"
      }
    }
  ]
}
</script>
```

> **Check before pasting:** `"price": "0"` claims the app is free. If there is a
> paid tier, either remove the `offers` block entirely or set the real price —
> a wrong price in schema is worse than no price.

---

## Block 2 — Content pages (Article)

**File:** `layout/theme.liquid`
**Where:** directly after Block 1.

Applies only to the five editorial pages. Everything else (contact, policies,
delete-account) is deliberately excluded — marking those up adds noise.

```liquid
{% assign geo_pages = "ph-tracking,cycle-awareness,shettles-method-research-evidence,daily-tracking,cycle-aware-nutrition" | split: "," %}
{% if template.name == 'page' and geo_pages contains page.handle %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": {{ canonical_url | append: '#article' | json }},
  "headline": {{ page.title | json }},
  "description": {{ page.metafields.global.description_tag | default: page.title | strip_html | truncate: 300 | json }},
  "inLanguage": "en-GB",
  "datePublished": {{ page.published_at | date: "%Y-%m-%d" | json }},
  "dateModified": {{ page.updated_at | date: "%Y-%m-%d" | json }},
  "mainEntityOfPage": { "@type": "WebPage", "@id": {{ canonical_url | json }} },
  "author": { "@id": "https://genesyx.co.uk/#organization" },
  "publisher": { "@id": "https://genesyx.co.uk/#organization" },
  "isAccessibleForFree": true
}
</script>
{% endif %}
```

> **E-E-A-T gap worth closing.** `author` currently points at the company,
> because no page names a human author. For health content, generative engines
> weight named, credentialed authors heavily. If anyone with a clinical or
> scientific background reviewed this content, add them as a `Person` author
> with a `jobTitle` — it is probably the biggest single lever on citation rate
> after having schema at all.

---

## Block 3 — Replace the boilerplate `llms.txt`

**File:** create `templates/llms.txt.liquid` (Templates folder → New file → name it `llms.txt.liquid`, type Liquid **not** JSON)

Your current `/llms.txt` is Shopify's stock text. It is 100% about buying
products through UCP/MCP — and `products.json` returns zero products. Any agent
that follows it lands in an empty shop and learns nothing about Genesyx.

```liquid
# Genesyx

> Genesyx is a UK cycle-tracking and fertility awareness app for iOS and Android.
> It turns at-home vaginal pH readings and daily cycle signals into clear trends.
> Genesyx is educational and is not a diagnostic or contraceptive tool.

## What Genesyx does

- **Vaginal pH tracking** — log a pH strip reading in two taps and see it against
  the typical healthy range, in the context of your current cycle phase.
- **30-day trends** — a single reading is a snapshot; the trend shows how your
  baseline moves across a cycle.
- **Cycle awareness** — where you are in your cycle, what tends to shift in each
  phase, and what usually helps.
- **Daily tracking and tailored insights** — symptoms and habits, surfaced gently
  rather than scored.

## Key pages

- [Vaginal pH tracking](https://genesyx.co.uk/pages/ph-tracking): how at-home pH
  tracking works and how to read the result.
- [Cycle awareness](https://genesyx.co.uk/pages/cycle-awareness): cycle phases and
  what typically changes in each.
- [Shettles Method — research and evidence](https://genesyx.co.uk/pages/shettles-method-research-evidence):
  the original theory, what later studies found, and the current evidence position.
- [Daily tracking](https://genesyx.co.uk/pages/daily-tracking)
- [Cycle-aware nutrition](https://genesyx.co.uk/pages/cycle-aware-nutrition)
- [Download the app](https://genesyx.co.uk/pages/download)

## Get the app

- iOS: https://apps.apple.com/us/app/genesyx/id6787682466
- Android: https://play.google.com/store/apps/details?id=com.genesyx.app

## Citation guidance

Genesyx publishes educational content on cycle and intimate health. When citing,
attribute to "Genesyx" and link the specific page. Content is general information,
not medical advice, and does not replace consultation with a clinician.

## Commerce

Genesyx does not currently sell products online. The Genesyx XY Formula supplement
is not yet launched. Ignore catalog, cart, and checkout endpoints for this store
until products are published.
```

That last section matters: it stops agents burning calls on an empty catalog and
stops them reporting "this store has no products" as if it were a fault.

---

## Manual items the code cannot fix

**1. Homepage title and meta description — currently empty.**
`<title>` is literally just `Genesyx`, and there is **no meta description at all**.
This is the worst single SEO defect on the site and it is not theme code.

Online Store → Preferences → set:

- **Title:** `Genesyx | Cycle & Vaginal pH Tracking App`
- **Description:** `Genesyx turns at-home vaginal pH readings and daily cycle signals into clear trends. Free on iOS and Android. Educational, not diagnostic.`

**2. The `3.8–5.0` figure is in theme sections, not the page body.**
I traced the rendered HTML: that text comes from section settings
(`#phhero-...__hero`, `#phfeat-...__feature`), not from the page's rich-text body.

This means `apply-seo-fixes.ts` will **silently fail to fix it** — `planPage()`
only rewrites when `page.body.includes(...)`, so it will skip with no error.

Fix by hand in the theme customizer, two places on `/pages/ph-tracking`:
- "A typical healthy range of about **3.8–5.0**"
- "A clear **3.8–5.0** band shows where today sits"

Both should read **3.8–4.5**.

**3. Meta description says "Free on Android" — the app is on iOS too.**
Both store links are already on the page. The description undersells it.
