import cors from "cors";
import bcrypt from "bcryptjs";
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
const memory = {
  accounts: new Map(),
  clinicians: new Map(),
  players: new Map(),
  tests: new Map(),
  decisions: new Map(),
  messages: new Map(),
  notifications: new Map(),
};
const clinicianRegistry = [
  {
    id: "clinician-maya-demo",
    displayName: "Dr. Maya Rahman",
    email: "maya.rahman@icc-demo.org",
    specialty: "Women’s Health Physiotherapist",
    memberBoard: "Bangladesh Cricket Board",
    registrationNumber: "ICC-BD-1042",
  },
  {
    id: "clinician-aisha-demo",
    displayName: "Dr. Aisha Khan",
    email: "aisha.khan@icc-demo.org",
    specialty: "Sports and Exercise Medicine",
    memberBoard: "Pakistan Cricket Board",
    registrationNumber: "ICC-PK-2088",
  },
  {
    id: "clinician-priya-demo",
    displayName: "Dr. Priya Sen",
    email: "priya.sen@icc-demo.org",
    specialty: "Sports Physiotherapist",
    memberBoard: "Board of Control for Cricket in India",
    registrationNumber: "ICC-IN-3157",
  },
];
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

const demoPlayerPassword = "ComeBack2026!";
const demoClinicianPassword = "CareTeam2026!";

async function seedDemoDirectory() {
  const clinicianPasswordHash = await bcrypt.hash(demoClinicianPassword, 12);
  const playerPasswordHash = await bcrypt.hash(demoPlayerPassword, 12);
  if (pool) {
    for (const clinician of clinicianRegistry) {
      await pool.query(
        `insert into clinicians (id,display_name,email,specialty,member_board,registration_number,verified,active)
         values ($1,$2,$3,$4,$5,$6,true,true)
         on conflict (id) do update set display_name=excluded.display_name,email=excluded.email,specialty=excluded.specialty,member_board=excluded.member_board,registration_number=excluded.registration_number,verified=true,active=true`,
        [
          clinician.id,
          clinician.displayName,
          clinician.email,
          clinician.specialty,
          clinician.memberBoard,
          clinician.registrationNumber,
        ],
      );
    }
    if (process.env.DEMO_MODE === "true") {
      await pool.query(
        "insert into accounts (id,email,password_hash,role) values ($1,$2,$3,'clinician') on conflict (email) do nothing",
        [
          clinicianRegistry[0].id,
          clinicianRegistry[0].email,
          clinicianPasswordHash,
        ],
      );
      await pool.query(
        "insert into accounts (id,email,password_hash,role) values ($1,$2,$3,'player') on conflict (email) do nothing",
        ["player-nourin-demo", "nourin@comeback.demo", playerPasswordHash],
      );
      await pool.query(
        `insert into players (id,display_name,delivery_date,delivery_type,cricket_role,language,stage,stage_status,consent_at,updated_at,clinician_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (id) do update set clinician_id=excluded.clinician_id`,
        [
          "player-nourin-demo",
          "Nourin",
          "2026-06-04",
          "caesarean",
          "bowler",
          "en",
          "Restore",
          "active",
          "2026-09-25T00:00:00.000Z",
          "2026-09-25T00:00:00.000Z",
          clinicianRegistry[0].id,
        ],
      );
    }
    return;
  }

  for (const clinician of clinicianRegistry)
    memory.clinicians.set(clinician.id, {
      ...clinician,
      verified: true,
      active: true,
    });
  if (process.env.DEMO_MODE === "true") {
    memory.accounts.set(clinicianRegistry[0].id, {
      id: clinicianRegistry[0].id,
      email: clinicianRegistry[0].email,
      passwordHash: clinicianPasswordHash,
      role: "clinician",
    });
    memory.accounts.set("player-nourin-demo", {
      id: "player-nourin-demo",
      email: "nourin@comeback.demo",
      passwordHash: playerPasswordHash,
      role: "player",
    });
    memory.players.set("player-nourin-demo", {
      id: "player-nourin-demo",
      name: "Nourin",
      deliveryDate: "2026-06-04",
      deliveryType: "caesarean",
      role: "bowler",
      language: "en",
      consentAt: "2026-09-25T00:00:00.000Z",
      clinicianId: clinicianRegistry[0].id,
      clinicianName: clinicianRegistry[0].displayName,
      stage: "Restore",
      stageStatus: "active",
      updatedAt: "2026-09-25T00:00:00.000Z",
    });
  }
}

await seedDemoDirectory();

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

async function createNotification(
  recipientId,
  recipientRole,
  type,
  title,
  body,
) {
  const notification = {
    id: `notification-${crypto.randomUUID()}`,
    recipientId,
    recipientRole,
    type,
    title,
    body,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  if (pool)
    await pool.query(
      "insert into notifications (id,recipient_id,recipient_role,type,title,body,created_at) values ($1,$2,$3,$4,$5,$6,$7)",
      [
        notification.id,
        recipientId,
        recipientRole,
        type,
        title,
        body,
        notification.createdAt,
      ],
    );
  else memory.notifications.set(notification.id, notification);
  return notification;
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "32kb" }));

app.get("/health", async (_request, response) => {
  if (pool) await pool.query("select 1");
  response.json({ ok: true, database: pool ? "postgres" : "memory" });
});

const authAttempts = new Map();
function authRateLimit(request, response, next) {
  const now = Date.now();
  const key = request.ip ?? "unknown";
  const recent = (authAttempts.get(key) ?? []).filter(
    (time) => now - time < 10 * 60_000,
  );
  if (recent.length >= 30)
    return response.status(429).json({ error: "Too many sign-in attempts" });
  recent.push(now);
  authAttempts.set(key, recent);
  next();
}

const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);

function sessionResult(account, name) {
  return {
    token: sign({
      role: account.role,
      userId: account.id,
      playerId: account.role === "player" ? account.id : undefined,
    }),
    user: {
      id: account.id,
      email: account.email,
      role: account.role,
      name,
    },
    expiresInSeconds: 43200,
  };
}

async function findAccountByEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (pool) {
    const result = await pool.query(
      `select a.*, coalesce(p.display_name,c.display_name) as name
       from accounts a
       left join players p on p.id=a.id
       left join clinicians c on c.id=a.id
       where a.email=$1`,
      [normalized],
    );
    return result.rows[0] ?? null;
  }
  const account = [...memory.accounts.values()].find(
    (value) => value.email === normalized,
  );
  if (!account) return null;
  const owner =
    account.role === "player"
      ? memory.players.get(account.id)
      : memory.clinicians.get(account.id);
  return { ...account, name: owner?.name ?? owner?.displayName };
}

app.get("/api/clinicians", async (_request, response) => {
  if (pool) {
    const result = await pool.query(
      "select id,display_name,specialty,member_board,verified from clinicians where active=true and verified=true order by display_name",
    );
    return response.json(result.rows);
  }
  response.json(
    [...memory.clinicians.values()]
      .filter((clinician) => clinician.active && clinician.verified)
      .map((clinician) => ({
        id: clinician.id,
        display_name: clinician.displayName,
        specialty: clinician.specialty,
        member_board: clinician.memberBoard,
        verified: true,
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name)),
  );
});

app.post("/api/auth/login", authRateLimit, async (request, response) => {
  const parsed = z
    .object({
      email: z.string().email().max(200),
      password: z.string().max(72),
      role: z.enum(["player", "clinician"]),
    })
    .safeParse(request.body);
  if (!parsed.success)
    return response
      .status(400)
      .json({ error: "Enter a valid email and password" });
  const account = await findAccountByEmail(parsed.data.email);
  const hash = account?.password_hash ?? account?.passwordHash;
  if (
    !account ||
    account.role !== parsed.data.role ||
    !(await bcrypt.compare(parsed.data.password, hash))
  )
    return response
      .status(401)
      .json({ error: "Email or password is incorrect" });
  response.json(sessionResult(account, account.name));
});

app.post(
  "/api/auth/register/player",
  authRateLimit,
  async (request, response) => {
    const parsed = z
      .object({
        email: z.string().email().max(200),
        password: passwordSchema,
        name: z.string().min(1).max(80),
        deliveryDate: z.string(),
        deliveryType: z.enum(["vaginal", "caesarean", "other"]),
        cricketRole: z.enum([
          "batter",
          "bowler",
          "all-rounder",
          "wicketkeeper",
        ]),
        language: z.enum(["en", "bn", "hi", "ur"]),
        clinicianId: z.string().max(100),
        consent: z.literal(true),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({
        error:
          "Complete every field and use a password with at least 8 characters, one letter, and one number",
      });
    const data = parsed.data;
    const email = data.email.trim().toLowerCase();
    if (await findAccountByEmail(email))
      return response
        .status(409)
        .json({ error: "An account already uses this email" });
    const clinician = pool
      ? (
          await pool.query(
            "select * from clinicians where id=$1 and active=true and verified=true",
            [data.clinicianId],
          )
        ).rows[0]
      : memory.clinicians.get(data.clinicianId);
    if (!clinician)
      return response
        .status(400)
        .json({ error: "Choose a verified clinician" });
    const id = `player-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const passwordHash = await bcrypt.hash(data.password, 12);
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(
          "insert into accounts (id,email,password_hash,role) values ($1,$2,$3,'player')",
          [id, email, passwordHash],
        );
        await client.query(
          `insert into players (id,display_name,delivery_date,delivery_type,cricket_role,language,stage,stage_status,consent_at,updated_at,clinician_id)
           values ($1,$2,$3,$4,$5,$6,'Ready','active',$7,$7,$8)`,
          [
            id,
            data.name,
            data.deliveryDate,
            data.deliveryType,
            data.cricketRole,
            data.language,
            timestamp,
            data.clinicianId,
          ],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    } else {
      memory.accounts.set(id, {
        id,
        email,
        passwordHash,
        role: "player",
      });
      memory.players.set(id, {
        id,
        name: data.name,
        deliveryDate: data.deliveryDate,
        deliveryType: data.deliveryType,
        role: data.cricketRole,
        language: data.language,
        consentAt: timestamp,
        clinicianId: data.clinicianId,
        clinicianName: clinician.displayName,
        stage: "Ready",
        stageStatus: "active",
        updatedAt: timestamp,
      });
    }
    const account = { id, email, role: "player" };
    response.status(201).json(sessionResult(account, data.name));
  },
);

app.post(
  "/api/auth/register/clinician",
  authRateLimit,
  async (request, response) => {
    const parsed = z
      .object({
        email: z.string().email().max(200),
        password: passwordSchema,
        registrationNumber: z.string().min(4).max(80),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return response
        .status(400)
        .json({ error: "Enter valid ICC registry details" });
    const email = parsed.data.email.trim().toLowerCase();
    const registry = pool
      ? (
          await pool.query(
            "select * from clinicians where lower(email)=$1 and registration_number=$2 and active=true and verified=true",
            [email, parsed.data.registrationNumber.trim()],
          )
        ).rows[0]
      : [...memory.clinicians.values()].find(
          (value) =>
            value.email === email &&
            value.registrationNumber === parsed.data.registrationNumber.trim(),
        );
    if (!registry)
      return response.status(403).json({
        error:
          "These details do not match the verified ICC clinician directory",
      });
    if (await findAccountByEmail(email))
      return response
        .status(409)
        .json({ error: "This clinician account is already active" });
    const id = registry.id;
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    if (pool)
      await pool.query(
        "insert into accounts (id,email,password_hash,role) values ($1,$2,$3,'clinician')",
        [id, email, passwordHash],
      );
    else
      memory.accounts.set(id, {
        id,
        email,
        passwordHash,
        role: "clinician",
      });
    response
      .status(201)
      .json(
        sessionResult(
          { id, email, role: "clinician" },
          registry.display_name ?? registry.displayName,
        ),
      );
  },
);

app.get(
  "/api/auth/me",
  authenticate(["player", "clinician"]),
  async (request, response) => {
    const account = pool
      ? (
          await pool.query("select * from accounts where id=$1", [
            request.session.userId,
          ])
        ).rows[0]
      : memory.accounts.get(request.session.userId);
    if (!account)
      return response.status(401).json({ error: "Account not found" });
    const owner =
      request.session.role === "player"
        ? pool
          ? (
              await pool.query(
                "select display_name as name from players where id=$1",
                [account.id],
              )
            ).rows[0]
          : memory.players.get(account.id)
        : pool
          ? (
              await pool.query(
                "select display_name as name from clinicians where id=$1",
                [account.id],
              )
            ).rows[0]
          : memory.clinicians.get(account.id);
    response.json({
      id: account.id,
      email: account.email,
      role: account.role,
      name: owner?.name ?? owner?.displayName,
    });
  },
);

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
      const result = await pool.query(
        `select p.*, c.display_name as clinician_name
         from players p left join clinicians c on c.id=p.clinician_id
         where p.id=$1`,
        [request.params.id],
      );
      if (
        request.session.role === "clinician" &&
        result.rows[0]?.clinician_id !== request.session.userId
      )
        return response
          .status(403)
          .json({ error: "Player is not linked to this clinician" });
      return response.json(result.rows[0] ?? null);
    }
    const player = memory.players.get(request.params.id) ?? null;
    if (
      request.session.role === "clinician" &&
      player?.clinicianId !== request.session.userId
    )
      return response
        .status(403)
        .json({ error: "Player is not linked to this clinician" });
    response.json(player);
  },
);

app.get(
  "/api/clinician/players",
  authenticate(["clinician"]),
  async (request, response) => {
    if (pool) {
      const result = await pool.query(
        "select p.*, coalesce(json_agg(t order by t.completed_at desc) filter (where t.id is not null), '[]') as tests from players p left join test_records t on t.player_id=p.id where p.clinician_id=$1 group by p.id order by p.updated_at desc",
        [request.session.userId],
      );
      return response.json(result.rows);
    }
    response.json(
      [...memory.players.values()]
        .filter((player) => player.clinicianId === request.session.userId)
        .map((player) => ({
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
  const playerForNotification = pool
    ? (
        await pool.query("select clinician_id from players where id=$1", [
          t.playerId,
        ])
      ).rows[0]
    : memory.players.get(t.playerId);
  const clinicianId =
    playerForNotification?.clinician_id ?? playerForNotification?.clinicianId;
  if (clinicianId)
    await createNotification(
      clinicianId,
      "clinician",
      t.symptoms.length ? "symptom-alert" : "check-in",
      t.symptoms.length ? "Symptoms need review" : "New check-in ready",
      t.symptoms.length
        ? "A linked player reported symptoms and cannot be approved."
        : "A linked player completed a movement check-in.",
    );
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
    const linkedClinician = player?.clinician_id ?? player?.clinicianId;
    if (!player || !test)
      return response
        .status(404)
        .json({ error: "Player or check-in not found" });
    if (linkedClinician !== request.session.userId)
      return response
        .status(403)
        .json({ error: "Player is not linked to this clinician" });
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
    await createNotification(
      d.playerId,
      "player",
      "decision",
      d.decision === "approve" ? "Stage approved" : "Stage held",
      d.decision === "approve"
        ? `Your clinician moved your journey to ${next}.`
        : "Your clinician held your current stage and left a review note.",
    );
    response.json({
      stage: next,
      status: d.decision === "approve" ? "active" : "held",
    });
  },
);

async function linkedConversation(requestedPlayerId, session) {
  const playerId =
    session.role === "player" ? session.userId : requestedPlayerId;
  if (!playerId) return null;
  const player = pool
    ? (
        await pool.query(
          "select id,clinician_id,display_name from players where id=$1",
          [playerId],
        )
      ).rows[0]
    : memory.players.get(playerId);
  if (!player) return null;
  const clinicianId = player.clinician_id ?? player.clinicianId;
  if (session.role === "clinician" && clinicianId !== session.userId)
    return null;
  return { playerId, clinicianId, player };
}

app.get(
  "/api/messages",
  authenticate(["player", "clinician"]),
  async (request, response) => {
    const conversation = await linkedConversation(
      String(request.query.playerId ?? ""),
      request.session,
    );
    if (!conversation)
      return response
        .status(403)
        .json({ error: "Conversation is not available" });
    if (pool) {
      await pool.query(
        request.session.role === "player"
          ? "update messages set read_by_player=true where player_id=$1 and clinician_id=$2"
          : "update messages set read_by_clinician=true where player_id=$1 and clinician_id=$2",
        [conversation.playerId, conversation.clinicianId],
      );
      const result = await pool.query(
        `select id,player_id,clinician_id,sender_role,body,created_at,read_by_player,read_by_clinician
         from messages where player_id=$1 and clinician_id=$2 order by created_at asc limit 200`,
        [conversation.playerId, conversation.clinicianId],
      );
      return response.json(result.rows);
    }
    const values = [...memory.messages.values()]
      .filter(
        (message) =>
          message.playerId === conversation.playerId &&
          message.clinicianId === conversation.clinicianId,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((message) => {
        const next = {
          ...message,
          ...(request.session.role === "player"
            ? { readByPlayer: true }
            : { readByClinician: true }),
        };
        memory.messages.set(next.id, next);
        return next;
      });
    response.json(values);
  },
);

app.post(
  "/api/messages",
  authenticate(["player", "clinician"]),
  async (request, response) => {
    const parsed = z
      .object({
        playerId: z.string().max(100),
        body: z.string().trim().min(1).max(1000),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return response
        .status(400)
        .json({ error: "Write a message under 1,000 characters" });
    const conversation = await linkedConversation(
      parsed.data.playerId,
      request.session,
    );
    if (!conversation)
      return response
        .status(403)
        .json({ error: "Conversation is not available" });
    const message = {
      id: `message-${crypto.randomUUID()}`,
      playerId: conversation.playerId,
      clinicianId: conversation.clinicianId,
      senderRole: request.session.role,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
      readByPlayer: request.session.role === "player",
      readByClinician: request.session.role === "clinician",
    };
    if (pool)
      await pool.query(
        `insert into messages (id,player_id,clinician_id,sender_role,body,created_at,read_by_player,read_by_clinician)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          message.id,
          message.playerId,
          message.clinicianId,
          message.senderRole,
          message.body,
          message.createdAt,
          message.readByPlayer,
          message.readByClinician,
        ],
      );
    else memory.messages.set(message.id, message);
    const recipientRole =
      request.session.role === "player" ? "clinician" : "player";
    const recipientId =
      recipientRole === "player"
        ? conversation.playerId
        : conversation.clinicianId;
    await createNotification(
      recipientId,
      recipientRole,
      "message",
      "New care-team message",
      request.session.role === "player"
        ? "A linked player sent you a message."
        : "Your clinician sent you a message.",
    );
    response.status(201).json(message);
  },
);

app.get(
  "/api/notifications",
  authenticate(["player", "clinician"]),
  async (request, response) => {
    if (pool) {
      const result = await pool.query(
        `select id,type,title,body,created_at,read_at from notifications
         where recipient_id=$1 and recipient_role=$2 order by created_at desc limit 50`,
        [request.session.userId, request.session.role],
      );
      return response.json(result.rows);
    }
    response.json(
      [...memory.notifications.values()]
        .filter(
          (notification) =>
            notification.recipientId === request.session.userId &&
            notification.recipientRole === request.session.role,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },
);

app.patch(
  "/api/notifications/read",
  authenticate(["player", "clinician"]),
  async (request, response) => {
    const parsed = z
      .object({ id: z.string().max(120).optional() })
      .safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({ error: "Invalid notification" });
    const timestamp = new Date().toISOString();
    if (pool)
      await pool.query(
        `update notifications set read_at=$1
         where recipient_id=$2 and recipient_role=$3 and ($4::text is null or id=$4)`,
        [
          timestamp,
          request.session.userId,
          request.session.role,
          parsed.data.id ?? null,
        ],
      );
    else
      for (const notification of memory.notifications.values()) {
        if (
          notification.recipientId === request.session.userId &&
          notification.recipientRole === request.session.role &&
          (!parsed.data.id || notification.id === parsed.data.id)
        )
          memory.notifications.set(notification.id, {
            ...notification,
            readAt: timestamp,
          });
      }
    response.json({ ok: true });
  },
);

app.post(
  "/api/explain",
  explanationRateLimit,
  authenticate(["player"]),
  async (request, response) => {
    const parsed = z
      .object({
        stage: z.enum(stages),
        language: z.enum(["en", "bn", "hi", "ur"]),
        question: z.string().max(300).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return response
        .status(400)
        .json({ error: "Invalid explanation request" });
    const { stage, language, question = "" } = parsed.data;
    const source = guideline.stages.find((item) => item.label === stage);
    const citation = `ICC Return to Play Post Pregnancy Guidelines, page ${source.reference.pdfPage}, ${source.reference.section}`;
    const refusal =
      /clear|diagnos|safe to|can i|খেলতে নিরাপদ|ছাড়পত্র|खेलना सुरक्षित|طبی منظوری|کھیلنا محفوظ/i.test(
        question,
      );
    const copy = {
      en: {
        summary: source.purpose,
        next: "Use this stage as a conversation guide with your linked clinician and care team.",
        safety:
          "This explanation cannot diagnose, clear, or advance your stage. Please seek clinician review.",
        refusal:
          "I cannot provide medical clearance or decide whether you are safe to return. Please discuss this with your qualified clinician.",
      },
      bn: {
        summary: `আপনি এখন ${stage} ধাপে আছেন। ধীরে ধীরে সুস্থতা ও সহায়তাপ্রাপ্ত কার্যক্রমে মনোযোগ দিন।`,
        next: "এই ধাপটি আপনার সংযুক্ত চিকিৎসক ও কেয়ার টিমের সঙ্গে আলোচনার নির্দেশিকা হিসেবে ব্যবহার করুন।",
        safety:
          "এই ব্যাখ্যা রোগ নির্ণয়, ছাড়পত্র বা ধাপ পরিবর্তন করতে পারে না। চিকিৎসকের পর্যালোচনা নিন।",
        refusal:
          "আমি চিকিৎসাগত ছাড়পত্র দিতে বা আপনি খেলায় ফিরতে নিরাপদ কি না সিদ্ধান্ত নিতে পারি না। আপনার যোগ্য চিকিৎসকের সঙ্গে কথা বলুন।",
      },
      hi: {
        summary: `आप अभी ${stage} चरण में हैं। धीरे-धीरे स्वास्थ्य लाभ और देखरेख में गतिविधि पर ध्यान दें।`,
        next: "इस चरण को अपने जुड़े चिकित्सक और देखभाल दल के साथ बातचीत की मार्गदर्शिका के रूप में उपयोग करें।",
        safety:
          "यह व्याख्या निदान, मंजूरी या चरण नहीं बदल सकती। चिकित्सक की समीक्षा लें।",
        refusal:
          "मैं चिकित्सकीय मंजूरी नहीं दे सकता या यह तय नहीं कर सकता कि आपकी वापसी सुरक्षित है। योग्य चिकित्सक से बात करें।",
      },
      ur: {
        summary: `آپ اس وقت ${stage} مرحلے میں ہیں۔ بتدریج بحالی اور نگرانی میں سرگرمی پر توجہ دیں۔`,
        next: "اس مرحلے کو اپنے منسلک معالج اور نگہداشت ٹیم کے ساتھ گفتگو کی رہنمائی کے طور پر استعمال کریں۔",
        safety:
          "یہ وضاحت تشخیص، منظوری یا مرحلہ تبدیل نہیں کر سکتی۔ معالج سے جائزہ لیں۔",
        refusal:
          "میں طبی منظوری نہیں دے سکتا یا یہ فیصلہ نہیں کر سکتا کہ آپ کی واپسی محفوظ ہے۔ مستند معالج سے بات کریں۔",
      },
    }[language];
    const safety = copy.safety;
    if (refusal || !process.env.GROQ_API_KEY)
      return response.json({
        stage,
        summary: refusal ? copy.refusal : copy.summary,
        nextStep: copy.next,
        safetyNote: safety,
        citations: [citation],
        source: refusal ? "guardrail" : "grounded-fallback",
      });
    const groq = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
                question,
                source,
                limitations: guideline.scope.limitations,
                evidence: tests.evidenceBoundary,
                citation,
              }),
            },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );
    if (!groq.ok)
      return response.json({
        stage,
        summary: copy.summary,
        nextStep: copy.next,
        safetyNote: safety,
        citations: [citation],
        source: "grounded-fallback",
      });
    const payload = await groq.json();
    try {
      const result = z
        .object({
          stage: z.enum(stages),
          summary: z.string().min(1).max(900),
          nextStep: z.string().min(1).max(500),
          safetyNote: z.string().min(1).max(500),
          citations: z.array(z.string()).min(1).max(2),
        })
        .parse(JSON.parse(payload.choices[0].message.content));
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
        summary: copy.summary,
        nextStep: copy.next,
        safetyNote: safety,
        citations: [citation],
        source: "grounded-fallback",
      });
    }
  },
);

app.use((error, _request, response, _next) => {
  void _next;
  console.error(error);
  response.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT ?? 10000);
app.listen(port, "0.0.0.0", () =>
  console.log(`ComeBack API listening on ${port}`),
);
