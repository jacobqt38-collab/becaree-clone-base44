const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TRACK_URL = `${API_BASE}/api/track`;
const GATE_URL = `${API_BASE}/api/gate`;

export function getSessionId(): string {
  let id = sessionStorage.getItem("bc_session_id");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("bc_session_id", id);
  }
  return id;
}

export function track(event: string, data: Record<string, unknown> = {}): void {
  // The Worker allowlists analytics fields; raw payment details never enter telemetry.
  fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), event, page: window.location.pathname, ...data }),
  }).catch(() => {});
}

export type GateDecision = "approved" | "rejected" | "pending";

export async function requestGate(page: string): Promise<GateDecision> {
  try {
    const res = await fetch(GATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), page }),
    });
    if (!res.ok) return "pending";
    const data = (await res.json()) as { decision?: string };
    return data.decision === "approved" || data.decision === "rejected" ? data.decision : "pending";
  } catch {
    return "pending";
  }
}

export async function waitForGate(
  page: string,
  { intervalMs = 3000, signal }: { intervalMs?: number; signal?: { aborted: boolean } } = {},
): Promise<GateDecision> {
  for (;;) {
    if (signal?.aborted) return "pending";
    const decision = await requestGate(page);
    if (decision !== "pending") return decision;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
