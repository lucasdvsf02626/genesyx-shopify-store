import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

try {
  process.loadEnvFile(path.resolve(".env"));
} catch {
  // .env is optional when the vars are already exported in the shell
}

const STORE = process.env.SHOPIFY_STORE?.trim();
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-07";

const outFlag = process.argv.indexOf("--out");
const OUT_DIR = outFlag === -1 ? "content" : (process.argv[outFlag + 1] ?? "");

if (!STORE) {
  console.error("Missing SHOPIFY_STORE. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (!TOKEN) {
  console.error(
    "Missing SHOPIFY_ADMIN_TOKEN.\n" +
      "Create a custom app with the read scopes: read_content, read_products, read_online_store_navigation, read_legal_policies."
  );
  process.exit(1);
}
if (!OUT_DIR || OUT_DIR.startsWith("--")) {
  console.error("--out needs a folder name, for example: --out content");
  process.exit(1);
}

// This script only ever sends GraphQL queries. It never changes the store.
const ENDPOINT = `https://${STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;
const MAX_RETRIES = 3;
const THROTTLE_FLOOR = 300;

// Shopify stores a resource's SEO meta tags in these two metafields (the same
// ones apply-seo-fixes.ts uses).
const SEO_NAMESPACE = "global";
const SEO_TITLE_KEY = "title_tag";
const SEO_DESCRIPTION_KEY = "description_tag";

// With fewer articles than this (across all blogs), the article text is saved too.
const ARTICLE_BODY_LIMIT = 20;

type ThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
  extensions?: { cost?: { throttleStatus?: ThrottleStatus } };
};

type Connection<N> = {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: N[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(status: number) {
  return status === 429 || status >= 500;
}

async function backoff(attempt: number, retryAfter?: string | null) {
  const header = retryAfter ? Number(retryAfter) : NaN;
  const waitMs = Number.isFinite(header)
    ? header * 1000
    : Math.min(2 ** attempt * 500, 8000) + Math.random() * 250;
  await sleep(waitMs);
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN!,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (isRetryable(res.status) && attempt < MAX_RETRIES) {
      await backoff(attempt, res.headers.get("retry-after"));
      continue;
    }

    if (!res.ok) {
      throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
    }

    const body = (await res.json()) as GraphQLResponse<T>;

    if (body.errors?.length) {
      const throttled = body.errors.some((e) => e.extensions?.code === "THROTTLED");
      if (throttled && attempt < MAX_RETRIES) {
        await backoff(attempt);
        continue;
      }
      throw new Error(body.errors.map((e) => e.message).join("; "));
    }
    if (!body.data) {
      throw new Error(`Unexpected GraphQL response: ${JSON.stringify(body).slice(0, 500)}`);
    }

    const throttle = body.extensions?.cost?.throttleStatus;
    if (throttle && throttle.currentlyAvailable < THROTTLE_FLOOR) {
      const deficit = THROTTLE_FLOOR - throttle.currentlyAvailable;
      const waitMs = Math.ceil((deficit / throttle.restoreRate) * 1000);
      console.log(`  throttle low (${throttle.currentlyAvailable}), waiting ${waitMs}ms`);
      await sleep(waitMs);
    }

    return body.data;
  }
  throw new Error("GraphQL request failed after retries");
}

// Follows the cursor until the connection is exhausted.
async function fetchAll<D, N>(query: string, pick: (data: D) => Connection<N>): Promise<N[]> {
  const all: N[] = [];
  let cursor: string | null = null;
  do {
    const data: D = await graphql<D>(query, { cursor });
    const connection = pick(data);
    all.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);
  return all;
}

// Some lists sit inside another list and are read in one go (no cursor).
// If one is ever longer than the limit, say so rather than saving a short list.
function warnIfCut(label: string, connection: { pageInfo: { hasNextPage: boolean } }) {
  if (connection.pageInfo.hasNextPage) {
    console.warn(`  WARNING ${label} has more entries than were read; the saved list is cut short.`);
  }
}

// Plain code-point comparison, so the order never depends on the computer's language settings.
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Handles land in a file name we write to, so strip anything that could leave the output folder.
function sanitize(name: string): string {
  const flat = path.basename(name).replace(/[/\\\0]/g, "_").trim();
  return flat === "" || flat === "." || flat === ".." ? "file" : flat;
}

async function writeJson(file: string, value: unknown) {
  const dest = path.join(OUT_DIR, file);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, JSON.stringify(value, null, 2) + "\n");
}

// Writes each text exactly as Shopify returned it, then removes .html files in
// that folder that are no longer in the store, so the folder always matches.
async function writeHtmlFiles(dir: string, files: Map<string, string>) {
  const folder = path.join(OUT_DIR, dir);
  await mkdir(folder, { recursive: true });
  for (const [name, html] of files) {
    await writeFile(path.join(folder, `${sanitize(name)}.html`), html);
  }
  const keep = new Set([...files.keys()].map((name) => `${sanitize(name)}.html`));
  for (const entry of await readdir(folder)) {
    if (entry.endsWith(".html") && !keep.has(entry)) {
      await unlink(path.join(folder, entry));
    }
  }
}

type Seo = { title: string | null; description: string | null };

// ---------------------------------------------------------------- pages

type PageNode = {
  handle: string;
  title: string;
  templateSuffix: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
  body: string;
  seoTitle: { value: string } | null;
  seoDescription: { value: string } | null;
};

const PAGES_QUERY = `
  query Pages($cursor: String) {
    pages(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        templateSuffix
        isPublished
        publishedAt
        updatedAt
        body
        seoTitle: metafield(namespace: "${SEO_NAMESPACE}", key: "${SEO_TITLE_KEY}") { value }
        seoDescription: metafield(namespace: "${SEO_NAMESPACE}", key: "${SEO_DESCRIPTION_KEY}") { value }
      }
    }
  }
`;

async function exportPages(): Promise<string> {
  const nodes = await fetchAll<{ pages: Connection<PageNode> }, PageNode>(PAGES_QUERY, (d) => d.pages);
  nodes.sort((a, b) => compare(a.handle, b.handle));

  await writeJson(
    "pages.json",
    nodes.map((p) => ({
      handle: p.handle,
      title: p.title,
      templateSuffix: p.templateSuffix,
      isPublished: p.isPublished,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      seo: { title: p.seoTitle?.value ?? null, description: p.seoDescription?.value ?? null },
    }))
  );
  await writeHtmlFiles("pages", new Map(nodes.map((p) => [p.handle, p.body])));
  return `${nodes.length} pages`;
}

// ---------------------------------------------------------------- products

type ProductNode = {
  handle: string;
  title: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  templateSuffix: string | null;
  descriptionHtml: string;
  seo: Seo;
  options: { name: string; values: string[] }[];
  variants: Connection<{
    title: string;
    sku: string | null;
    price: string;
    compareAtPrice: string | null;
    inventoryPolicy: string;
    availableForSale: boolean;
  }>;
  media: Connection<{
    alt: string | null;
    preview: { image: { url: string } | null } | null;
    image?: { url: string } | null;
  }>;
};

// Small pages: each product asks for its variants and media too, and Shopify
// rejects a single query that costs too much.
const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 5, after: $cursor, sortKey: ID) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        status
        productType
        vendor
        tags
        templateSuffix
        descriptionHtml
        seo { title description }
        options { name values }
        variants(first: 50) {
          pageInfo { hasNextPage }
          nodes { title sku price compareAtPrice inventoryPolicy availableForSale }
        }
        media(first: 50) {
          pageInfo { hasNextPage }
          nodes {
            alt
            preview { image { url } }
            ... on MediaImage { image { url } }
          }
        }
      }
    }
  }
`;

type SavedProduct = {
  handle: string;
  title: string;
  status: string | null;
  productType: string;
  vendor: string;
  tags: string[];
  templateSuffix: string | null;
  seo: Seo;
  options: { name: string; values: string[] }[];
  variants: {
    title: string;
    sku: string | null;
    price: string;
    compareAtPrice: string | null;
    inventoryPolicy: string | null;
    availableForSale: boolean;
  }[];
  media: { alt: string | null; url: string | null }[];
};

async function saveProducts(products: SavedProduct[], descriptions: Map<string, string>) {
  products.sort((a, b) => compare(a.handle, b.handle));
  await writeJson("products.json", products);
  await writeHtmlFiles("products", descriptions);
}

async function exportProducts(): Promise<string> {
  const nodes = await fetchAll<{ products: Connection<ProductNode> }, ProductNode>(
    PRODUCTS_QUERY,
    (d) => d.products
  );

  // Options, variants and media keep Shopify's own order: that order is meaningful.
  await saveProducts(
    nodes.map((p) => {
      warnIfCut(`Variants of ${p.handle}`, p.variants);
      warnIfCut(`Media of ${p.handle}`, p.media);
      return {
        handle: p.handle,
        title: p.title,
        status: p.status,
        productType: p.productType,
        vendor: p.vendor,
        tags: [...p.tags].sort(compare),
        templateSuffix: p.templateSuffix,
        seo: { title: p.seo.title, description: p.seo.description },
        options: p.options.map((o) => ({ name: o.name, values: o.values })),
        variants: p.variants.nodes.map((v) => ({
          title: v.title,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          inventoryPolicy: v.inventoryPolicy,
          availableForSale: v.availableForSale,
        })),
        media: p.media.nodes.map((m) => ({
          alt: m.alt,
          url: m.image?.url ?? m.preview?.image?.url ?? null,
        })),
      };
    }),
    new Map(nodes.map((p) => [p.handle, p.descriptionHtml]))
  );
  return `${nodes.length} products`;
}

// ---------------------------------------------------------------- collections

type CollectionNode = {
  handle: string;
  title: string;
  templateSuffix: string | null;
  descriptionHtml: string;
  products: Connection<{ handle: string }>;
};

const COLLECTIONS_QUERY = `
  query Collections($cursor: String) {
    collections(first: 10, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        templateSuffix
        descriptionHtml
        products(first: 50) {
          pageInfo { hasNextPage }
          nodes { handle }
        }
      }
    }
  }
`;

type SavedCollection = {
  handle: string;
  title: string;
  templateSuffix: string | null;
  descriptionHtml: string;
  products: string[];
};

async function saveCollections(collections: SavedCollection[]) {
  collections.sort((a, b) => compare(a.handle, b.handle));
  await writeJson("collections.json", collections);
}

async function exportCollections(): Promise<string> {
  const nodes = await fetchAll<{ collections: Connection<CollectionNode> }, CollectionNode>(
    COLLECTIONS_QUERY,
    (d) => d.collections
  );

  await saveCollections(
    nodes.map((c) => {
      warnIfCut(`Products in collection ${c.handle}`, c.products);
      return {
        handle: c.handle,
        title: c.title,
        templateSuffix: c.templateSuffix,
        descriptionHtml: c.descriptionHtml,
        products: c.products.nodes.map((p) => p.handle).sort(compare),
      };
    })
  );
  return `${nodes.length} collections`;
}

// ---------------------------------------------------------------- menus

type MenuItemNode = { title: string; type: string; url: string; items?: MenuItemNode[] };
type MenuNode = { handle: string; title: string; items: MenuItemNode[] };

const MENU_ITEM = "title type url";
const MENUS_QUERY = `
  query Menus($cursor: String) {
    menus(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        items { ${MENU_ITEM} items { ${MENU_ITEM} items { ${MENU_ITEM} } } }
      }
    }
  }
`;

type SavedMenuItem = { title: string; type: string; url: string; items?: SavedMenuItem[] };

function saveMenuItems(items: MenuItemNode[]): SavedMenuItem[] {
  return items.map((i) => ({
    title: i.title,
    type: i.type,
    url: i.url,
    ...(i.items?.length ? { items: saveMenuItems(i.items) } : {}),
  }));
}

async function exportMenus(): Promise<string> {
  const nodes = await fetchAll<{ menus: Connection<MenuNode> }, MenuNode>(MENUS_QUERY, (d) => d.menus);
  nodes.sort((a, b) => compare(a.handle, b.handle));

  await writeJson(
    "menus.json",
    nodes.map((m) => ({ handle: m.handle, title: m.title, items: saveMenuItems(m.items) }))
  );
  return `${nodes.length} menus`;
}

// ---------------------------------------------------------------- redirects

type RedirectNode = { path: string; target: string };

const REDIRECTS_QUERY = `
  query Redirects($cursor: String) {
    urlRedirects(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { path target }
    }
  }
`;

async function exportRedirects(): Promise<string> {
  const nodes = await fetchAll<{ urlRedirects: Connection<RedirectNode> }, RedirectNode>(
    REDIRECTS_QUERY,
    (d) => d.urlRedirects
  );
  nodes.sort((a, b) => compare(a.path, b.path) || compare(a.target, b.target));

  await writeJson(
    "redirects.json",
    nodes.map((r) => ({ path: r.path, target: r.target }))
  );
  return `${nodes.length} redirects`;
}

// ---------------------------------------------------------------- blogs

type BlogNode = {
  handle: string;
  title: string;
  articles: Connection<{
    handle: string;
    title: string;
    isPublished: boolean;
    publishedAt: string | null;
    body: string;
  }>;
};

const BLOGS_QUERY = `
  query Blogs($cursor: String) {
    blogs(first: 5, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        articles(first: 100) {
          pageInfo { hasNextPage }
          nodes { handle title isPublished publishedAt body }
        }
      }
    }
  }
`;

async function exportBlogs(): Promise<string> {
  const nodes = await fetchAll<{ blogs: Connection<BlogNode> }, BlogNode>(BLOGS_QUERY, (d) => d.blogs);
  nodes.sort((a, b) => compare(a.handle, b.handle));
  for (const b of nodes) {
    b.articles.nodes.sort((a, c) => compare(a.handle, c.handle));
    warnIfCut(`Articles in blog ${b.handle}`, b.articles);
  }

  const articleCount = nodes.reduce((sum, b) => sum + b.articles.nodes.length, 0);
  await writeJson(
    "blogs.json",
    nodes.map((b) => ({
      handle: b.handle,
      title: b.title,
      articles: b.articles.nodes.map((a) => ({
        handle: a.handle,
        title: a.title,
        isPublished: a.isPublished,
        publishedAt: a.publishedAt,
      })),
    }))
  );

  const withBodies = articleCount > 0 && articleCount < ARTICLE_BODY_LIMIT;
  if (withBodies) {
    const bodies = new Map<string, string>();
    for (const b of nodes) {
      for (const a of b.articles.nodes) bodies.set(`${b.handle}--${a.handle}`, a.body);
    }
    await writeHtmlFiles("articles", bodies);
  }
  return `${nodes.length} blogs, ${articleCount} articles${withBodies ? " (with text)" : " (titles only)"}`;
}

// ---------------------------------------------------------------- policies

type PolicyNode = { type: string; title: string; url: string; body: string };

const POLICIES_QUERY = `
  query Policies {
    shop {
      shopPolicies { type title url body }
    }
  }
`;

async function exportPolicies(): Promise<string> {
  const data = await graphql<{ shop: { shopPolicies: PolicyNode[] } }>(POLICIES_QUERY);
  const nodes = [...data.shop.shopPolicies].sort((a, b) => compare(a.type, b.type));

  await writeJson(
    "policies.json",
    nodes.map((p) => ({ type: p.type, title: p.title, url: p.url, body: p.body }))
  );
  return `${nodes.length} policies`;
}

// ---------------------------------------------------------------- fallback: public storefront
//
// Used for products and collections ONLY, and ONLY when the Admin API refuses
// access to them. It reads the shop's public JSON feeds instead. Those carry
// less detail (no status, template or SEO fields, which are saved as null) and
// the screen output says when this happened. Menus, redirects and the rest have
// no public source and are never filled this way.

const PUBLIC_SITE = "https://genesyx.co.uk";

function isAccessProblem(err: unknown) {
  return /access denied|required access|access scope|HTTP 40[13]/i.test((err as Error).message);
}

async function publicJson<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(`${PUBLIC_SITE}${pathAndQuery}`);
  if (!res.ok) {
    throw new Error(`Public storefront HTTP ${res.status} for ${pathAndQuery}`);
  }
  return (await res.json()) as T;
}

type PublicProduct = {
  handle: string;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  tags: string[];
  options: { name: string; values: string[] }[];
  variants: {
    title: string;
    sku: string | null;
    price: string;
    compare_at_price: string | null;
    available: boolean;
  }[];
  images: { src: string; alt?: string | null }[];
};

async function exportProductsPublic(): Promise<string> {
  const { products } = await publicJson<{ products: PublicProduct[] }>("/products.json?limit=250");
  if (products.length >= 250) {
    console.warn("  WARNING the public feed returned 250 products; there may be more.");
  }

  await saveProducts(
    products.map((p) => ({
      handle: p.handle,
      title: p.title,
      status: null,
      productType: p.product_type,
      vendor: p.vendor,
      tags: [...p.tags].sort(compare),
      templateSuffix: null,
      seo: { title: null, description: null },
      options: p.options.map((o) => ({ name: o.name, values: o.values })),
      variants: p.variants.map((v) => ({
        title: v.title,
        sku: v.sku || null,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        inventoryPolicy: null,
        availableForSale: v.available,
      })),
      media: p.images.map((i) => ({ alt: i.alt ?? null, url: i.src })),
    })),
    new Map(products.map((p) => [p.handle, p.body_html ?? ""]))
  );
  return `${products.length} products`;
}

async function exportCollectionsPublic(): Promise<string> {
  const { collections } = await publicJson<{
    collections: { handle: string; title: string; description: string | null }[];
  }>("/collections.json?limit=250");

  const saved: SavedCollection[] = [];
  for (const c of collections) {
    const { products } = await publicJson<{ products: { handle: string }[] }>(
      `/collections/${encodeURIComponent(c.handle)}/products.json?limit=250`
    );
    saved.push({
      handle: c.handle,
      title: c.title,
      templateSuffix: null,
      descriptionHtml: c.description ?? "",
      products: products.map((p) => p.handle).sort(compare),
    });
  }
  await saveCollections(saved);
  return `${saved.length} collections`;
}

// Runs the Admin API version. If Shopify refuses access, runs the public version instead.
function withPublicFallback(
  name: string,
  adminRun: () => Promise<string>,
  publicRun: () => Promise<string>
): () => Promise<string> {
  return async () => {
    try {
      return await adminRun();
    } catch (err) {
      if (!isAccessProblem(err)) throw err;
      console.log(
        `  NOTE ${name}: Admin API access refused (${(err as Error).message.slice(0, 160)}). ` +
          "Using public storefront data instead."
      );
      return `${await publicRun()}, from public storefront data (less detail)`;
    }
  };
}

// ---------------------------------------------------------------- run

type SectionResult = { name: string; written: boolean };

async function main() {
  console.log(`Store:    ${STORE}.myshopify.com`);
  console.log(`Source:   Admin API ${API_VERSION} (read-only queries)`);
  console.log(`Output:   ${OUT_DIR}/\n`);

  await mkdir(OUT_DIR, { recursive: true });

  const sections: [string, () => Promise<string>][] = [
    ["pages", exportPages],
    ["products", withPublicFallback("products", exportProducts, exportProductsPublic)],
    ["collections", withPublicFallback("collections", exportCollections, exportCollectionsPublic)],
    ["menus", exportMenus],
    ["redirects", exportRedirects],
    ["blogs", exportBlogs],
    ["policies", exportPolicies],
  ];

  const results: SectionResult[] = [];
  for (const [name, run] of sections) {
    try {
      console.log(`  DONE ${name}: ${await run()}`);
      results.push({ name, written: true });
    } catch (err) {
      console.log(`  SKIP ${name}: ${(err as Error).message}`);
      results.push({ name, written: false });
    }
  }

  const skipped = results.filter((r) => !r.written).map((r) => r.name);
  console.log(`\nWritten:  ${results.filter((r) => r.written).length} of ${results.length} sections`);
  if (skipped.length) {
    console.log(`Skipped:  ${skipped.join(", ")} (see the reasons above; usually the API token lacks that permission)`);
  }

  if (!results.find((r) => r.name === "pages")?.written) {
    console.error("\nPages could not be exported, so nothing useful was saved.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
