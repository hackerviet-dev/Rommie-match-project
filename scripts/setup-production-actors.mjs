// Explicit, manual provisioning of the team's demo actors on production (Render API + Neon).
// Never run automatically. Passwords come only from the environment and are never printed.
//
// Requires: npm install --no-save pg   (run once at the repo root)
// Usage (PowerShell):
//   $env:API_BASE_URL="https://<render-service>.onrender.com"
//   $env:DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"
//   $env:ACTOR_PASSWORD_MEMBER="..."; $env:ACTOR_PASSWORD_PREMIUM="..."
//   $env:ACTOR_PASSWORD_MODERATOR="..."; $env:ACTOR_PASSWORD_ADMIN="..."
//   $env:CONFIRM_PRODUCTION="yes"
//   node scripts/setup-production-actors.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// SHA-256 of the local demo password committed in setup-local-actors.mjs; it must never reach production.
const LOCAL_DEMO_PASSWORD_SHA256 =
  "294ca7f3bc23792c3128fe76756460408b314f76af2ecb6eb30f37511f4d7dbf";
const PROVIDER = "prod-demo";
const MIN_PASSWORD_LENGTH = 14;

assert.equal(
  process.env.CONFIRM_PRODUCTION,
  "yes",
  "Set CONFIRM_PRODUCTION=yes to confirm you intend to change production.",
);
const base = (process.env.API_BASE_URL || "").replace(/\/+$/, "");
assert.ok(/^https:\/\//.test(base), "API_BASE_URL must be the https production API URL.");
assert.ok(process.env.DATABASE_URL, "DATABASE_URL (Neon connection string) is required.");

const actors = [
  { actor: "Member", env: "ACTOR_PASSWORD_MEMBER", email: "member@roomiematch.vn", name: "Thành viên Demo", role: "member" },
  { actor: "Premium", env: "ACTOR_PASSWORD_PREMIUM", email: "maianh@roomiematch.vn", name: "Mai Anh", role: "member", premium: true },
  { actor: "Moderator", env: "ACTOR_PASSWORD_MODERATOR", email: "moderator@roomiematch.vn", name: "Kiểm duyệt viên RoomieMatch", role: "moderator" },
  { actor: "Admin", env: "ACTOR_PASSWORD_ADMIN", email: "admin@roomiematch.vn", name: "Quản trị viên RoomieMatch", role: "admin" },
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const actor of actors) {
  actor.password = process.env[actor.env] || "";
  assert.ok(
    actor.password.length >= MIN_PASSWORD_LENGTH && actor.password.length <= 200,
    `${actor.env} must have ${MIN_PASSWORD_LENGTH}–200 characters.`,
  );
  assert.notEqual(sha256(actor.password), LOCAL_DEMO_PASSWORD_SHA256, `${actor.env} must not reuse the local demo password.`);
}
assert.equal(
  new Set(actors.map((actor) => actor.password)).size,
  actors.length,
  "Each actor needs its own password.",
);

let pg;
try {
  pg = (await import("pg")).default;
} catch {
  throw new Error("Missing 'pg'. Run: npm install --no-save pg");
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(path, { method = "GET", body, token, expected = 200 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    // Credential endpoints are rate limited; wait instead of failing halfway through.
    if (response.status === 429 && attempt < 5) {
      const seconds = Number(response.headers.get("Retry-After")) || 30;
      console.log(`Rate limited on ${path}; waiting ${seconds}s...`);
      await sleep(seconds * 1000);
      continue;
    }
    assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, received ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  }
}

const sessions = [];
await db.connect();
try {
  for (const actor of actors) {
    const { rows } = await db.query("SELECT id, role, auth_provider FROM users WHERE email = $1", [actor.email]);
    if (rows[0]) {
      // Only accounts this script created may be reused; never take over a real user's email.
      assert.equal(rows[0].auth_provider, PROVIDER, `Refusing to change a non-demo account: ${actor.email}`);
      assert.equal(rows[0].role, actor.role, `Unexpected existing role for ${actor.email}`);
    } else {
      const registered = await request("/api/auth/register", {
        method: "POST",
        body: {
          email: actor.email,
          password: actor.password,
          displayName: actor.name,
          city: "TP.HCM",
          gender: "male",
          district: "Quận 1",
        },
      });
      const updated = await db.query(
        "UPDATE users SET auth_provider = $1, role = $2, updated_at = now() WHERE id = $3 AND email = $4",
        [PROVIDER, actor.role, registered.user.id, actor.email],
      );
      assert.equal(updated.rowCount, 1, `Could not assign role for ${actor.email}`);
      await request("/api/auth/logout", { method: "POST", expected: 204, body: { refreshToken: registered.refreshToken } });
    }
    const session = await request("/api/auth/login", {
      method: "POST",
      body: { email: actor.email, password: actor.password },
    });
    assert.equal(session.user.role, actor.role);
    sessions.push({ actor, session });

    if (actor.role === "member") {
      const status = await request("/api/users/me/onboarding", { token: session.accessToken });
      if (!status.isComplete) {
        const profile = await request("/api/users/me/profile", { token: session.accessToken });
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        await request("/api/users/me/onboarding", {
          method: "PUT",
          token: session.accessToken,
          body: {
            name: profile.displayName,
            age: "24",
            gender: profile.gender === "female" ? "Nữ" : "Nam",
            employment: "Đang đi làm",
            orgName: "RoomieMatch Demo",
            hideOrg: false,
            city: profile.city,
            bio: profile.bio || "Hồ sơ demo để kiểm tra các vai trò trong hệ thống.",
            sleep: "22h–0h",
            env: "Yên tĩnh",
            yn: { smoke: "Không", drink: "Không", pets: "Có" },
            cleanliness: 4,
            extroversion: 60,
            budgetMin: 3,
            budgetMax: 7,
            hasRoom: "no",
            distance: "2–5 km",
            roomType: "Phòng riêng",
            moveInDate: today,
            amenities: [],
          },
        });
      }
    }
    if (actor.premium) {
      await db.query(
        `INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at)
         SELECT $1, 'premium', 'active', now(), now() + interval '30 days'
         WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = $1 AND plan = 'premium'
                           AND status = 'active' AND (ends_at IS NULL OR ends_at > now()))`,
        [session.user.id],
      );
    }
  }

  for (const { actor, session } of sessions) {
    const me = await request("/api/auth/me", { token: session.accessToken });
    assert.equal(me.role, actor.role);
    const subscription = await request("/api/billing/me/subscription", { token: session.accessToken });
    if (actor.role === "member") assert.equal(subscription.isPremium, Boolean(actor.premium));
    await request("/api/admin/reports", { token: session.accessToken, expected: actor.role === "member" ? 403 : 200 });
    await request("/api/admin/stats", { token: session.accessToken, expected: actor.role === "admin" ? 200 : 403 });
    console.log(`PASS ${actor.actor}: ${actor.email}; role=${me.role}; premium=${subscription.isPremium}`);
  }
  await request("/api/admin/stats", { expected: 401 });
  console.log("PASS Guest: protected API returns 401. Production actors verified.");
} finally {
  for (const { session } of sessions) {
    await request("/api/auth/logout", { method: "POST", expected: 204, body: { refreshToken: session.refreshToken } }).catch(() => {});
  }
  await db.end();
}
