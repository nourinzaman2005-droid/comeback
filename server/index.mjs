import cors from "cors";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import pg from "pg";
import { z } from "zod";

const directory = dirname(fileURLToPath(import.meta.url));
const guideline = JSON.parse(
  await readFile(
    join(directory, "../content/guidelines/icc-2026.json"),
    "utf8",
  ),
);
const tests = JSON.parse(
  await readFile(join(directory, "../content/guidelines/tests.json"), "utf8"),
);
const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;
const memory = { players: new Map(), tests: new Map(), decisions: new Map() };
const stages = [
  "Ready",
  "Review",
  "Restore",
  "Recondition",
  "Return",
  "Refine",
];
const secret =
  process.env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");

if (pool) {
  await pool.query(await readFile(join(directory, "schema.sql"), "utf8"));
}

function sign(payload) {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 12 * 60 * 60 * 1000 }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

function authenticate(roles) {
  return (request, response, next) => {
    try {
      const token = request.headers.authorization?.replace(/^Bearer /, "");
      if (!token)
        return response.status(401).json({ error: "Authentication required" });
      const [data, signature] = token.split(".");
      const expected = crypto
        .createHmac("sha256", secret)
        .update(data ?? "")
        .digest("base64url");
      if (
        !signature ||
        signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      ) {
        return response.status(401).json({ error: "Invalid session" });
      }
      const payload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf8"),
      );
      if (payload.exp < Date.now() || !roles.includes(payload.role))
        return response.status(403).json({ error: "Session not allowed" });
      request.session = payload;
      next();
    } catch {
      return response.status(401).json({ error: "Invalid session" });
    }
  };
}

const explanationRequests = new Map();
function explanationRateLimit(request, response, next) {
  const now = Date.now();
  const key = request.ip ?? "unknown";
  const recent = (explanationRequests.get(key) ?? []).filter(
    (time) => now - time < 60_000,
  );
  if (recent.length >= 20)
    return response
      .status(429)
      .json({ error: "Please wait before asking again" });
  recent.push(now);
  explanationRequests.set(key, recent);
  next();
}

async function sendRedFlagAlert(test) {
  if (!process.env.RED_FLAG_WEBHOOK_URL || test.symptoms.length === 0) return;
  const payload = JSON.stringify({
    event: "player.symptoms-reported",
    playerId: test.playerId,
    testId: test.id,
    symptomCodes: test.symptoms,
    completedAt: test.completedAt,
  });
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    await fetch(process.env.RED_FLAG_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ComeBack-Signature": signature,
      },
      body: payload,
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("Red-flag webhook delivery failed", error);
  }
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "32kb" }));

app.get("/health", async (_request, response) => {
  if (pool) await pool.query("select 1");
  response.json({ ok: true, database: pool ? "postgres" : "memory" });
});

app.post("/api/demo/session", (request, response) => {
  if (process.env.DEMO_MODE !== "true") return response.status(404).end();
  const parsed = z
    .object({
      role: z.enum(["player", "clinician"]),
      playerId: z.string().max(100).optional(),
    })
    .safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({ error: "Invalid demo session" });
  response.json({ token: sign(parsed.data), expiresInSeconds: 43200 });
});

const profileSchema = z.object({
  id: z.string().max(100),
  name: z.string().min(1).max(80),
  deliveryDate: z.string(),
  deliveryType: z.enum(["vaginal", "caesarean", "other"]),
  role: z.string().max(30),
  language: z.enum(["en", "bn", "hi", "ur"]),
  consentAt: z.string(),
  stage: z.enum(stages),
  stageStatus: z.enum(["active", "awaiting-review", "held"]),
  updatedAt: z.string(),
});

app.put(
  "/api/players/:id",
  authenticate(["player"]),
  async (request, response) => {
    const parsed = profileSchema.safeParse(request.body);
    if (
      !parsed.success ||
      parsed.data.id !== request.params.id ||
      request.session.playerId !== request.params.id
    )
      return response.status(400).json({ error: "Invalid player profile" });
    const p = parsed.data;
    if (pool)
      await pool.query(
        `insert into players (id,display_name,delivery_date,delivery_type,cricket_role,language,stage,stage_status,consent_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (id) do update set display_name=excluded.display_name, language=excluded.language, updated_at=excluded.updated_at`,
        [
          p.id,
          p.name,
          p.deliveryDate,
          p.deliveryType,
          p.role,
          p.language,
          p.stage,
          p.stageStatus,
          p.consentAt,
          p.updatedAt,
        ],
      );
    else {
      const existing = memory.players.get(p.id);
      memory.players.set(
        p.id,
        existing
          ? {
              ...existing,
              name: p.name,
              language: p.language,
              updatedAt: p.updatedAt,
            }
          : p,
      );
    }
    response.json({ ok: true });
  },
);

app.get(
  "/api/players/:id",
  authenticate(["player", "clinician"]),
  async (request, response) => {
    if (
      request.session.role === "player" &&
      request.session.playerId !== request.params.id
    )
      return response.status(403).json({ error: "Not linked" });
    if (pool) {
      const result = await pool.query("select * from players where id=$1", [
        request.params.id,
      ]);
      return response.json(result.rows[0] ?? null);
    }
    response.json(memory.players.get(request.params.id) ?? null);
  },
);

app.get(
  "/api/clinician/players",
  authenticate(["clinician"]),
  async (_request, response) => {
    if (pool) {
      const result = await pool.query(
        "select p.*, coalesce(json_agg(t order by t.completed_at desc) filter (where t.id is not null), '[]') as tests from players p left join test_records t on t.player_id=p.id group by p.id order by p.updated_at desc",
      );
      return response.json(result.rows);
    }
    response.json(
      [...memory.players.values()].map((player) => ({
        ...player,
        tests: [...memory.tests.values()].filter(
          (test) => test.playerId === player.id,
        ),
      })),
    );
  },
);

app.post("/api/tests", authenticate(["player"]), async (request, response) => {
  const parsed = z
    .object({
      id: z.string(),
      playerId: z.string(),
      kind: z.enum(["squat", "balance", "hop", "bridge"]),
      side: z.enum(["left", "right", "both"]),
      metrics: z.record(z.string(), z.unknown()),
      symptoms: z.array(z.string()).max(8),
      completedAt: z.string(),
    })
    .safeParse(request.body);
  if (!parsed.success || parsed.data.playerId !== request.session.playerId)
    return response.status(400).json({ error: "Invalid check-in" });
  const t = parsed.data;
  const nextStatus = t.symptoms.length ? "held" : "awaiting-review";
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "insert into test_records (id,player_id,kind,side,metrics,symptoms,completed_at) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing",
        [
          t.id,
          t.playerId,
          t.kind,
          t.side,
          t.metrics,
          t.symptoms,
          t.completedAt,
        ],
      );
      await client.query(
        "update players set stage_status=$1, updated_at=now() where id=$2",
        [nextStatus, t.playerId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } else {
    memory.tests.set(t.id, t);
    const player = memory.players.get(t.playerId);
    if (player)
      memory.players.set(t.playerId, {
        ...player,
        stageStatus: nextStatus,
        updatedAt: new Date().toISOString(),
      });
  }
  await sendRedFlagAlert(t);
  response.status(201).json({ ok: true });
});

app.post(
  "/api/decisions",
  authenticate(["clinician"]),
  async (request, response) => {
    const parsed = z
      .object({
        id: z.string(),
        playerId: z.string(),
        testId: z.string(),
        decision: z.enum(["approve", "hold"]),
        note: z.string().max(500),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({ error: "Invalid decision" });
    const d = parsed.data;
    let player;
    let test;
    if (pool) {
      const [p, t] = await Promise.all([
        pool.query("select * from players where id=$1", [d.playerId]),
        pool.query("select * from test_records where id=$1 and player_id=$2", [
          d.testId,
          d.playerId,
        ]),
      ]);
      player = p.rows[0];
      test = t.rows[0];
    } else {
      player = memory.players.get(d.playerId);
      test = memory.tests.get(d.testId);
    }
    if (!player || !test)
      return response
        .status(404)
        .json({ error: "Player or check-in not found" });
    const symptoms = test.symptoms ?? [];
    if (d.decision === "approve" && symptoms.length)
      return response
        .status(409)
        .json({ error: "Approval blocked by reported symptoms" });
    const currentStage = player.stage ?? "Ready";
    const next =
      d.decision === "approve"
        ? stages[Math.min(stages.indexOf(currentStage) + 1, stages.length - 1)]
        : currentStage;
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(
          "insert into clinician_decisions (id,player_id,test_id,decision,from_stage,to_stage,note) values ($1,$2,$3,$4,$5,$6,$7)",
          [d.id, d.playerId, d.testId, d.decision, currentStage, next, d.note],
        );
        await client.query(
          "update players set stage=$1, stage_status=$2, updated_at=now() where id=$3",
          [next, d.decision === "approve" ? "active" : "held", d.playerId],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    } else {
      memory.decisions.set(d.id, {
        ...d,
        fromStage: currentStage,
        toStage: next,
      });
      memory.players.set(d.playerId, {
        ...player,
        stage: next,
        stageStatus: d.decision === "approve" ? "active" : "held",
      });
    }
    response.json({
      stage: next,
      status: d.decision === "approve" ? "active" : "held",
    });
  },
);

app.post("/api/explain", explanationRateLimit, async (request, response) => {
  const parsed = z
    .object({
      stage: z.enum(stages),
      language: z.enum(["en", "bn", "hi", "ur"]),
      question: z.string().max(300).optional(),
    })
    .safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({ error: "Invalid explanation request" });
  const { stage, language, question = "" } = parsed.data;
  const source = guideline.stages.find((item) => item.label === stage);
  const citation = `ICC Return to Play Post Pregnancy Guidelines, page ${source.reference.pdfPage}, ${source.reference.section}`;
  const refusal =
    /clear|diagnos|safe to|can i|খেলতে নিরাপদ|ছাড়পত্র|खेलना सुरक्षित|طبی منظوری|کھیلنا محفوظ/i.test(
      question,
    );
  const safety = {
    en: "This explanation cannot diagnose, clear, or advance your stage. Please seek clinician review.",
    bn: "এই ব্যাখ্যা রোগ নির্ণয়, ছাড়পত্র বা ধাপ পরিবর্তন করতে পারে না। চিকিৎসকের পর্যালোচনা নিন।",
    hi: "यह व्याख्या निदान, मंजूरी या चरण नहीं बदल सकती। चिकित्सक की समीक्षा लें।",
    ur: "یہ وضاحت تشخیص، منظوری یا مرحلہ تبدیل نہیں کر سکتی۔ معالج سے جائزہ لیں۔",
  }[language];
  if (refusal || !process.env.GROQ_API_KEY)
    return response.json({
      stage,
      summary: refusal ? safety : source.purpose,
      nextStep: source.guidance[0],
      safetyNote: safety,
      citations: [citation],
      source: refusal ? "guardrail" : "grounded-fallback",
    });
  const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `Explain only this JSON in ${language}. Never diagnose, clear, or change stage. Return JSON with stage, summary, nextStep, safetyNote, citations.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            stage,
            source,
            limitations: guideline.scope.limitations,
            evidence: tests.evidenceBoundary,
            citation,
          }),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!groq.ok)
    return response.json({
      stage,
      summary: source.purpose,
      nextStep: source.guidance[0],
      safetyNote: safety,
      citations: [citation],
      source: "grounded-fallback",
    });
  const payload = await groq.json();
  try {
    const result = JSON.parse(payload.choices[0].message.content);
    if (
      result.stage !== stage ||
      !Array.isArray(result.citations) ||
      result.citations.some((c) => c !== citation)
    )
      throw new Error();
    return response.json({ ...result, source: "groq" });
  } catch {
    return response.json({
      stage,
      summary: source.purpose,
      nextStep: source.guidance[0],
      safetyNote: safety,
      citations: [citation],
      source: "grounded-fallback",
    });
  }
});

app.use((error, _request, response, _next) => {
  void _next;
  console.error(error);
  response.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT ?? 10000);
app.listen(port, "0.0.0.0", () =>
  console.log(`ComeBack API listening on ${port}`),
);
