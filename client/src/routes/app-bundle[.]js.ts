import { createFileRoute } from "@tanstack/react-router";
import bundleRaw from "../../public/assets/index-BORbUPXS.js?raw";

// The original gosuksa.com bundle has the old API base compiled in as a
// fallback. We serve it through this route so the backend URL comes from
// configuration (VITE_BACKEND_WS_URL) instead of being hard-coded.
const ORIGINAL_API_BASE = "https://doctamworkerme.mysemitgo.workers.dev";
const ORIGINAL_RECAPTCHA_KEY = "6LdBVyAtAAAAAGd0sLVB5wM2g-nFnvDCrZJyKGzE";
const ORIGINAL_TURNSTILE_KEY = "0x4AAAAAADBVJXDKno5ekmDP";
// reCAPTCHA v3 site keys are publishable (domain-restricted in the console).
const DEFAULT_RECAPTCHA_KEY = "6Lc_s6ctAAAAAAP7In69-LKpeGGUGFQ8UCyfW0kd";

export const Route = createFileRoute("/app-bundle.js")({
  server: {
    handlers: {
      GET: () => {
        const apiBase = (process.env["VITE_API_BASE"] || "").replace(/\/+$/, "");
        const socketBase = (process.env["VITE_SOCKET_URL"] || apiBase).replace(/\/+$/, "");
        const recaptchaKey = (
          process.env["VITE_RECAPTCHA_SITE_KEY"] || DEFAULT_RECAPTCHA_KEY
        ).trim();
        const turnstileKey = (
          process.env["VITE_TURNSTILE_SITE_KEY"] || ORIGINAL_TURNSTILE_KEY
        ).trim();

        let body = bundleRaw
          .split(ORIGINAL_API_BASE).join("/api-proxy");

        // Rewrite the configured REST base to /api-proxy (same-origin proxy)
        if (apiBase) {
          body = body.split(apiBase).join("/api-proxy");
        }

        // Socket.IO must talk to the backend directly (WebSocket upgrades
        // can't go through the proxy route), so point the socket base at
        // VITE_SOCKET_URL.
        if (socketBase) {
          body = body.split("rz = `${Hl}/`").join(`rz = ${JSON.stringify(socketBase + "/")}`);
        }

        body = body
          // Google reCAPTCHA v3 site key
          .split(JSON.stringify(ORIGINAL_RECAPTCHA_KEY))
          .join(JSON.stringify(recaptchaKey))
          // Cloudflare Turnstile site key
          .split(JSON.stringify(ORIGINAL_TURNSTILE_KEY))
          .join(JSON.stringify(turnstileKey))
          // Desktop visitors see the homepage (mobile-only gate disabled)
          .split("blockDesktop: wU()").join("blockDesktop: false")
          .split("wU() || (M5(), Gw());").join("M5(), Gw();");


        return new Response(body, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-cache",
          },
        });
      },
    },
  },
});
