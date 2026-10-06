// Explicit local-only provisioning; never run automatically during migration/startup.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const base = "http://localhost:5000";
const password = process.env.ACTOR_DEMO_PASSWORD || "RoomieDemo@2026!";
assert.ok(
  password.length >= 8 && password.length <= 200,
  "Demo password must have 8–200 characters.",
);
const actors = [
  {
    actor: "Member",
    email: "member@roomiematch.vn",
    name: "Thành viên Demo",
    role: "member",
  },
  {
    actor: "Premium",
    email: "maianh@roomiematch.vn",
    name: "Mai Anh",
    role: "member",
    seedId: "00000000-0000-0000-0000-000000000001",
  },
  {
    actor: "Moderator",
    email: "moderator@roomiematch.vn",
    name: "Kiểm duyệt viên RoomieMatch",
    role: "moderator",
  },
  {
    actor: "Admin",
    email: "admin@roomiematch.vn",
    name: "Quản trị viên RoomieMatch",
    role: "admin",
    seedId: "00000000-0000-0000-0000-000000000099",
  },
];
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function sql(query) {
  try {
    return execFileSync(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "roomiematch",
        "-d",
        "roomiematch",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
  } catch {
    throw new Error(
      "Local database operation failed. Ensure Docker Compose postgres is available.",
    );
  }
}
async function request(
  path,
  { method = "GET", body, token, expected = 200 } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected ${expected}, received ${response.status}`,
  );
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}
const login = (email) =>
  request("/api/auth/login", { method: "POST", body: { email, password } });
let donorId;
const sessions = [];
try {
  for (const actor of actors) {
    const found = sql(
      `SELECT row_to_json(u) FROM (SELECT id, role, auth_provider, password_hash IS NOT NULL AS has_password FROM users WHERE email=${quote(actor.email)}) u;`,
    );
    let row = found ? JSON.parse(found) : null;
    if (row) {
      assert.ok(
        row.auth_provider === "local-demo" ||
          (actor.seedId === row.id && row.auth_provider === "seed"),
        `Refusing to change a non-demo account: ${actor.email}`,
      );
      assert.equal(
        row.role,
        actor.role,
        `Unexpected existing role for ${actor.email}`,
      );
    } else {
      const registered = await request("/api/auth/register", {
        method: "POST",
        expected: 200,
        body: {
          email: actor.email,
          password,
          displayName: actor.name,
          city: "TP.HCM",
          gender: "male",
          district: "Quận 1",
        },
      });
      row = { id: registered.user.id, role: "member", has_password: true };
      sql(
        `UPDATE users SET auth_provider='local-demo', role=${quote(actor.role)} WHERE id=${quote(row.id)} AND email=${quote(actor.email)};`,
      );
      await request("/api/auth/logout", {
        method: "POST",
        expected: 204,
        body: { refreshToken: registered.refreshToken },
      });
    }
    if (!row.has_password) {
      assert.ok(
        donorId,
        "Create the member demo before setting seed passwords.",
      );
      // Copy a hash produced by the backend PasswordHashService, never implement hashing here.
      sql(
        `UPDATE users SET password_hash=(SELECT password_hash FROM users WHERE id=${quote(donorId)} AND auth_provider='local-demo'), updated_at=now() WHERE id=${quote(row.id)} AND email=${quote(actor.email)} AND auth_provider='seed' AND password_hash IS NULL;`,
      );
    }
    const session = await login(actor.email);
    assert.equal(session.user.role, actor.role);
    sessions.push({ actor, session });
    if (!donorId) donorId = session.user.id;
    if (actor.role === "member") {
      const status = await request("/api/users/me/onboarding", {
        token: session.accessToken,
      });
      if (!status.isComplete) {
        const profile = await request("/api/users/me/profile", {
          token: session.accessToken,
        });
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
            bio:
              profile.bio ||
              "Hồ sơ demo để kiểm tra các vai trò trong hệ thống.",
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
    if (actor.actor === "Premium") {
      sql(`INSERT INTO subscriptions (user_id,plan,status,starts_at,ends_at)
      SELECT ${quote(session.user.id)},'premium','active',now(),now()+interval '30 days'
      WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id=${quote(session.user.id)} AND plan='premium' AND status='active' AND (ends_at IS NULL OR ends_at>now()));`);
    }
  }
  for (const { actor, session } of sessions) {
    const me = await request("/api/auth/me", { token: session.accessToken });
    assert.equal(me.role, actor.role);
    const subscription = await request("/api/billing/me/subscription", {
      token: session.accessToken,
    });
    if (actor.role === "member") {
      assert.equal(subscription.isPremium, actor.actor === "Premium");
      assert.equal(
        (
          await request("/api/users/me/onboarding", {
            token: session.accessToken,
          })
        ).isComplete,
        true,
      );
      await request("/api/matching/me/matches?minCleanliness=4", {
        token: session.accessToken,
        expected: actor.actor === "Premium" ? 200 : 403,
      });
    }
    await request("/api/admin/reports", {
      token: session.accessToken,
      expected: actor.role === "member" ? 403 : 200,
    });
    await request("/api/admin/stats", {
      token: session.accessToken,
      expected: actor.role === "admin" ? 200 : 403,
    });
    console.log(
      `PASS ${actor.actor}: ${actor.email}; role=${me.role}; premium=${subscription.isPremium}`,
    );
  }
  await request("/api/admin/stats", { expected: 401 });
  console.log(
    "PASS Guest: protected API returns 401. Actor setup verified against local API/PostgreSQL.",
  );
} finally {
  for (const { session } of sessions) {
    await request("/api/auth/logout", {
      method: "POST",
      expected: 204,
      body: { refreshToken: session.refreshToken },
    });
  }
}
