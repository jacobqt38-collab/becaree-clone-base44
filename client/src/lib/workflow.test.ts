import { afterEach, describe, expect, it, vi } from "vitest";

function createStorage() {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("workflow request resilience", () => {
  it("returns a recoverable failure when the Worker request times out", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");

    const storage = createStorage();
    storage.setItem("becaree_application_id", "APP-TIMEOUT");
    vi.stubGlobal("window", {
      localStorage: storage,
      setTimeout,
      clearTimeout,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((_: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const { submitCurrentStep } = await import("./workflow");
    const resultPromise = submitCurrentStep("insurance_quote", { estimatedValue: "50000" });

    await vi.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Aborted");
  });
});
