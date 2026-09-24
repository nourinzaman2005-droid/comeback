import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const limit = 40 * 1024 * 1024;
const ignored = new Set([".git", ".next", ".vercel", "node_modules", "coverage", "test-results", "playwright-report"]);
const oversized = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    if (entry.isFile()) {
      const details = await stat(path);
      if (details.size >= limit) oversized.push(`${relative(root, path)} (${details.size} bytes)`);
    }
  }
}

await visit(root);
if (oversized.length) {
  throw new Error(`Files must remain under 40 MB:\n${oversized.join("\n")}`);
}
console.log("All submission files are under 40 MB.");
