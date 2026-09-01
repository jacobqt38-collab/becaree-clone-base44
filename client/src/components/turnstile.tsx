import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    __onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Cloudflare's documented always-passes test key. Replace via VITE_TURNSTILE_SITE_KEY for production.
const TEST_KEY = "1x00000000000000000000AA";

let loadingPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export function Turnstile({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = (import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined) || TEST_KEY;

  useEffect(() => {
    let cancelled = false;
    void loadScript().then(() => {
      const tryRender = () => {
        if (cancelled || !ref.current || !window.turnstile) return;
        if (widgetId.current) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onExpire?.(),
          theme: "light",
          language: "ar",
        });
      };
      if (window.turnstile) tryRender();
      else setTimeout(tryRender, 200);
    });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
        widgetId.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire]);

  return <div ref={ref} className="cf-turnstile" />;
}
