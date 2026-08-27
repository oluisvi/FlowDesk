import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const ALLOWED = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".css", ".md", ".yaml", ".yml", ".prisma", ".sql", ".toml"]);
const SKIP = new Set(["node_modules", ".git", ".next", "dist", "coverage", "test-results", "playwright-report"]);
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!ALLOWED.has(extname(entry.name)) && ![".editorconfig", ".gitignore", ".gitattributes", ".npmrc", ".node-version", ".env.example"].includes(entry.name)) continue;
    const text = await readFile(path, "utf8");
    const name = relative(ROOT, path);
    if (text.includes("\r\n")) failures.push(`${name}: CRLF line endings`);
    if (text.length && !text.endsWith("\n")) failures.push(`${name}: missing final newline`);
    text.split("\n").forEach((line, index) => {
      if (/[ \t]+$/.test(line)) failures.push(`${name}:${index + 1}: trailing whitespace`);
    });
  }
}

await walk(ROOT);
if (failures.length) {
  console.error("Source formatting hygiene failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Source formatting hygiene passed.");
