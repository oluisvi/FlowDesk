import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const required = [
  "FLOWDESK_HYPER_MASTER_CODEX_PROMPT.md",
  "FlowDesk — Discovery - Briefing Inicial.md",
  "HYPER_MASTER_v3.md",
  "AGENTS.md",
  "README.md",
  "docs/ARCHITECTURE.md",
  "docs/SECURITY.md",
  "apps/api/prisma/schema.prisma",
  "apps/api/prisma/seed.ts",
  "apps/api/src/workflows/workflow-engine.service.ts",
  "apps/api/src/workflows/automation-actions.service.ts",
  "apps/api/src/outbox/outbox-dispatcher.service.ts",
  "apps/api/src/worker/main.ts",
  "apps/api/test/auth.integration-spec.ts",
  "apps/api/test/operations.integration-spec.ts",
  "apps/api/test/tenant-security.integration-spec.ts",
  "apps/api/test/workflow-engine.e2e-spec.ts",
  "packages/shared/src/contracts/health.test.ts",
  "apps/web/app/app/page.tsx",
  "apps/web/app/app/clients/page.tsx",
  "apps/web/app/app/projects/page.tsx",
  "apps/web/app/app/tasks/page.tsx",
  "apps/web/app/app/board/page.tsx",
  "apps/web/app/app/workflows/page.tsx",
  "apps/web/app/app/activity/page.tsx",
  "apps/web/app/app/notifications/page.tsx",
  "apps/web/app/app/settings/page.tsx",
  "apps/web/src/features/kanban/kanban-board.tsx",
  "apps/web/src/features/workflows/workflow-builder.tsx",
  "apps/web/src/features/workflows/workflow-editor-page.tsx",
  "apps/web/e2e/workflow.spec.ts",
  "render.yaml",
  "apps/web/vercel.json",
];

const problems = [];
for (const file of required) {
  if (!existsSync(join(root, file))) problems.push(`missing required file: ${file}`);
}

const ignoredDirs = new Set(["node_modules", ".next", "dist", ".git", "coverage", "test-results", "playwright-report"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".yml", ".yaml", ".css", ".prisma", ".sql"]);
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const absolute = join(dir, name);
    const stat = statSync(absolute);
    if (stat.isDirectory()) walk(absolute);
    else if (textExtensions.has(extname(name)) || name.startsWith(".")) files.push(absolute);
  }
}
walk(root);

const sourceFiles = files.filter((file) => /\.(?:ts|tsx|js|mjs|cjs)$/.test(file));
const importPattern = /(?:from\s+["']|import\s*["'])(\.{1,2}\/[^"']+)["']/g;
for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  if (/\beval\s*\(|new\s+Function\s*\(/.test(content)) {
    problems.push(`arbitrary code execution primitive in ${relative(root, file)}`);
  }
  let match;
  while ((match = importPattern.exec(content))) {
    const spec = match[1];
    const base = resolve(dirname(file), spec);
    const candidates = extname(base)
      ? [base, base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx")]
      : [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, join(base, "index.ts"), join(base, "index.tsx")];
    if (!candidates.some(existsSync)) {
      problems.push(`missing relative import ${spec} from ${relative(root, file)}`);
    }
  }
}

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
}).split("\0");
const generatedSegments = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
]);
const trackedGenerated = trackedFiles.filter((file) =>
  file.split(/[\\/]/).some((segment) => generatedSegments.has(segment)),
);
if (trackedGenerated.length) {
  problems.push(`generated files tracked: ${trackedGenerated.join(", ")}`);
}

const env = readFileSync(join(root, ".env.example"), "utf8");
if (!env.includes("NEXT_PUBLIC_API_URL=/api/v1")) problems.push("web API URL must remain same-origin in .env.example");
const readme = readFileSync(join(root, "README.md"), "utf8");
if (readme.includes("NEXT_PUBLIC_API_URL=https://")) problems.push("README documents a cross-origin refresh-cookie configuration");

if (problems.length) {
  console.error(`Static release audit failed (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`Static release audit passed (${files.length} text files inspected).`);
