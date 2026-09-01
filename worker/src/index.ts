export interface Env {
  DB: D1Database;
  ENCRYPTION_KEY_B64: string;
  ALLOWED_ORIGIN?: string;
  ADMIN_API_TOKEN?: string;
  TURNSTILE_SECRET_KEY?: string;
  RATE_LIMIT_PER_MINUTE?: string;
}

type JsonRecord = Record<string, unknown>;
type StepStatus = "draft" | "locked" | "submitted" | "approved" | "rejected" | "changes_requested" | "completed";

const STEPS = [
  ["insurance_quote", "بيانات التأمين", 1],
  ["customer_info", "بيانات مالك الوثيقة", 2],
  ["insurer_selected", "اختيار الشركة والعرض", 3],
  ["payment", "الدفع", 4],
  ["post_payment_otp", "رمز تحقق البطاقة", 5],
  ["phone_entry", "رقم الجوال", 6],
  ["phone_verification", "تأكيد رقم الهاتف", 7],
  ["confirm", "تأكيد الطلب", 8],
  ["verify", "التحقق النهائي", 9],
  ["activate", "تفعيل الوثيقة", 10],
  ["confirmation", "إتمام الطلب", 11],
] as const;

const rateBuckets = new Map<string, { count: number; expiresAt: number }>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function originFor(request: Request, env: Env): string {
  return env.ALLOWED_ORIGIN || request.headers.get("Origin") || "*";
}

function responseHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Origin": originFor(request, env),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  });
  return headers;
}

function json(request: Request, env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request, env) });
}

function errorResponse(request: Request, env: Env, message: string, status = 400): Response {
  return json(request, env, { error: message }, status);
}

function now(): number {
  return Date.now();
}

function id(): string {
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function bodyJson(request: Request): Promise<JsonRecord> {
  const value = await request.json().catch(() => null);
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown, max = 256): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function requiredString(value: unknown, field: string, max = 256): string {
  const result = stringValue(value, max);
  if (!result) throw new Error(`${field} is required`);
  return result;
}

function numericId(value: unknown): string {
  const result = requiredString(value, "application id", 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(result)) throw new Error("invalid application id");
  return result;
}

function applicationId(value: unknown): string {
  const result = requiredString(value, "applicationId", 32);
  if (!/^APP-[A-Z0-9]{6,26}$/.test(result)) throw new Error("invalid applicationId");
  return result;
}

function customerId(value: unknown): string {
  const result = requiredString(value, "customerId", 128);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(result)) throw new Error("invalid customerId");
  return result;
}

function stepTitle(stepKey: string): string {
  return STEPS.find(([key]) => key === stepKey)?.[1] || stepKey;
}

function stepOrder(stepKey: string): number {
  return STEPS.find(([key]) => key === stepKey)?.[2] || 99;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function cryptoKey(env: Env): Promise<CryptoKey> {
  if (!env.ENCRYPTION_KEY_B64) throw new Error("ENCRYPTION_KEY_B64 is not configured");
  const raw = fromBase64(env.ENCRYPTION_KEY_B64);
  if (raw.byteLength !== 32) throw new Error("ENCRYPTION_KEY_B64 must decode to 32 bytes");
  return crypto.subtle.importKey("raw", raw as unknown as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: unknown, env: Env): Promise<string> {
  const key = await cryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(value))));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return base64(combined);
}

async function decrypt<T>(value: string | null, env: Env): Promise<T | null> {
  if (!value) return null;
  const combined = fromBase64(value);
  const key = await cryptoKey(env);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return JSON.parse(decoder.decode(plaintext)) as T;
}

function safeScalar(value: unknown): unknown {
  if (typeof value === "string") return value.trim().slice(0, 2000);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 30).map(safeScalar);
  if (isRecord(value)) {
    const result: JsonRecord = {};
    for (const [key, item] of Object.entries(value).slice(0, 60)) result[key.slice(0, 80)] = safeScalar(item);
    return result;
  }
  return null;
}

const blockedSensitiveKeys = /(card(number|_number)|cvv|cvc|otp(?!_status|_length)|verification[_-]?code|password|turnstile[_-]?token)/i;

function sanitizeStepData(stepKey: string, value: unknown): JsonRecord {
  const source = isRecord(value) ? value : {};
  if (stepKey === "payment") {
    const cardLast4 = stringValue(source.card_last4, 4);
    if (!cardLast4 || !/^\d{4}$/.test(cardLast4)) throw new Error("card_last4 must contain exactly four digits");
    return {
      cardholder_name: requiredString(source.cardholder_name, "cardholder_name", 160),
      card_last4: cardLast4,
    };
  }
  if (stepKey.endsWith("otp")) {
    const length = Number(source.otp_length);
    if (!Number.isInteger(length) || length < 4 || length > 6) throw new Error("invalid OTP length");
    return { otp_status: "submitted", otp_length: length };
  }
  const result: JsonRecord = {};
  for (const [key, item] of Object.entries(source)) {
    if (blockedSensitiveKeys.test(key)) continue;
    if (key === "captcha_token") continue;
    if (key === "phone" && typeof item === "string") {
      const phone = item.replace(/\D/g, "").slice(0, 15);
      if (phone) result[key] = phone;
      continue;
    }
    result[key.slice(0, 80)] = safeScalar(item);
  }
  return result;
}

function sanitizeAnalytics(value: unknown): JsonRecord {
  const source = isRecord(value) ? value : {};
  const result: JsonRecord = {};
  for (const key of ["step", "company", "plan", "page"]) {
    const valueForKey = stringValue(source[key], 160);
    if (valueForKey) result[key] = valueForKey;
  }
  return result;
}

async function verifyTurnstile(token: string | null, request: Request, env: Env): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const result = (await response.json().catch(() => ({}))) as { success?: boolean };
  return result.success === true;
}

function rateLimit(request: Request, env: Env): boolean {
  const key = request.headers.get("CF-Connecting-IP") || "anonymous";
  const current = now();
  const limit = Math.max(10, Number(env.RATE_LIMIT_PER_MINUTE || 60));
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.expiresAt <= current) {
    rateBuckets.set(key, { count: 1, expiresAt: current + 60_000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function publicApplication(row: Record<string, unknown>): JsonRecord {
  return {
    id: row.id,
    application_id: row.application_id,
    customer_id: row.customer_id,
    overall_status: row.overall_status,
    current_step: row.current_step,
    insurance_type: row.insurance_type,
    metadata: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_activity_at: row.last_activity_at,
  };
}

function publicStep(row: Record<string, unknown>): JsonRecord {
  return {
    id: row.id,
    application_id: row.application_id,
    step_key: row.step_key,
    title: row.title,
    step_order: row.step_order,
    status: row.status,
    data: null,
    locked: Boolean(row.locked),
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    reviewed_by: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createApplication(request: Request, env: Env): Promise<Response> {
  const body = await bodyJson(request);
  const publicId = applicationId(body.applicationId);
  const customer = customerId(body.customerId);
  const insurance = stringValue(body.insuranceType, 64) || "car";
  const internalId = id();
  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO applications (id, application_id, customer_id, overall_status, current_step, insurance_type, created_at, updated_at, last_activity_at)
     VALUES (?, ?, ?, 'draft', 'insurance_quote', ?, ?, ?, ?)`,
  ).bind(internalId, publicId, customer, insurance, timestamp, timestamp, timestamp).run();
  for (const [key, title, order] of STEPS) {
    const stepTimestamp = now();
    await env.DB.prepare(
      `INSERT INTO application_steps (id, application_id, step_key, title, step_order, status, locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id(), internalId, key, title, order, order === 1 ? "draft" : "locked", order === 1 ? 0 : 1, stepTimestamp, stepTimestamp).run();
  }
  await env.DB.prepare(
    `INSERT INTO application_history (id, application_id, event_type, actor, created_at) VALUES (?, ?, 'application_created', 'customer', ?)`,
  ).bind(id(), internalId, timestamp).run();
  const app = await env.DB.prepare("SELECT * FROM applications WHERE id = ?").bind(internalId).first<Record<string, unknown>>();
  const steps = await env.DB.prepare("SELECT * FROM application_steps WHERE application_id = ? ORDER BY step_order ASC").bind(internalId).all<Record<string, unknown>>();
  return json(request, env, { application: publicApplication(app || {}), steps: steps.results.map(publicStep) }, 201);
}

async function getApplication(request: Request, env: Env, publicId: string): Promise<Response> {
  const app = await env.DB.prepare("SELECT * FROM applications WHERE application_id = ?").bind(publicId).first<Record<string, unknown>>();
  if (!app) return errorResponse(request, env, "لم يتم العثور على الطلب", 404);
  const steps = await env.DB.prepare("SELECT * FROM application_steps WHERE application_id = ? ORDER BY step_order ASC").bind(app.id).all<Record<string, unknown>>();
  return json(request, env, { application: publicApplication(app), steps: steps.results.map(publicStep) });
}

async function submitStep(request: Request, env: Env, publicId: string, stepKey: string): Promise<Response> {
  const body = await bodyJson(request);
  if (!getStepByKey(stepKey)) return errorResponse(request, env, "خطوة غير صالحة");
  const app = await env.DB.prepare("SELECT * FROM applications WHERE application_id = ?").bind(publicId).first<Record<string, unknown>>();
  if (!app) return errorResponse(request, env, "لم يتم العثور على الطلب", 404);
  const requestData = isRecord(body.data) ? body.data : {};
  const captchaToken = stringValue(body.captcha_token ?? requestData.captcha_token, 4096);
  if (stepKey === "insurance_quote" && !(await verifyTurnstile(captchaToken, request, env))) return errorResponse(request, env, "تعذر إكمال التحقق الأمني", 403);
  const data = sanitizeStepData(stepKey, requestData);
  const encryptedData = await encrypt(data, env);
  const timestamp = now();
  const existing = await env.DB.prepare("SELECT * FROM application_steps WHERE application_id = ? AND step_key = ?").bind(app.id, stepKey).first<Record<string, unknown>>();
  const version = Number(existing?.version_number || 0) + 1;
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO application_steps (id, application_id, step_key, title, step_order, status, locked, data_ciphertext, version_number, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'submitted', 0, ?, ?, ?, ?, ?)`,
    ).bind(id(), app.id, stepKey, stepTitle(stepKey), stepOrder(stepKey), encryptedData, version, timestamp, timestamp, timestamp).run();
  } else {
    await env.DB.prepare(
      `UPDATE application_steps SET status = 'submitted', data_ciphertext = ?, version_number = ?, submitted_at = ?, updated_at = ? WHERE id = ?`,
    ).bind(encryptedData, version, timestamp, timestamp, existing.id).run();
  }
  const previousMetadata = (await decrypt<JsonRecord>(String(app.metadata_ciphertext || "") || null, env)) || {};
  const submitted = isRecord(previousMetadata.submitted_data) ? previousMetadata.submitted_data : {};
  const mergedMetadata: JsonRecord = {
    ...previousMetadata,
    ...data,
    submitted_data: { ...submitted, [stepKey]: data },
    last_step_key: stepKey,
    last_step_title: stepTitle(stepKey),
    last_submitted_at: new Date(timestamp).toISOString(),
  };
  await env.DB.prepare(
    `UPDATE applications SET overall_status = 'under_review', current_step = ?, metadata_ciphertext = ?, last_activity_at = ?, updated_at = ? WHERE id = ?`,
  ).bind(stepKey, await encrypt(mergedMetadata, env), timestamp, timestamp, app.id).run();
  await env.DB.prepare(
    `INSERT INTO application_history (id, application_id, step_key, event_type, actor, details_ciphertext, created_at) VALUES (?, ?, ?, 'step_submitted', 'customer', ?, ?)`,
  ).bind(id(), app.id, stepKey, await encrypt({ version, data }, env), timestamp).run();
  return json(request, env, { success: true });
}

function getStepByKey(stepKey: string): readonly [string, string, number] | undefined {
  return STEPS.find(([key]) => key === stepKey);
}

async function setInsurer(request: Request, env: Env, publicId: string): Promise<Response> {
  const body = await bodyJson(request);
  const companyName = requiredString(body.companyName, "companyName", 160);
  const priceSar = Number(body.priceSar);
  if (!Number.isFinite(priceSar) || priceSar < 0 || priceSar > 10_000_000) return errorResponse(request, env, "invalid priceSar");
  const app = await env.DB.prepare("SELECT * FROM applications WHERE application_id = ?").bind(publicId).first<Record<string, unknown>>();
  if (!app) return errorResponse(request, env, "لم يتم العثور على الطلب", 404);
  const metadata = (await decrypt<JsonRecord>(String(app.metadata_ciphertext || "") || null, env)) || {};
  metadata.insurer_company = companyName;
  metadata.insurer_offer_sar = priceSar;
  const timestamp = now();
  await env.DB.prepare("UPDATE applications SET current_step = 'insurer_selected', metadata_ciphertext = ?, last_activity_at = ?, updated_at = ? WHERE id = ?")
    .bind(await encrypt(metadata, env), timestamp, timestamp, app.id).run();
  return json(request, env, { success: true });
}

async function currentStep(request: Request, env: Env, publicId: string): Promise<Response> {
  const body = await bodyJson(request);
  const stepKey = requiredString(body.stepKey, "stepKey", 64);
  if (!getStepByKey(stepKey)) return errorResponse(request, env, "خطوة غير صالحة");
  const result = await env.DB.prepare("UPDATE applications SET current_step = ?, last_activity_at = ?, updated_at = ? WHERE application_id = ?")
    .bind(stepKey, now(), now(), publicId).run();
  return result.meta.changes ? json(request, env, { success: true }) : errorResponse(request, env, "لم يتم العثور على الطلب", 404);
}

async function stepStatus(request: Request, env: Env, publicId: string, stepKey: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT s.status FROM application_steps s JOIN applications a ON a.id = s.application_id WHERE a.application_id = ? AND s.step_key = ?")
    .bind(publicId, stepKey).first<{ status: string }>();
  return json(request, env, { status: row?.status || null });
}

async function track(request: Request, env: Env): Promise<Response> {
  const body = await bodyJson(request);
  const sessionId = requiredString(body.sessionId, "sessionId", 128);
  const event = requiredString(body.event, "event", 80);
  const page = requiredString(body.page, "page", 200);
  const data = sanitizeAnalytics(body);
  await env.DB.prepare("INSERT INTO analytics_events (id, session_id, event, page, data_ciphertext, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id(), sessionId, event, page, await encrypt(data, env), now()).run();
  return json(request, env, { success: true });
}

function isAdmin(request: Request, env: Env): boolean {
  const expected = env.ADMIN_API_TOKEN;
  if (!expected) return false;
  return request.headers.get("Authorization") === `Bearer ${expected}`;
}

async function adminList(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse(request, env, "Forbidden", 403);
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const rows = await env.DB.prepare("SELECT * FROM applications ORDER BY last_activity_at DESC LIMIT ?").bind(limit).all<Record<string, unknown>>();
  const applications = await Promise.all(rows.results.map(async (row) => ({ ...publicApplication(row), metadata: await decrypt<JsonRecord>(String(row.metadata_ciphertext || "") || null, env) })));
  return json(request, env, { applications });
}

async function adminDetail(request: Request, env: Env, publicId: string): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse(request, env, "Forbidden", 403);
  const app = await env.DB.prepare("SELECT * FROM applications WHERE application_id = ?").bind(publicId).first<Record<string, unknown>>();
  if (!app) return errorResponse(request, env, "Not found", 404);
  const steps = await env.DB.prepare("SELECT * FROM application_steps WHERE application_id = ? ORDER BY step_order ASC").bind(app.id).all<Record<string, unknown>>();
  const decryptedSteps = await Promise.all(steps.results.map(async (row) => ({ ...publicStep(row), data: await decrypt<JsonRecord>(String(row.data_ciphertext || "") || null, env), reviewed_by: row.reviewed_by || null })));
  return json(request, env, {
    application: { ...publicApplication(app), metadata: await decrypt<JsonRecord>(String(app.metadata_ciphertext || "") || null, env) },
    steps: decryptedSteps,
  });
}

async function adminDecision(request: Request, env: Env, publicId: string, stepKey: string): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse(request, env, "Forbidden", 403);
  const body = await bodyJson(request);
  const decision = stringValue(body.decision, 32);
  if (!decision || !["approved", "rejected", "changes_requested"].includes(decision)) return errorResponse(request, env, "invalid decision");
  const app = await env.DB.prepare("SELECT id FROM applications WHERE application_id = ?").bind(publicId).first<{ id: string }>();
  if (!app) return errorResponse(request, env, "Not found", 404);
  const timestamp = now();
  await env.DB.prepare("UPDATE application_steps SET status = ?, locked = 0, reviewed_at = ?, reviewed_by = 'admin', updated_at = ? WHERE application_id = ? AND step_key = ?")
    .bind(decision, timestamp, timestamp, app.id, stepKey).run();
  await env.DB.prepare("INSERT INTO application_history (id, application_id, step_key, event_type, actor, details_ciphertext, created_at) VALUES (?, ?, ?, 'step_decision', 'admin', ?, ?)")
    .bind(id(), app.id, stepKey, await encrypt({ decision }, env), timestamp).run();
  return json(request, env, { success: true });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "health" && request.method === "GET") return json(request, env, { ok: true });
  if (parts[0] === "applications" && parts.length === 1 && request.method === "POST") return createApplication(request, env);
  if (parts[0] === "applications" && parts.length === 2 && request.method === "GET") return getApplication(request, env, numericId(parts[1]));
  if (parts[0] === "applications" && parts.length === 5 && parts[2] === "steps" && parts[4] === "status" && request.method === "GET") return stepStatus(request, env, numericId(parts[1]), requiredString(parts[3], "stepKey", 64));
  if (parts[0] === "applications" && parts.length === 4 && parts[2] === "steps" && request.method === "POST") return submitStep(request, env, numericId(parts[1]), requiredString(parts[3], "stepKey", 64));
  if (parts[0] === "applications" && parts.length === 3 && parts[2] === "insurer" && request.method === "PATCH") return setInsurer(request, env, numericId(parts[1]));
  if (parts[0] === "applications" && parts.length === 3 && parts[2] === "current-step" && request.method === "PATCH") return currentStep(request, env, numericId(parts[1]));
  if (parts[0] === "track" && request.method === "POST") return track(request, env);
  if (parts[0] === "admin" && parts[1] === "applications" && parts.length === 2 && request.method === "GET") return adminList(request, env);
  if (parts[0] === "admin" && parts[1] === "applications" && parts.length === 3 && request.method === "GET") return adminDetail(request, env, numericId(parts[2]));
  if (parts[0] === "admin" && parts[1] === "applications" && parts.length === 6 && parts[3] === "steps" && parts[5] === "decision" && request.method === "POST") return adminDecision(request, env, numericId(parts[2]), requiredString(parts[4], "stepKey", 64));
  return errorResponse(request, env, "Not found", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(request, env) });
    if (!rateLimit(request, env)) return errorResponse(request, env, "Too many requests", 429);
    try {
      const length = Number(request.headers.get("Content-Length") || 0);
      if (length > 262_144) return errorResponse(request, env, "Payload too large", 413);
      return await route(request, env);
    } catch (error) {
      console.error("worker_request_failed", error instanceof Error ? error.message : "unknown");
      return errorResponse(request, env, "حدث خطأ غير متوقع", 500);
    }
  },
};
