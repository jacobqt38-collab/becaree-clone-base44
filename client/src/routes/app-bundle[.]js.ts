import { createFileRoute } from "@tanstack/react-router";
import bundleRaw from "../../public/assets/index-BORbUPXS.js?raw";

// The original gosuksa.com bundle has the old API base compiled in as a
// fallback. We serve it through this route so the backend URL comes from
// configuration (VITE_BACKEND_WS_URL) instead of being hard-coded.
const ORIGINAL_API_BASE = "https://doctamworkerme.mysemitgo.workers.dev";
const ORIGINAL_RECAPTCHA_KEY = "6LdBVyAtAAAAAGd0sLVB5wM2g-nFnvDCrZJyKGzE";
const ORIGINAL_TURNSTILE_KEY = "0x4AAAAAADBVJXDKno5ekmDP";
const DEFAULT_API_BASE = "https://gosuksa-edge.bcare.workers.dev";
// reCAPTCHA v3 site keys are publishable (domain-restricted in the console).
const DEFAULT_RECAPTCHA_KEY = "6Lc_s6ctAAAAAAP7In69-LKpeGGUGFQ8UCyfW0kd";

export const Route = createFileRoute("/app-bundle.js")({
  server: {
    handlers: {
      GET: () => {
        const apiBase = (
          process.env["VITE_BACKEND_WS_URL"] || DEFAULT_API_BASE
        ).replace(/\/+$/, "");
        const recaptchaKey = (
          process.env["VITE_RECAPTCHA_SITE_KEY"] || DEFAULT_RECAPTCHA_KEY
        ).trim();
        const turnstileKey = (
          process.env["VITE_TURNSTILE_SITE_KEY"] || ORIGINAL_TURNSTILE_KEY
        ).trim();
        const body = bundleRaw
          .split(ORIGINAL_API_BASE).join("/api-proxy")
          .split(apiBase).join("/api-proxy")
          // REST goes through the same-origin proxy, but Socket.IO must talk to
          // the backend directly (WebSocket upgrades can't go through the proxy
          // route), so point the socket base at the configured backend URL.
          .split("rz = `${Hl}/`").join(`rz = ${JSON.stringify(apiBase + "/")}`)
          // Google reCAPTCHA v3 site key (configurable, falls back to the
          // original gosuksa.com key compiled into the bundle).
          .split(JSON.stringify(ORIGINAL_RECAPTCHA_KEY))
          .join(JSON.stringify(recaptchaKey))
          // Cloudflare Turnstile site key (same idea).
          .split(JSON.stringify(ORIGINAL_TURNSTILE_KEY))
          .join(JSON.stringify(turnstileKey))
          // The mobile-only gate now starts AFTER the homepage: desktop
          // visitors see the homepage, and the shell script sends them to the
          // lead form when they try to continue.
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
