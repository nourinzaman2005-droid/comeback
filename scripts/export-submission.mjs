import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "docs", "submission");
const output = join(source, "exports");
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

for (const name of ["pitch-deck", "solution-overview"]) {
  await page.goto(pathToFileURL(join(source, `${name}.html`)).href, {
    waitUntil: "networkidle",
  });
  await page.pdf({
    path: join(output, `${name}.pdf`),
    width: "16in",
    height: "9in",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
}

await browser.close();
console.log(`Submission PDFs exported to ${output}`);
