// Builds the Demo Day pitch deck PDF (16:9, light theme for projectors).
// Run from the repository root: node docs/submission/deck/build.mjs
// Images live in docs/submission/deck/assets (git-ignored: it holds third-party broadcast frames).
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const out = join(here, "..", "ComeBack Pitch Deck.pdf");
const logo = readFileSync(join(root, "public", "icon.svg"), "utf8");

const L = {
  app: "https://nourinzaman2005-droid.github.io/comeback/",
  video: "https://youtu.be/HjBi7i1aPt8",
  code: "https://github.com/nourinzaman2005-droid/comeback",
  icc: "https://www.icc-cricket.com/media-releases/icc-launches-return-to-play-post-pregnancy-guidelines-for-female-cricketers",
  tcm: "https://www.thecricketmonthly.com/story/1303085/cricket-s-mothers-have-it-better-now-than-ever--but-not-all-of-them",
  mlp: "https://www.mlplaw.co.uk/cricket-australia-has-introduced-maternity-leave-for-the-first-time-how-do-your-maternity-rights-compare/",
  fifa: "https://www.ualberta.ca/en/folio/2026/07/keeping-moms-in-the-game-fifa-launches-guide-for-pregnant-postpartum-players.html",
  goom: "https://www.running-physio.com/postnatal-guide/",
  sixrs: "https://www.researchgate.net/publication/356576564_Reframing_return-to-sport_postpartum_the_6_Rs_framework",
  pose: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12940220/",
};
const a = (href, text) => `<a href="${href}">${text}</a>`;
const img = (name) => `assets/${name}`;
const frame = (name, alt, url = "comeback app") =>
  `<div class="frame"><div class="bar"><i></i><i></i><i></i><span>${url}</span></div><img src="${img(name)}" alt="${alt}"></div>`;
const cutout = (name, alt, tone, tag, caption) =>
  `<figure class="col cut"><div class="blob ${tone}"></div><img class="sticker" src="${img(name)}" alt="${alt}">${tag ? `<span class="tag">${tag}</span>` : ""}<figcaption>${caption}</figcaption></figure>`;

const SECTIONS = { story: "The story", problem: "The problem", solution: "The solution", close: "Why ComeBack", appendix: "Appendix" };

// Each slide: section, kicker (the hook question), next (the transition teaser), body html.
const slides = [];
const add = (s) => slides.push(s);

// ---------- 1. STORY ----------
add({
  section: "story",
  cls: "split",
  next: "Was she the only one?",
  body: `
<div class="col text">
  <p class="kicker">A true story</p>
  <h1 class="xl">She was Sri Lanka's best batter.</h1>
  <p class="lead">Hiruka Fernando was the first Sri Lankan woman to score 1,000 ODI runs.</p>
  <p class="lead strong">Then she had a baby.</p>
  <blockquote>"When she returned to the side after her baby, her batting fell off quite quickly and she had no choice but to retire."<cite>Chamari Athapaththu, Sri Lanka, on Hiruka Fernando</cite></blockquote>
  <p class="src">Source: ${a(L.tcm, "The Cricket Monthly, 8 March 2022")}</p>
</div>
${cutout("chamari-sticker.png", "Chamari Athapaththu in the Sri Lanka kit", "lanka", "Chamari Athapaththu tells Hiruka's story", "Chamari Athapaththu, Sri Lanka. Photo: Bahnfrend, CC BY-SA 4.0, via Wikimedia Commons.")}`,
});

add({
  section: "story",
  cls: "split",
  kicker: "Was she the only one?",
  next: "So has anything changed?",
  body: `
${cutout("abidi-sticker.png", "Nain Abidi in the Pakistan kit, holding her bat and helmet", "pak", "Pakistan's first woman to score an ODI century", "Nain Abidi, Women's World Cup 2009. Photo: paddynapper, CC BY-SA 2.0, via Wikimedia Commons.")}
<div class="col text">
  <p class="kicker">Was she the only one?</p>
  <h1>No. Pakistan's Nain Abidi felt it too.</h1>
  <blockquote>"Years of work building muscles disappeared just like that. My heart sank."<cite>Nain Abidi, after giving birth</cite></blockquote>
  <div class="stat-line"><span class="big">"usually signalled the end of her career"</span><span>The Australian Cricketers' Association chief executive, on pregnancy in women's cricket, 2019</span></div>
  <p class="src">Sources: ${a(L.tcm, "The Cricket Monthly, 8 March 2022")}. ${a(L.mlp, "MLP Law, 18 November 2019")}.</p>
</div>`,
});

// ---------- 2. PROBLEM ----------
add({
  section: "problem",
  cls: "split",
  next: "What if the plan lived in her pocket?",
  body: `
<div class="col text">
  <p class="kicker">So has anything changed?</p>
  <h1>Yes. The ICC wrote a plan for mothers.</h1>
  <p class="lead">June 2026. Six stages back to cricket:</p>
  <div class="rs">${["Ready", "Review", "Restore", "Recondition", "Return", "Refine"].map((r, i) => `<span><b>${i + 1}</b>${r}</span>`).join("")}</div>
  <p class="lead">But it is a <b>9-page PDF</b>.</p>
  <div class="nots">
    <span>No way to track her progress</span><span>No safe check of her body</span>
    <span>No doctor sign-off</span><span>No local languages</span>
  </div>
  <p class="src">Sources: ${a(L.icc, "ICC media release, 22 June 2026")}. FIFA's July 2026 guidance is flowcharts too; its authors say guidelines "lack actionable frameworks on the how" (${a(L.fifa, "University of Alberta, July 2026")}).</p>
</div>
<figure class="col doc"><img src="${img("icc-cover.jpg")}" alt="Cover of the ICC Return to Play Post-Pregnancy Guidelines"><figcaption>ICC Return to Play Post-Pregnancy Guidelines, 2026.</figcaption></figure>`,
});

// ---------- 3. SOLUTION ----------
add({
  section: "solution",
  cls: "intro",
  next: "Where am I on my journey?",
  body: `
<p class="kicker">What if the plan lived in her pocket?</p>
<div class="brandline">${logo}<h1 class="xl">ComeBack</h1></div>
<p class="lead wide">The ICC's plan, turned into a guided journey back to cricket. On any phone. In her own language.</p>
<div class="steps3">
  <div><b>1</b><h3>She knows her stage</h3><p>A clear map, made for her.</p></div>
  <div><b>2</b><h3>She checks in on camera</h3><p>Her phone watches her move.</p></div>
  <div><b>3</b><h3>Her doctor decides</h3><p>A real clinician approves every step.</p></div>
</div>
<p class="lead wide soft">Let's follow one mother. Meet <b>Sana</b>, a pace bowler. Her baby was born 16 weeks ago, by caesarean.</p>`,
});

add({
  section: "solution",
  cls: "walk",
  next: "Is her body ready to move?",
  body: `
<div class="walk-text">
  <p class="kicker">Step 1. Where am I?</p>
  <h1>Sana opens the app and sees her stage.</h1>
  <ul class="ticks">
    <li>Stage 1 of 6: <b>Ready</b></li>
    <li>Every step shows the <b>ICC page</b> it comes from</li>
    <li>The plan fits <b>her</b>: her birth, her weeks, her role</li>
  </ul>
</div>
<figure class="shot">${frame("today.jpg", "ComeBack Today screen showing Sana at stage 1 of 6, Ready")}</figure>`,
});

add({
  section: "solution",
  cls: "walk",
  next: "But what if something hurts?",
  body: `
<div class="walk-text">
  <p class="kicker">Step 2. Is my body ready?</p>
  <h1>She puts her phone on the floor and moves.</h1>
  <ul class="ticks">
    <li>AI on the phone <b>counts reps</b> and <b>times holds</b></li>
    <li>Four simple tests from postnatal experts</li>
    <li>The video <b>never leaves her phone</b></li>
  </ul>
  <p class="src">Tests: ${a(L.goom, "Goom, Donnelly and Brockwell, 2019")}. Demo camera input: stock video (Pexels).</p>
</div>
<figure class="shot">${frame("camera.jpg", "Camera check-in tracking a single-leg balance on the device")}</figure>`,
});

add({
  section: "solution",
  cls: "walk",
  next: "So who says yes?",
  body: `
<div class="walk-text">
  <p class="kicker">Step 3. How did it feel?</p>
  <h1>Her body always comes first.</h1>
  <ul class="ticks">
    <li>She answers a short symptom check</li>
    <li>One warning sign and her stage <b>stops</b></li>
    <li>The app tells her: <b>contact your care team</b></li>
  </ul>
  <p class="src">Symptom screen: ${a(L.goom, "Goom, Donnelly and Brockwell, 2019")}, pages 10, 13 and 14.</p>
</div>
<figure class="shot narrow">${frame("symptoms.jpg", "Symptom check with a warning sign selected and the stage paused")}</figure>`,
});

add({
  section: "solution",
  cls: "walk",
  next: "And what does Sana see?",
  body: `
<div class="walk-text">
  <p class="kicker">Step 4. Who decides?</p>
  <h1>A real doctor. Never the app.</h1>
  <ul class="ticks">
    <li>Her physio sees the check-in, the numbers and any symptoms</li>
    <li>Then she presses <b>Approve</b> or <b>Hold</b></li>
    <li>Sana is notified right away</li>
  </ul>
</div>
<div class="shot col2">
  ${frame("clin-detail.jpg", "Clinician view of Sana's latest check-in and symptom screen", "comeback clinical")}
  ${frame("clin-decision.jpg", "Clinician decision panel with Hold current stage and Approve next stage", "comeback clinical")}
</div>`,
});

add({
  section: "solution",
  cls: "walk",
  next: "Why should ComeBack win?",
  body: `
<div class="walk-text">
  <p class="kicker">Step 5. What happens next?</p>
  <h1>Sana moves to stage 2. One step closer to the field.</h1>
  <ul class="ticks">
    <li>In <b>English, Bengali, Hindi or Urdu</b></li>
    <li>Works <b>offline</b>, on any phone</li>
    <li>An AI guide explains her stage, but <b>never</b> decides it</li>
    <li>Private chat with her doctor</li>
  </ul>
</div>
<figure class="shot">${frame("urdu.jpg", "ComeBack in Urdu showing Sana now at stage 2, Review")}</figure>`,
});

// ---------- 4. CLOSE ----------
add({
  section: "close",
  cls: "close",
  next: "Picture the next mother.",
  body: `
<p class="kicker">Why should ComeBack win?</p>
<h1>Five reasons.</h1>
<div class="reasons">
  <div><b>1</b><h3>Built on the ICC's own plan</h3><p>The first working app for the 2026 guidelines. Ready to pilot with ICC Members.</p></div>
  <div><b>2</b><h3>It works today</h3><p>Live app, real AI on the phone. 60 unit tests and 18 full user journeys pass.</p></div>
  <div><b>3</b><h3>Safe by design</h3><p>A doctor approves every stage. Warning signs stop progress. Video stays private.</p></div>
  <div><b>4</b><h3>For every mother</h3><p>Free, any phone, offline, four languages. The same need exists in football and beyond.</p></div>
  <div class="hl"><div class="hl-row"><div class="hl-text"><b>5</b><h3>Built by women, for women</h3><p>An all-women team, solving a problem only women face.</p></div><div class="faces"><img class="face" src="${img("nourin.jpg")}" alt="Nourin Zaman"><img class="face" src="${img("ashra.jpg")}" alt="Ashra Rahman"></div></div></div>
</div>`,
});

add({
  section: "close",
  cls: "finale",
  next: "",
  body: `
${cutout("bismah-sticker.png", "Bismah Maroof in the Pakistan kit", "rose", "Came back as a mother. Led Pakistan at the 2022 World Cup.", "Bismah Maroof. Photo: paddynapper, CC BY-SA 2.0, via Wikimedia Commons.")}
<div class="finale-text">
  <p class="kicker">Picture the next mother.</p>
  <blockquote class="big">"No player should have to choose between motherhood and representing her country."<cite><img class="avatar" src="${img("jayshah-sticker.png")}" alt="Jay Shah">Jay Shah, ICC Chairman, 22 June 2026</cite></blockquote>
  <h1 class="answer">ComeBack makes sure she never has to.</h1>
  <div class="thanks">
    <div class="faces"><img class="face sm" src="${img("nourin.jpg")}" alt="Nourin Zaman"><img class="face sm" src="${img("ashra.jpg")}" alt="Ashra Rahman"></div>
    <div class="grow"><p class="team">Thank you. <span>Nourin Zaman and Ashra Rahman</span></p><p class="small">Try the live app: scan the code.</p></div>
    <img class="qr" src="${img("qr-app.png")}" alt="QR code for the live ComeBack app">
  </div>
</div>`,
});

// ---------- APPENDIX ----------
add({
  section: "appendix",
  cls: "appx",
  next: "",
  body: `
<p class="kicker">Appendix A. Want to try it?</p>
<h1>See it, test it, read the code</h1>
<div class="links-grid">
  <div class="lcard"><img src="${img("qr-app.png")}" alt=""><div><b>Live app</b>${a(L.app, "nourinzaman2005-droid.github.io/comeback")}</div></div>
  <div class="lcard"><img src="${img("qr-video.png")}" alt=""><div><b>Demo video, 2:56</b>${a(L.video, "youtu.be/HjBi7i1aPt8")}</div></div>
  <div class="lcard wide"><div><b>Source code</b>${a(L.code, "github.com/nourinzaman2005-droid/comeback")}</div></div>
  <div class="lcard wide green"><div><b>Demo logins (or tap the demo button)</b><span>Player: nourin@comeback.demo, ComeBack2026!</span><span>Clinician: maya.rahman@icc-demo.org, CareTeam2026!</span></div></div>
</div>
<p class="src">The live app runs on a free server. The first sign-in can take up to a minute to wake it.</p>`,
});

add({
  section: "appendix",
  cls: "appx",
  next: "",
  body: `
<p class="kicker">Appendix B. How does it work?</p>
<h1>Private on the phone. Safe in the cloud.</h1>
<div class="arch">
  <div class="box"><h3>Her phone</h3><ul><li>Pose AI (MediaPipe) runs on the device</li><li>Video is never stored or sent</li><li>Rules engine decides what is allowed</li><li>Works offline, syncs later</li></ul></div>
  <div class="arrow"><span>metrics only, with consent</span></div>
  <div class="box"><h3>Secure API</h3><ul><li>Express and PostgreSQL on Render</li><li>Hashed passwords, signed sessions</li><li>Clinicians see only linked players</li><li>No field for video in the database</li></ul></div>
  <div class="arrow"><span>results and alerts</span></div>
  <div class="box"><h3>Clinician portal</h3><ul><li>Check-ins, symptoms, history</li><li>Approve or hold each stage</li><li>Private chat and notifications</li><li>Red-flag alerts</li></ul></div>
</div>
<p class="lead small-lead">Built with Next.js, TypeScript and Tailwind as an installable web app. Tested with Vitest and Playwright, including automated accessibility checks.</p>`,
});

add({
  section: "appendix",
  cls: "appx",
  next: "",
  body: `
<p class="kicker">Appendix C. How do we keep her safe?</p>
<h1>Four rules. No shortcuts.</h1>
<div class="rules">
  <div><b>1</b><p>A stage moves forward only when time, tests, symptoms and a <b>clinician's approval</b> all agree.</p></div>
  <div><b>2</b><p>Any warning symptom <b>stops</b> progress and tells her to contact her care team.</p></div>
  <div><b>3</b><p>The AI guide only <b>explains</b>, with citations. It refuses clearance questions and cannot change a stage.</p></div>
  <div><b>4</b><p>Camera video <b>stays on the phone</b>. Only numbers are shared, and only with her consent.</p></div>
</div>
<p class="lead small-lead">ComeBack supports the medical team. It is not a medical device and never clears a player on its own.</p>`,
});

add({
  section: "appendix",
  cls: "appx",
  next: "",
  body: `
<p class="kicker">Appendix D. Where does it go next?</p>
<h1>From prototype to pilot</h1>
<div class="road">
  <div><span>Phase 1</span><h3>Clinical review</h3><p>Sports physios and doctors review every rule and message.</p></div>
  <div><span>Phase 2</span><h3>Pilot with an ICC Member</h3><p>One board, its players and its medical team. We measure completion, clarity and clinician response time.</p></div>
  <div><span>Phase 3</span><h3>Every Member, every sport</h3><p>More languages. The same six-stage model fits football, netball and other sports.</p></div>
</div>
<p class="lead small-lead">Free for players. Built to be run by boards and federations as part of player welfare.</p>`,
});

add({
  section: "appendix",
  cls: "appx",
  next: "",
  body: `
<p class="kicker">Appendix E. Who built it?</p>
<h1>Two women. One working product.</h1>
<div class="team-grid">
  <div><div class="who"><img class="face" src="${img("nourin.jpg")}" alt="Nourin Zaman"><div><h3>Nourin Zaman</h3><p class="role">Product, player app and camera AI</p></div></div><ul><li>Player journey, roadmap and check-ins</li><li>On-device pose tests</li><li>Design, accessibility, four languages</li><li>Offline app, deployment, video and deck</li></ul></div>
  <div><div class="who"><img class="face" src="${img("ashra.jpg")}" alt="Ashra Rahman"><div><h3>Ashra Rahman</h3><p class="role">Evidence, safety and backend</p></div></div><ul><li>ICC and clinical guideline extraction</li><li>Safety rules engine, fully tested</li><li>Secure API and database</li><li>Clinician portal, chat and alerts</li></ul></div>
</div>`,
});

add({
  section: "appendix",
  cls: "appx",
  next: "",
  body: `
<p class="kicker">Appendix F. Where do the facts come from?</p>
<h1>Sources</h1>
<ol class="sources">
  <li>${a(L.icc, "ICC Return to Play Post-Pregnancy Guidelines and media release, 22 June 2026")}</li>
  <li>${a(L.tcm, "The Cricket Monthly, \"Cricket's mothers have it better now than ever\", 8 March 2022")}</li>
  <li>${a(L.mlp, "MLP Law, Cricket Australia maternity leave, 18 November 2019")}</li>
  <li>${a(L.fifa, "University of Alberta, FIFA pregnancy and postpartum decision aids, July 2026")}</li>
  <li>${a(L.goom, "Goom, Donnelly and Brockwell, Returning to running postnatal, 2019")}</li>
  <li>${a(L.sixrs, "Donnelly et al., the 6 Rs framework, British Journal of Sports Medicine, 2022")}</li>
  <li>${a(L.pose, "On-device pose estimation clinical validation, PMC12940220")}</li>
</ol>
<p class="src">Photos via Wikimedia Commons: Chamari Athapaththu by Bahnfrend (CC BY-SA 4.0); Nain Abidi and Bismah Maroof by paddynapper (CC BY-SA 2.0); Jay Shah by B4bhavisha (CC BY-SA 4.0). Backgrounds removed. Camera demo input: Pexels stock video.</p>`,
});

const css = `
@page { size: 1920px 1080px; margin: 0; }
:root { --ink:#17122e; --soft:#4a4560; --mute:#6a6480; --violet:#5b3fd9; --violet-d:#3d27a8; --rose:#e5487a; --rose-d:#b8295a; --bg:#fbf9fd; --tint:#f3effa; --line:#e6e0f0; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:"Inter", Arial, sans-serif; color:var(--ink); }
a { color:var(--violet-d); text-decoration:underline; text-underline-offset:4px; }
.slide { width:1920px; height:1080px; position:relative; overflow:hidden; background:var(--bg); padding:88px 120px 130px; page-break-after:always; display:flex; flex-direction:column; gap:28px; }
.slide:last-child { page-break-after:auto; }
.slide::before { content:""; position:absolute; left:0; top:0; width:100%; height:10px; background:linear-gradient(90deg,var(--violet),var(--rose)); }
h1 { font-family:"Manrope", Arial, sans-serif; font-weight:800; font-size:76px; line-height:1.06; letter-spacing:-2px; }
h1.xl { font-size:104px; letter-spacing:-3px; }
h3 { font-family:"Manrope", Arial, sans-serif; font-weight:800; font-size:36px; line-height:1.15; }
.kicker { font-size:34px; font-weight:700; color:var(--rose-d); }
.lead { font-size:38px; line-height:1.35; color:var(--soft); }
.lead.strong { color:var(--ink); font-weight:700; }
.lead b { color:var(--ink); }
.src { font-size:22px; color:var(--mute); line-height:1.4; }
.src a { color:var(--mute); }
blockquote { font-size:36px; line-height:1.35; font-weight:600; background:#fff; border-left:10px solid var(--rose); border-radius:20px; padding:30px 36px; box-shadow:0 18px 40px rgba(23,18,46,.07); }
blockquote cite { display:block; margin-top:14px; font-style:normal; font-size:24px; font-weight:500; color:var(--mute); }
.foot { position:absolute; left:120px; right:120px; bottom:44px; display:flex; justify-content:space-between; align-items:center; font-size:22px; color:var(--mute); }
.foot .sec { display:flex; align-items:center; gap:14px; font-weight:700; }
.foot .sec svg { width:34px; height:34px; }
.foot .next { font-weight:700; color:var(--violet); }
.foot .next b { color:var(--mute); font-weight:600; margin-right:8px; }
.foot .num { font-weight:700; margin-left:28px; color:var(--mute); }
.foot .right { display:flex; align-items:center; }
/* split */
.split { flex-direction:row; gap:72px; align-items:stretch; }
.split .col.text { flex:1.05; display:flex; flex-direction:column; justify-content:center; gap:26px; }
.split .col.photo, .split .col.doc { flex:0.95; display:flex; flex-direction:column; gap:14px; justify-content:center; }
.col.photo img { width:100%; height:740px; object-fit:cover; border-radius:36px; box-shadow:0 30px 70px rgba(23,18,46,.18); }
.col.photo.left img { object-position:30% center; }
figcaption { font-size:22px; color:var(--mute); line-height:1.35; }
.col.doc { align-items:center; }
.col.doc img { height:700px; width:auto; max-width:100%; border-radius:12px; border:1px solid var(--line); box-shadow:0 30px 70px rgba(23,18,46,.16); transform:rotate(2deg); }
.stat-line { display:flex; flex-direction:column; gap:10px; padding:26px 32px; border-radius:20px; background:var(--tint); }
.stat-line .big { font-family:"Manrope"; font-weight:800; font-size:44px; color:var(--rose-d); line-height:1.15; }
.stat-line span:last-child { font-size:24px; color:var(--soft); }
.rs { display:flex; gap:12px; flex-wrap:wrap; }
.rs span { font-size:28px; font-weight:700; background:#fff; border:2px solid var(--line); border-radius:999px; padding:10px 22px 10px 12px; display:flex; align-items:center; gap:12px; }
.rs b { width:40px; height:40px; border-radius:50%; background:var(--violet); color:#fff; display:grid; place-items:center; font-size:22px; }
.nots { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.nots span { font-size:28px; font-weight:600; background:#fdecf2; color:var(--rose-d); border-radius:16px; padding:16px 22px; }
.nots span::before { content:"x"; font-weight:800; margin-right:14px; }
/* paper cutouts */
.col.cut { flex:0.95; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.blob { position:absolute; width:700px; height:700px; border-radius:50%; left:50%; top:46%; transform:translate(-50%,-50%); }
.blob.lanka { background:radial-gradient(circle at 35% 30%, #e4e9ff, #c7d1f6); }
.blob.pak { background:radial-gradient(circle at 35% 30%, #e3f5e8, #c3e6cd); }
.blob.rose { background:radial-gradient(circle at 35% 30%, #ffe4ee, #f8c5d8); }
.sticker { position:relative; height:740px; width:auto; filter:drop-shadow(0 22px 26px rgba(23,18,46,.22)) drop-shadow(0 2px 3px rgba(23,18,46,.2)); }
.tag { position:absolute; left:2%; bottom:150px; max-width:330px; background:#fff; border-radius:14px; padding:14px 20px; font-family:"Manrope"; font-size:27px; font-weight:800; line-height:1.2; color:var(--ink); transform:rotate(-4deg); box-shadow:0 14px 30px rgba(23,18,46,.16); border-left:8px solid var(--rose); }
.col.cut figcaption { position:relative; margin-top:16px; text-align:center; max-width:640px; }
.avatar { width:64px; height:64px; object-fit:cover; object-position:top; border-radius:50%; background:#f3effa; vertical-align:middle; margin-right:14px; border:3px solid #fff; box-shadow:0 4px 10px rgba(23,18,46,.15); }
/* browser frames */
.frame { background:#fff; border:2px solid var(--line); border-radius:22px; overflow:hidden; box-shadow:0 30px 70px rgba(23,18,46,.16); display:flex; flex-direction:column; max-width:100%; }
.frame .bar { height:46px; flex:none; background:#f3effa; border-bottom:2px solid var(--line); display:flex; align-items:center; gap:10px; padding:0 20px; }
.frame .bar i { width:14px; height:14px; border-radius:50%; background:#d6cde6; }
.frame .bar span { margin-left:16px; font-size:17px; font-weight:600; color:var(--mute); background:#fff; border-radius:8px; padding:4px 16px; }
.frame img { display:block; width:100%; height:auto; }
/* intro */
.intro { justify-content:center; gap:34px; }
.brandline { display:flex; align-items:center; gap:28px; }
.brandline svg { width:120px; height:120px; }
.lead.wide { max-width:1500px; }
.lead.soft { font-size:34px; }
.steps3 { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
.steps3 div { background:#fff; border:2px solid var(--line); border-radius:28px; padding:34px 36px; display:flex; flex-direction:column; gap:12px; }
.steps3 b, .reasons b, .rules b { width:58px; height:58px; border-radius:18px; background:var(--violet); color:#fff; display:grid; place-items:center; font-family:"Manrope"; font-size:30px; font-weight:800; }
.steps3 p { font-size:28px; color:var(--soft); }
/* walkthrough */
.walk { flex-direction:row; gap:64px; align-items:center; }
.walk-text { width:600px; flex:none; display:flex; flex-direction:column; gap:28px; }
.walk-text h1 { font-size:64px; letter-spacing:-1.5px; }
.walk-text.wide { width:auto; }
.ticks { list-style:none; display:flex; flex-direction:column; gap:18px; }
.ticks li { font-size:32px; line-height:1.3; color:var(--soft); padding-left:52px; position:relative; }
.ticks li::before { content:""; position:absolute; left:0; top:4px; width:32px; height:32px; border-radius:50%; background:var(--violet) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/20px no-repeat; }
.ticks b { color:var(--ink); }
.shot { flex:1; min-width:0; display:flex; justify-content:center; }
.shot .frame { max-height:840px; }
.shot .frame img { max-height:790px; width:auto; max-width:100%; }
.shot.narrow .frame img { max-height:740px; }
.shot.col2 { flex-direction:column; gap:28px; align-items:center; }
.shot.col2 .frame { width:100%; }
.shot.col2 .frame img { width:100%; max-height:none; }
.stack { gap:30px; }
.pair { display:grid; grid-template-columns:1.25fr 1fr; gap:36px; align-items:center; }
.pair .shot img { max-height:560px; }
/* close */
.close { gap:30px; }
.reasons { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.reasons div { background:#fff; border:2px solid var(--line); border-radius:28px; padding:30px 32px; display:flex; flex-direction:column; gap:12px; }
.reasons div:nth-child(4) { grid-column:span 1; }
.reasons div.hl { background:linear-gradient(135deg,var(--rose),#c43a8c); border:none; color:#fff; grid-column:span 2; }
.reasons div.hl-row { display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:24px; background:none; border:none; padding:0; }
.reasons div.hl-text { display:flex; flex-direction:column; gap:12px; background:none; border:none; padding:0; }
.reasons div.faces { display:flex; flex-direction:row; background:none; border:none; padding:0; }
.reasons .face { width:150px; height:150px; }
.reasons div.hl b { background:#fff; color:var(--rose-d); }
.reasons div.hl p { color:#fff; }
.reasons p { font-size:27px; line-height:1.35; color:var(--soft); }
.finale { flex-direction:row; gap:64px; align-items:stretch; padding-top:80px; }
.finale .col.cut { flex:none; width:700px; }
.finale-photo { width:720px; flex:none; display:flex; flex-direction:column; gap:14px; justify-content:center; }
.finale-photo img { width:100%; height:760px; object-fit:cover; object-position:60% center; border-radius:36px; box-shadow:0 30px 70px rgba(23,18,46,.18); }
.finale-text { flex:1; display:flex; flex-direction:column; justify-content:center; gap:30px; }
blockquote.big { font-size:44px; font-family:"Manrope"; font-weight:800; line-height:1.2; }
h1.answer { font-size:70px; color:var(--violet); }
.thanks { display:flex; justify-content:space-between; align-items:center; gap:30px; background:#fff; border:2px solid var(--line); border-radius:24px; padding:22px 30px; }
.thanks .team { font-family:"Manrope"; font-size:36px; font-weight:800; }
.thanks .team span { display:block; font-family:"Inter"; font-size:28px; font-weight:600; color:var(--soft); margin-top:4px; }
.thanks .small { font-size:22px; color:var(--mute); margin-top:6px; }
.qr { width:150px; height:150px; }
/* appendix */
.appx { gap:34px; justify-content:center; }
.appx h1 { font-size:68px; }
.links-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.lcard { display:flex; gap:28px; align-items:center; background:#fff; border:2px solid var(--line); border-left:10px solid var(--violet); border-radius:24px; padding:26px 30px; }
.lcard img { width:170px; height:170px; }
.lcard div { display:flex; flex-direction:column; gap:10px; font-size:32px; font-weight:700; }
.lcard b { font-size:24px; color:var(--violet); }
.lcard span { font-size:28px; font-weight:500; color:var(--soft); }
.lcard.green { border-left-color:#0b7a5d; }
.lcard.green b { color:#0b7a5d; }
.arch { display:flex; align-items:stretch; gap:0; }
.arch .box { flex:1; background:#fff; border:2px solid var(--line); border-top:10px solid var(--violet); border-radius:24px; padding:30px 32px; display:flex; flex-direction:column; gap:16px; }
.arch .box:nth-child(3) { border-top-color:var(--rose); }
.arch .box:nth-child(5) { border-top-color:#0b7a5d; }
.arch ul, .team-grid ul { list-style:none; display:flex; flex-direction:column; gap:12px; }
.arch li, .team-grid li { font-size:26px; line-height:1.3; color:var(--soft); padding-left:24px; position:relative; }
.arch li::before, .team-grid li::before { content:""; position:absolute; left:0; top:13px; width:10px; height:10px; border-radius:50%; background:var(--violet); }
.arch .arrow { width:150px; flex:none; display:flex; align-items:center; justify-content:center; position:relative; }
.arch .arrow::before { content:""; position:absolute; left:14px; right:24px; top:50%; height:4px; background:var(--violet); }
.arch .arrow::after { content:""; position:absolute; right:12px; top:calc(50% - 12px); border-left:20px solid var(--violet); border-top:14px solid transparent; border-bottom:14px solid transparent; }
.arch .arrow span { position:relative; top:-46px; font-size:19px; font-weight:700; color:var(--violet); text-align:center; line-height:1.2; }
.small-lead { font-size:30px; }
.rules { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.rules div { display:flex; gap:24px; align-items:flex-start; background:#fff; border:2px solid var(--line); border-radius:24px; padding:30px 32px; }
.rules b { flex:none; }
.rules p { font-size:30px; line-height:1.35; color:var(--soft); }
.rules p b, .rules p b { display:inline; background:none; color:var(--ink); width:auto; height:auto; font-family:"Inter"; font-size:inherit; }
.road { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.road div { background:#fff; border:2px solid var(--line); border-radius:24px; padding:32px; display:flex; flex-direction:column; gap:14px; }
.road span { font-size:24px; font-weight:800; color:var(--rose-d); }
.road p { font-size:27px; line-height:1.35; color:var(--soft); }
.team-grid { display:grid; grid-template-columns:1fr 1fr; gap:28px; }
.team-grid > div { background:#fff; border:2px solid var(--line); border-radius:28px; padding:36px 40px; display:flex; flex-direction:column; gap:16px; }
.team-grid .who { display:flex; align-items:center; gap:30px; }
.team-grid .who h3 { font-size:42px; }
.face { width:170px; height:170px; border-radius:50%; object-fit:cover; border:6px solid #fff; box-shadow:0 14px 30px rgba(23,18,46,.18), 0 0 0 3px var(--line); flex:none; }
.face.sm { width:104px; height:104px; border-width:4px; }
.faces { display:flex; flex:none; }
.faces .face + .face { margin-left:-22px; }
.thanks .grow { flex:1; }
.team-grid .role { font-size:28px; font-weight:700; color:var(--violet); }
.team-grid li { font-size:30px; }
.sources { padding-left:48px; display:flex; flex-direction:column; gap:18px; font-size:34px; line-height:1.3; }
.sources a { color:var(--ink); }
`;

function foot(s, i) {
  const next = s.next ? `<span class="next"><b>Next:</b>${s.next}</span>` : "";
  return `<div class="foot"><span class="sec">${logo}${SECTIONS[s.section]}</span><span class="right">${next}<span class="num">${i + 1} / ${slides.length}</span></span></div>`;
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ComeBack Pitch Deck</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
${slides.map((s, i) => `<section class="slide ${s.cls}">${s.body}${foot(s, i)}</section>`).join("\n")}
</body></html>`;

if (/[–—→]/.test(html)) throw new Error("Dash or arrow character found in the deck");
const htmlPath = join(here, "deck.html");
writeFileSync(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const problems = await page.$$eval(".slide", (els) =>
  els.flatMap((el, i) => {
    const box = el.getBoundingClientRect();
    const foot = el.querySelector(".foot").getBoundingClientRect();
    const bad = [...el.querySelectorAll("*")].filter((c) => {
      if (c.closest(".foot")) return false;
      const r = c.getBoundingClientRect();
      return r.width && (r.bottom > foot.top - 8 || r.right > box.right - 40);
    });
    return bad.length ? [`slide ${i + 1}: ${bad.length} element(s) reach the footer or right edge`] : [];
  }),
);
problems.forEach((p) => console.warn(p));
await page.pdf({ path: out, width: "1920px", height: "1080px", printBackground: true });
if (process.argv.includes("--png")) {
  const els = await page.$$(".slide");
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: join(here, `preview-${String(i + 1).padStart(2, "0")}.png`) });
}
await browser.close();
console.log(`Wrote ${out} (${slides.length} slides)`);
