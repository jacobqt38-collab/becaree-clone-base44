// BeCaree workflow client. The public funnel keeps its existing route flow while
// persistence is handled by the Cloudflare Worker + D1 API in /worker.

export interface StepDefinition {
  key: string;
  title: string;
  order: number;
  route: string;
  description: string;
}

export const APPLICATION_STEPS: StepDefinition[] = [
  { key: "insurance_quote", title: "بيانات التأمين", order: 1, route: "/reg", description: "اختيار نوع التأمين وإدخال بيانات المركبة" },
  { key: "customer_info", title: "بيانات مالك الوثيقة", order: 2, route: "/owner", description: "إدخال بيانات مالك الوثيقة" },
  { key: "insurer_selected", title: "اختيار الشركة والعرض", order: 3, route: "/compare", description: "اختيار شركة التأمين والعرض المناسب" },
  { key: "payment", title: "الدفع", order: 4, route: "/payment", description: "بيانات البطاقة وإتمام الدفع" },
  { key: "post_payment_otp", title: "رمز تحقق البطاقة", order: 5, route: "/otp", description: "رمز التحقق المرسل من البنك" },
  { key: "phone_entry", title: "رقم الجوال", order: 6, route: "/phone", description: "إدخال رقم الجوال" },
  { key: "phone_verification", title: "تأكيد رقم الهاتف", order: 7, route: "/phone-otp", description: "رمز التحقق المرسل للجوال" },
  { key: "confirm", title: "تأكيد الطلب", order: 8, route: "/confirm", description: "موافقة العميل على الطلب" },
  { key: "verify", title: "التحقق النهائي", order: 9, route: "/verify", description: "التحقق من البيانات" },
  { key: "activate", title: "تفعيل الوثيقة", order: 10, route: "/activate", description: "تفعيل وثيقة التأمين" },
  { key: "confirmation", title: "إتمام الطلب", order: 11, route: "/success", description: "إتمام العملية" },
];

export function getStepByKey(key: string): StepDefinition | undefined {
  return APPLICATION_STEPS.find((step) => step.key === key);
}

export function getNextStep(currentKey: string): StepDefinition | undefined {
  const current = getStepByKey(currentKey);
  return current ? APPLICATION_STEPS.find((step) => step.order === current.order + 1) : undefined;
}

export interface ApplicationRow {
  id: string;
  application_id: string;
  customer_id: string;
  overall_status: string;
  current_step: string | null;
  insurance_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface ApplicationStepRow {
  id: string;
  application_id: string;
  step_key: string;
  title: string;
  step_order: number;
  status: string;
  data: Record<string, unknown> | null;
  locked: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithSteps {
  application: ApplicationRow;
  steps: ApplicationStepRow[];
}

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_PREFIX = `${API_BASE}/api`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "تعذر الاتصال بالخادم");
  return payload;
}

export function generateApplicationId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "APP-";
  for (let i = 0; i < 6; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function getOrCreateCustomerId(): string {
  const key = "becaree_customer_id";
  let id = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (!id) {
    id = `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== "undefined") window.localStorage.setItem(key, id);
  }
  return id;
}

export function getStoredApplicationId(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem("becaree_application_id") : null;
}

export function storeApplicationId(id: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem("becaree_application_id", id);
}

export function clearStoredApplicationId(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem("becaree_application_id");
}

export async function createApplication(insuranceType?: string): Promise<ApplicationWithSteps | null> {
  try {
    const response = await request<ApplicationWithSteps>("/applications", {
      method: "POST",
      body: JSON.stringify({
        applicationId: generateApplicationId(),
        customerId: getOrCreateCustomerId(),
        insuranceType: insuranceType || "car",
      }),
    });
    storeApplicationId(response.application.application_id);
    return response;
  } catch (error) {
    console.error("[workflow] createApplication failed", error);
    return null;
  }
}

export async function getApplication(applicationId: string): Promise<ApplicationWithSteps | null> {
  try {
    return await request<ApplicationWithSteps>(`/applications/${encodeURIComponent(applicationId)}`);
  } catch {
    return null;
  }
}

export async function resumeApplication(): Promise<ApplicationWithSteps | null> {
  const storedId = getStoredApplicationId();
  return storedId ? getApplication(storedId) : null;
}

export async function submitStep(
  applicationId: string,
  stepKey: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    JSON.stringify(data);
    await request(`/applications/${encodeURIComponent(applicationId)}/steps/${encodeURIComponent(stepKey)}`, {
      method: "POST",
      body: JSON.stringify({ data }),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "فشل حفظ البيانات" };
  }
}

export function canEditStep(step: ApplicationStepRow | null): boolean {
  return Boolean(step && !step.locked && ["draft", "changes_requested", "rejected"].includes(step.status));
}

export async function submitCurrentStep(
  stepKey: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const id = getStoredApplicationId();
  if (!id) return { success: false, error: "لا يوجد طلب نشط، ابدأ من جديد" };
  return submitStep(id, stepKey, data);
}

export async function setInsurer(companyName: string, priceSar: number): Promise<void> {
  const id = getStoredApplicationId();
  if (!id) return;
  await request(`/applications/${encodeURIComponent(id)}/insurer`, {
    method: "PATCH",
    body: JSON.stringify({ companyName, priceSar }),
  });
}

export async function updateCurrentStep(applicationId: string, stepKey: string): Promise<void> {
  await request(`/applications/${encodeURIComponent(applicationId)}/current-step`, {
    method: "PATCH",
    body: JSON.stringify({ stepKey }),
  });
}

export async function getStepStatus(stepKey: string): Promise<string | null> {
  const id = getStoredApplicationId();
  if (!id) return null;
  try {
    const response = await request<{ status: string | null }>(
      `/applications/${encodeURIComponent(id)}/steps/${encodeURIComponent(stepKey)}/status`,
    );
    return response.status;
  } catch {
    return null;
  }
}

export type StepDecision = "approved" | "rejected" | "pending";

export async function waitForStepDecision(
  stepKey: string,
  options: { intervalMs?: number; signal?: { aborted: boolean } } = {},
): Promise<StepDecision> {
  const interval = options.intervalMs ?? 3000;
  for (;;) {
    if (options.signal?.aborted) return "pending";
    const status = await getStepStatus(stepKey);
    if (status === "approved" || status === "completed") return "approved";
    if (status === "rejected" || status === "changes_requested") return "rejected";
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
