# Turns PRESENTATION_SCRIPT.md into a shareable A4 PDF.
# Run from the repository root: python docs/submission/script_pdf.py
import pathlib, re, subprocess, sys
import markdown

here = pathlib.Path(__file__).parent
md = (here / "PRESENTATION_SCRIPT.md").read_text(encoding="utf8")
# Code-style file paths read better as plain text for people outside the repo.
md = re.sub(r"`([^`]+)`", r"\1", md)
body = markdown.markdown(md, extensions=["tables", "nl2br"])

css = """
@page { size: A4; margin: 16mm 16mm 18mm; }
* { box-sizing: border-box; }
body { font-family: "Inter", Arial, sans-serif; color: #17122e; font-size: 10.5pt; line-height: 1.5; }
h1 { font-family: "Manrope", Arial, sans-serif; font-size: 22pt; font-weight: 800; letter-spacing: -0.4px; margin: 0 0 4mm; padding-bottom: 3mm; border-bottom: 3px solid #5b3fd9; }
h2 { font-family: "Manrope", Arial, sans-serif; font-size: 15pt; font-weight: 800; color: #5b3fd9; margin: 7mm 0 2.5mm; break-after: avoid; }
h3 { font-family: "Manrope", Arial, sans-serif; font-size: 12pt; font-weight: 800; color: #b8295a; margin: 5mm 0 1.5mm; break-after: avoid; }
p { margin: 0 0 2.2mm; }
hr { border: none; border-top: 1px solid #e6e0f0; margin: 6mm 0; }
blockquote { margin: 0 0 2mm; padding: 2.5mm 4.5mm; background: #f6f3fb; border-left: 4px solid #5b3fd9; border-radius: 2mm; font-size: 12pt; line-height: 1.5; break-inside: avoid; }
blockquote p { margin: 0 0 1.4mm; }
blockquote p:last-child { margin-bottom: 0; }
em { color: #6a6480; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; }
th { text-align: left; background: #f3effa; color: #3d27a8; padding: 2mm 2.5mm; border-bottom: 2px solid #5b3fd9; }
td { padding: 2mm 2.5mm; border-bottom: 1px solid #eee9f5; vertical-align: top; }
tr { break-inside: avoid; }
ul { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1.2mm; }
strong { color: #17122e; }
"""
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ComeBack Demo Day presentation script</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{body}</body></html>"""
if re.search("[–—]", html):
    sys.exit("Dash character found in the script")
tmp = here / "_script.html"
tmp.write_text(html, encoding="utf8")
out = here / "ComeBack Presentation Script.pdf"
node = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto({str(tmp.resolve().as_uri())!r}, {{ waitUntil: 'networkidle' }});
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({{ path: {str(out.resolve())!r}, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#8a849c;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial"><span>ComeBack: Demo Day presentation script</span><span>Page <span class=pageNumber></span> of <span class=totalPages></span></span></div>' }});
  await b.close();
}})();
"""
subprocess.run(["node", "-e", node], check=True, cwd=here.parent.parent)
tmp.unlink()
print(f"Wrote {out}")
