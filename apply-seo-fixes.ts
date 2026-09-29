import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

try {
  process.loadEnvFile(path.resolve(".env"));
} catch {
  // .env is optional when the vars are already exported in the shell
}

const STORE = process.env.SHOPIFY_STORE?.trim();
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-07";

const APPLY = process.argv.includes("--apply");

if (!STORE) {
  console.error("Missing SHOPIFY_STORE. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (!TOKEN) {
  console.error(
    "Missing SHOPIFY_ADMIN_TOKEN.\n" +
      "Create a custom app with scopes: read_content, write_content, write_online_store_navigation."
  );
  process.exit(1);
}

const ENDPOINT = `https://${STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

// Shopify stores a resource's SEO meta tags in these two metafields. The theme
// reads them as page_title / page_description.
const SEO_NAMESPACE = "global";
const SEO_TITLE_KEY = "title_tag";
const SEO_DESCRIPTION_KEY = "description_tag";

type PageEdit = {
  handle: string;
  seoTitle?: string;
  seoDescription?: string;
  body?: { find: string; replace: string };
  unpublish?: true;
};

const PAGE_EDITS: PageEdit[] = [
  {
    handle: "ph-tracking",
    seoTitle: "Vaginal pH Tracking App | Genesyx",
    seoDescription:
      "Track vaginal pH at home with Genesyx: two-tap logging, the typical 3.8–4.5 range, readings shown in cycle context. Educational, not diagnostic.",
    body: { find: "3.8–5.0", replace: "3.8–4.5" },
  },
  {
    handle: "shettles-method-research-evidence",
    seoDescription:
      "The Shettles Method explained: the original theory, what later studies found, and the current evidence position — with citations to the underlying research.",
  },
  {
    handle: "cycle-awareness",
    seoDescription:
      "See where you are in your cycle, what tends to shift in each phase, and what usually helps. Cycle awareness in the Genesyx app. Educational, not diagnostic.",
  },
  { handle: "landing", unpublish: true },
  { handle: "genesyx-landing", unpublish: true },
  { handle: "journey-guide", unpublish: true },
  { handle: "take-the-quiz", unpublish: true },
  { handle: "desktop", unpublish: true },
  { handle: "copy-of-delete-your-data", unpublish: true },
];

const REDIRECTS: { path: string; target: string }[] = [
  { path: "/pages/vaginal-ph-fertility-science", target: "/pages/ph-tracking" },
  {
    path: "/pages/shettles-method-evidence-limitations",
    target: "/pages/shettles-method-research-evidence",
  },
  {
    path: "/pages/personalise-your-conception-journey_02",
    target: "/pages/personalise-your-conception-journey",
  },
];

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("No data returned");
  }
  return json.data;
}

type PageNode = {
  id: string;
  handle: string;
  title: string;
  isPublished: boolean;
  body: string;
  seoTitle: { value: string } | null;
  seoDescription: { value: string } | null;
};

const PAGES_QUERY = `
  query Pages($cursor: String) {
    pages(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        isPublished
        body
        seoTitle: metafield(namespace: "${SEO_NAMESPACE}", key: "${SEO_TITLE_KEY}") { value }
        seoDescription: metafield(namespace: "${SEO_NAMESPACE}", key: "${SEO_DESCRIPTION_KEY}") { value }
      }
    }
  }
`;

async function fetchPages(): Promise<Map<string, PageNode>> {
  const byHandle = new Map<string, PageNode>();
  let cursor: string | null = null;

  do {
    const data: { pages: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: PageNode[] } } =
      await graphql(PAGES_QUERY, { cursor });
    for (const node of data.pages.nodes) {
      byHandle.set(node.handle, node);
    }
    cursor = data.pages.pageInfo.hasNextPage ? data.pages.pageInfo.endCursor : null;
  } while (cursor);

  return byHandle;
}

const PAGE_UPDATE = `
  mutation PageUpdate($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) {
      page { id handle }
      userErrors { field message }
    }
  }
`;

const REDIRECT_CREATE = `
  mutation RedirectCreate($urlRedirect: UrlRedirectInput!) {
    urlRedirectCreate(urlRedirect: $urlRedirect) {
      urlRedirect { id path target }
      userErrors { field message }
    }
  }
`;

const REDIRECT_QUERY = `
  query Redirects($query: String!) {
    urlRedirects(first: 10, query: $query) {
      nodes { id path target }
    }
  }
`;

type PlannedPage = {
  page: PageNode;
  input: Record<string, unknown>;
  changes: string[];
};

function planPage(edit: PageEdit, page: PageNode): PlannedPage | null {
  const input: Record<string, unknown> = {};
  const changes: string[] = [];
  const metafields: Record<string, unknown>[] = [];

  if (edit.seoTitle && page.seoTitle?.value !== edit.seoTitle) {
    metafields.push({
      namespace: SEO_NAMESPACE,
      key: SEO_TITLE_KEY,
      value: edit.seoTitle,
      type: "single_line_text_field",
    });
    changes.push(`SEO title: ${page.seoTitle?.value ?? "(none)"} -> ${edit.seoTitle}`);
  }

  if (edit.seoDescription && page.seoDescription?.value !== edit.seoDescription) {
    metafields.push({
      namespace: SEO_NAMESPACE,
      key: SEO_DESCRIPTION_KEY,
      value: edit.seoDescription,
      type: "single_line_text_field",
    });
    changes.push(
      `SEO description: ${page.seoDescription?.value ? "(replacing)" : "(none)"} -> ${edit.seoDescription.slice(0, 60)}...`
    );
  }

  if (metafields.length) {
    input.metafields = metafields;
  }

  if (edit.body && page.body.includes(edit.body.find)) {
    const occurrences = page.body.split(edit.body.find).length - 1;
    input.body = page.body.split(edit.body.find).join(edit.body.replace);
    changes.push(`body: ${occurrences}x "${edit.body.find}" -> "${edit.body.replace}"`);
  }

  if (edit.unpublish && page.isPublished) {
    input.isPublished = false;
    changes.push("unpublish (currently published)");
  }

  return changes.length ? { page, input, changes } : null;
}

async function main() {
  console.log(`Store: ${STORE}.myshopify.com  |  API ${API_VERSION}`);
  console.log(APPLY ? "MODE: APPLY (writes to the live store)\n" : "MODE: DRY RUN (no writes)\n");

  const pages = await fetchPages();

  console.log("== PAGE EDITS ==");
  const planned: PlannedPage[] = [];
  for (const edit of PAGE_EDITS) {
    const page = pages.get(edit.handle);
    if (!page) {
      console.log(`  SKIP /pages/${edit.handle} - not found`);
      continue;
    }
    const plan = planPage(edit, page);
    if (!plan) {
      console.log(`  OK   /pages/${edit.handle} - already correct`);
      continue;
    }
    planned.push(plan);
    console.log(`  EDIT /pages/${edit.handle}`);
    for (const change of plan.changes) console.log(`         ${change}`);
  }

  console.log("\n== REDIRECTS ==");
  const toCreate: typeof REDIRECTS = [];
  for (const redirect of REDIRECTS) {
    const existing = await graphql<{ urlRedirects: { nodes: { path: string; target: string }[] } }>(
      REDIRECT_QUERY,
      { query: `path:${redirect.path}` }
    );
    const match = existing.urlRedirects.nodes.find((n) => n.path === redirect.path);
    if (match) {
      console.log(`  OK   ${redirect.path} -> ${match.target} (exists)`);
      continue;
    }
    toCreate.push(redirect);
    console.log(`  NEW  ${redirect.path} -> ${redirect.target}`);
  }

  if (!APPLY) {
    console.log(
      `\nDry run complete: ${planned.length} page edit(s), ${toCreate.length} redirect(s) pending.` +
        "\nRe-run with --apply to write these to the live store."
    );
    return;
  }

  // Page bodies are overwritten in place by the find/replace edits above and
  // Shopify keeps no version history for them. Snapshot every page locally
  // before the first write so a bad edit can be reconstructed by hand.
  const backupDir = path.resolve("backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `pages-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  writeFileSync(backupPath, JSON.stringify(Array.from(pages.values()), null, 2));
  console.log(`\nBacked up ${pages.size} page(s) to ${path.relative(process.cwd(), backupPath)}`);

  console.log("\n== APPLYING ==");
  for (const plan of planned) {
    const result = await graphql<{ pageUpdate: { userErrors: { field: string; message: string }[] } }>(
      PAGE_UPDATE,
      { id: plan.page.id, page: plan.input }
    );
    const errors = result.pageUpdate.userErrors;
    console.log(
      errors.length
        ? `  FAIL /pages/${plan.page.handle}: ${errors.map((e) => e.message).join("; ")}`
        : `  DONE /pages/${plan.page.handle}`
    );
  }

  for (const redirect of toCreate) {
    const result = await graphql<{
      urlRedirectCreate: { userErrors: { field: string; message: string }[] };
    }>(REDIRECT_CREATE, { urlRedirect: redirect });
    const errors = result.urlRedirectCreate.userErrors;
    console.log(
      errors.length
        ? `  FAIL ${redirect.path}: ${errors.map((e) => e.message).join("; ")}`
        : `  DONE ${redirect.path} -> ${redirect.target}`
    );
  }
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
