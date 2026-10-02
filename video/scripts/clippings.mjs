/*
 * Captures the real source articles as "clippings" for the opening story.
 * Each page is opened, cookie banners are hidden, the key sentence is
 * highlighted, and a crop around it is saved to public/clips-news/.
 *
 *   node scripts/clippings.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "clips-news");
await mkdir(out, { recursive: true });

const ARTICLES = [
  {
    name: "cricket-monthly-hiruka",
    url: "https://www.thecricketmonthly.com/story/1303085/cricket-s-mothers-have-it-better-now-than-ever--but-not-all-of-them",
    find: "her batting fell off quite quickly",
  },
  {
    name: "cricket-monthly-abidi",
    url: "https://www.thecricketmonthly.com/story/1303085/cricket-s-mothers-have-it-better-now-than-ever--but-not-all-of-them",
    find: "My heart sank",
  },
  {
    name: "mlp-aca",
    url: "https://www.mlplaw.co.uk/cricket-australia-has-introduced-maternity-leave-for-the-first-time-how-do-your-maternity-rights-compare/",
    find: "usually signalled the end of her career",
  },
  {
    name: "stuff-satterthwaite",
    url: "https://www.stuff.co.nz/sport/women-in-sport/128764053/a-bit-of-a-shock-amy-satterthwaite-retires-from-white-ferns-after-contract-snub",
    find: "out of the blue",
    withTitle: true,
  },
  {
    name: "icc-release",
    url: "https://www.icc-cricket.com/media-releases/icc-launches-return-to-play-post-pregnancy-guidelines-for-female-cricketers",
    find: "No player should have to choose between motherhood and representing her country",
  },
  {
    name: "pcb-bismah",
    url: "https://www.pcb.com.pk/press-release-detail/bismah-maroof-back-as-pakistan-captain-for-world-cup.html",
    find: "captain",
    withTitle: true,
  },
];

const browser = await chromium.launch({ args: ["--force-device-scale-factor=2"] });
const context = await browser.newContext({
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
});

for (const article of ARTICLES) {
  const page = await context.newPage();
  try {
    await page.goto(article.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    // Dismiss consent dialogs (some live in iframes or shadow roots).
    for (const frame of page.frames()) {
      for (const label of [/reject all/i, /decline/i, /accept all/i, /^accept$/i, /agree/i, /got it/i]) {
        const button = frame.getByRole("button", { name: label }).first();
        if (await button.isVisible().catch(() => false)) {
          await button.click().catch(() => {});
          await page.waitForTimeout(800);
          break;
        }
      }
    }
    const box = await page.evaluate(({ find, withTitle }) => {
      // Hide cookie banners, overlays, sticky headers and ads.
      for (const el of document.querySelectorAll("body *")) {
        const style = getComputedStyle(el);
        const text = (el.id + " " + el.className).toString().toLowerCase();
        if (
          ((style.position === "fixed" || style.position === "sticky") &&
            el.getBoundingClientRect().height < window.innerHeight * 0.9) ||
          /cookie|consent|onetrust|gdpr|banner|newsletter|paywall|modal|popup|advert|ad-slot/.test(text)
        ) {
          el.style.setProperty("display", "none", "important");
        }
      }
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      // Find the paragraph containing the key sentence and highlight it.
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.textContent.indexOf(find);
        if (index < 0) continue;
        const parent = node.parentElement;
        if (!parent || parent.offsetParent === null) continue;
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + find.length);
        const mark = document.createElement("mark");
        mark.style.cssText =
          "background:#ffe066;color:#111 !important;padding:0 3px;border-radius:3px;";
        range.surroundContents(mark);
        const block = mark.closest("p, li, blockquote, div") ?? parent;
        block.scrollIntoView({ block: "center" });
        const target = block.getBoundingClientRect();
        let top = target.top;
        if (withTitle) {
          const heading = document.querySelector("h1");
          if (heading) {
            const h = heading.getBoundingClientRect();
            if (target.bottom - h.top < window.innerHeight * 1.6) top = Math.min(top, h.top);
          }
        }
        return {
          x: Math.max(0, target.left - 36),
          width: target.width + 72,
          y: top - 30,
          bottom: target.bottom + 30,
        };
      }
      return null;
    }, article);
    if (!box) {
      console.log("skip (text not found):", article.name);
      continue;
    }
    // Banners can appear late, so hide them again right before capture.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("body *")) {
        const style = getComputedStyle(el);
        if (style.position === "fixed" || style.position === "sticky")
          el.style.setProperty("display", "none", "important");
      }
      for (const el of document.querySelectorAll("body *")) {
        if (/^\s*Privacy Settings/.test(el.textContent ?? "") && el.children.length < 12)
          el.closest("div")?.style.setProperty("display", "none", "important");
      }
    });
    const scroll = await page.evaluate(() => window.scrollY);
    const y = Math.max(0, box.y + scroll);
    const height = Math.min(1100, Math.max(260, box.bottom - box.y));
    await page.setViewportSize({ width: 1200, height: Math.ceil(y + height - scroll + 200) });
    const file = join(out, `${article.name}.png`);
    await page.screenshot({
      path: file,
      fullPage: true,
      clip: { x: box.x, y, width: Math.min(1200 - box.x, box.width), height },
    });
    console.log("saved", article.name, Math.round(height), "px tall");
  } catch (error) {
    console.log("failed", article.name, error.message.split("\n")[0]);
  } finally {
    await page.close();
  }
}
await browser.close();
