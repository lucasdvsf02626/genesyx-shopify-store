import { mkdir, readFile, writeFile, stat, rename, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

try {
  process.loadEnvFile(path.resolve(".env"));
} catch {
  // .env is optional when the vars are already exported in the shell
}

const STORE = process.env.SHOPIFY_STORE?.trim();
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-07";

const fromFlag = process.argv.indexOf("--from");
// Metadata source override: reads pre-fetched GraphQL nodes from disk so the
// downloader can run without an Admin token.
const FROM_FILE = fromFlag === -1 ? null : process.argv[fromFlag + 1];

if (!STORE) {
  console.error("Missing SHOPIFY_STORE. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (!TOKEN && !FROM_FILE) {
  console.error(
    "Missing SHOPIFY_ADMIN_TOKEN.\n" +
      "Either fill it into .env, or run with --from <file.json> to use pre-fetched metadata."
  );
  process.exit(1);
}

const IMAGES_ONLY = process.argv.includes("--images-only");
const CONCURRENCY = 6;
const MAX_RETRIES = 3;
const PAGE_SIZE = 250;
const THROTTLE_FLOOR = 300;

const ENDPOINT = `https://${STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;
const OUT_DIR = path.join("exports", STORE);
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

type VideoSource = {
  url: string;
  mimeType: string;
  format: string;
  height: number;
  width: number;
  fileSize: number | null;
};

type FileNode = {
  __typename: string;
  id: string;
  alt: string | null;
  createdAt: string;
  fileStatus: string;
  mimeType?: string | null;
  image?: { url: string } | null;
  originalSource?: { fileSize: number | null } | null;
  url?: string | null;
  originalFileSize?: number | null;
  filename?: string;
  sources?: VideoSource[];
};

type ThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
};

type Target = {
  id: string;
  type: string;
  filename: string;
  url: string;
  alt: string | null;
  createdAt: string;
  expectedSize: number | null;
};

type ManifestEntry = {
  id: string;
  type: string;
  filename: string;
  url: string;
  alt: string | null;
  createdAt: string;
  bytes: number;
};

const QUERY = /* GraphQL */ `
  query ExportFiles($first: Int!, $cursor: String) {
    files(first: $first, after: $cursor, sortKey: CREATED_AT, reverse: false) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        __typename
        id
        alt
        createdAt
        fileStatus
        ... on MediaImage {
          mimeType
          image {
            url
          }
          originalSource {
            fileSize
          }
        }
        ... on GenericFile {
          url
          mimeType
          originalFileSize
        }
        ... on Video {
          filename
          sources {
            url
            mimeType
            format
            height
            width
            fileSize
          }
        }
      }
    }
  }
`;

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

async function graphql(cursor: string | null): Promise<{
  nodes: FileNode[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN!,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { first: PAGE_SIZE, cursor },
      }),
    });

    if (isRetryable(res.status) && attempt < MAX_RETRIES) {
      await backoff(attempt, res.headers.get("retry-after"));
      continue;
    }

    if (!res.ok) {
      throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
    }

    const body = (await res.json()) as {
      data?: { files?: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: FileNode[] } };
      errors?: unknown;
      extensions?: { cost?: { throttleStatus?: ThrottleStatus } };
    };

    if (body.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
    }
    if (!body.data?.files) {
      throw new Error(`Unexpected GraphQL response: ${JSON.stringify(body).slice(0, 500)}`);
    }

    const throttle = body.extensions?.cost?.throttleStatus;
    if (throttle && throttle.currentlyAvailable < THROTTLE_FLOOR) {
      const deficit = THROTTLE_FLOOR - throttle.currentlyAvailable;
      const waitMs = Math.ceil((deficit / throttle.restoreRate) * 1000);
      console.log(`  throttle low (${throttle.currentlyAvailable}), waiting ${waitMs}ms`);
      await sleep(waitMs);
    }

    return {
      nodes: body.data.files.nodes,
      hasNextPage: body.data.files.pageInfo.hasNextPage,
      endCursor: body.data.files.pageInfo.endCursor,
    };
  }
  throw new Error("GraphQL request failed after retries");
}

const UUID_SUFFIX = /_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[^.]+$)/i;

function nameFromUrl(rawUrl: string): string {
  const { pathname } = new URL(rawUrl);
  let base = decodeURIComponent(pathname.split("/").pop() || "file");
  base = base.replace(UUID_SUFFIX, "");
  return sanitize(base);
}

// Filenames land in a path we write to, so strip anything that could escape OUT_DIR.
function sanitize(name: string): string {
  const flat = path.basename(name).replace(/[/\\\0]/g, "_").trim();
  return flat === "" || flat === "." || flat === ".." ? "file" : flat;
}

function bestVideoSource(sources: VideoSource[]): VideoSource | null {
  const playable = sources.filter(
    (s) => s.format !== "m3u8" && !s.mimeType.toLowerCase().includes("mpegurl")
  );
  if (playable.length === 0) return null;
  return playable.reduce((best, s) =>
    (s.fileSize ?? s.width * s.height) > (best.fileSize ?? best.width * best.height) ? s : best
  );
}

function toTarget(node: FileNode): Target | null {
  if (node.fileStatus !== "READY") return null;

  if (node.__typename === "MediaImage") {
    const url = node.image?.url;
    if (!url) return null;
    return {
      id: node.id,
      type: node.__typename,
      filename: nameFromUrl(url),
      url,
      alt: node.alt,
      createdAt: node.createdAt,
      expectedSize: node.originalSource?.fileSize ?? null,
    };
  }

  if (IMAGES_ONLY) return null;

  if (node.__typename === "GenericFile") {
    const url = node.url;
    if (!url) return null;
    return {
      id: node.id,
      type: node.__typename,
      filename: nameFromUrl(url),
      url,
      alt: node.alt,
      createdAt: node.createdAt,
      expectedSize: node.originalFileSize ?? null,
    };
  }

  if (node.__typename === "Video") {
    const source = bestVideoSource(node.sources ?? []);
    if (!source) return null;
    let filename = sanitize(node.filename || nameFromUrl(source.url));
    if (!path.extname(filename)) filename += `.${source.format}`;
    return {
      id: node.id,
      type: node.__typename,
      filename,
      url: source.url,
      alt: node.alt,
      createdAt: node.createdAt,
      expectedSize: source.fileSize ?? null,
    };
  }

  return null;
}

async function loadPreviousManifest(): Promise<Map<string, ManifestEntry>> {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    const entries = JSON.parse(raw) as ManifestEntry[];
    return new Map(entries.map((e) => [e.id, e]));
  } catch {
    return new Map();
  }
}

async function* streamNodes(): AsyncGenerator<FileNode[]> {
  if (FROM_FILE) {
    const raw = await readFile(path.resolve(FROM_FILE), "utf8");
    yield JSON.parse(raw) as FileNode[];
    return;
  }
  let cursor: string | null = null;
  do {
    const { nodes, hasNextPage, endCursor } = await graphql(cursor);
    yield nodes;
    cursor = hasNextPage ? endCursor : null;
  } while (cursor);
}

async function fetchAll(): Promise<Target[]> {
  const targets: Target[] = [];
  // Ascending CREATED_AT keeps ordering stable across runs, so collision suffixes
  // (-2, -3) stay pinned to the same files when new uploads appear later.
  const used = new Map<string, number>();
  let seen = 0;

  for await (const nodes of streamNodes()) {
    seen += nodes.length;
    process.stdout.write(`\rReading metadata… ${seen} files`);

    for (const node of nodes) {
      const target = toTarget(node);
      if (!target) continue;
      const count = used.get(target.filename) ?? 0;
      used.set(target.filename, count + 1);
      if (count > 0) {
        const ext = path.extname(target.filename);
        const stem = target.filename.slice(0, target.filename.length - ext.length);
        target.filename = `${stem}-${count + 1}${ext}`;
      }
      targets.push(target);
    }
  }

  process.stdout.write("\n");
  return targets;
}

type Outcome = "downloaded" | "skipped" | "failed";

async function downloadOne(
  target: Target,
  prev: Map<string, ManifestEntry>,
  results: Map<string, { outcome: Outcome; bytes: number }>
) {
  const dest = path.join(OUT_DIR, target.filename);
  const known = prev.get(target.id);

  try {
    const st = await stat(dest);
    const matches =
      st.size > 0 &&
      ((target.expectedSize !== null && st.size === target.expectedSize) ||
        (known !== undefined && st.size === known.bytes));
    if (matches) {
      results.set(target.id, { outcome: "skipped", bytes: st.size });
      return;
    }
  } catch {
    // not on disk yet
  }

  const tmp = `${dest}.part`;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(target.url);
      if (isRetryable(res.status) && attempt < MAX_RETRIES) {
        await backoff(attempt, res.headers.get("retry-after"));
        continue;
      }
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(tmp));

      const { size } = await stat(tmp);
      // Rename only after a complete write, so an interrupted run never leaves a
      // truncated file that the skip check would later treat as already done.
      await rename(tmp, dest);
      results.set(target.id, { outcome: "downloaded", bytes: size });
      return;
    } catch (err) {
      await unlink(tmp).catch(() => {});
      if (attempt >= MAX_RETRIES) {
        console.error(`\n  FAILED ${target.filename}: ${(err as Error).message}`);
        results.set(target.id, { outcome: "failed", bytes: 0 });
        return;
      }
      await backoff(attempt);
    }
  }
}

async function run() {
  console.log(`Store:    ${STORE}.myshopify.com`);
  console.log(`Source:   ${FROM_FILE ? FROM_FILE : `Admin API ${API_VERSION}`}`);
  console.log(`Output:   ${OUT_DIR}/`);
  console.log(`Mode:     ${IMAGES_ONLY ? "images only" : "all files"}\n`);

  await mkdir(OUT_DIR, { recursive: true });

  const prev = await loadPreviousManifest();
  const targets = await fetchAll();
  if (targets.length === 0) {
    console.log("No downloadable files found.");
    return;
  }

  const results = new Map<string, { outcome: Outcome; bytes: number }>();
  let done = 0;
  const queue = [...targets];

  const worker = async () => {
    for (;;) {
      const target = queue.shift();
      if (!target) return;
      await downloadOne(target, prev, results);
      done++;
      process.stdout.write(`\rDownloading… ${done}/${targets.length}`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n\n");

  const manifest: ManifestEntry[] = targets.map((t) => ({
    id: t.id,
    type: t.type,
    filename: t.filename,
    url: t.url,
    alt: t.alt,
    createdAt: t.createdAt,
    bytes: results.get(t.id)?.bytes ?? 0,
  }));
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  const tally = (o: Outcome) => [...results.values()].filter((r) => r.outcome === o).length;
  const downloadedBytes = [...results.values()]
    .filter((r) => r.outcome === "downloaded")
    .reduce((sum, r) => sum + r.bytes, 0);

  console.log(`Total:      ${targets.length}`);
  console.log(`Downloaded: ${tally("downloaded")} (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Skipped:    ${tally("skipped")}`);
  console.log(`Failed:     ${tally("failed")}`);
  console.log(`\nManifest:   ${MANIFEST_PATH}`);
}

run().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
