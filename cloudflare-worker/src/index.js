// Cloudflare Worker edge front door — fresh infra.
// Proxies HTTP + WebSocket upgrades to the Railway backend (env.ORIGIN).
// No hard-coded URLs; all config via wrangler vars.

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export default {
  async fetch(request, env) {
    const originStr = env.ORIGIN || "";
    if (!originStr) {
      return new Response(
        JSON.stringify({ ok: false, error: "ORIGIN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...NO_CACHE } },
      );
    }

    const origin = new URL(originStr);
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.set("Host", origin.host);
    headers.set("X-Forwarded-Host", incoming.host);
    headers.set("X-Forwarded-Proto", incoming.protocol.replace(":", ""));
    headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "");

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    // No caching for /api/* or /socket.io/*
    const isApiOrSocket =
      incoming.pathname.startsWith("/api/") ||
      incoming.pathname.startsWith("/socket.io/");

    const output = new Response(response.body, response);
    if (isApiOrSocket) {
      for (const [k, v] of Object.entries(NO_CACHE)) output.headers.set(k, v);
    }
    return output;
  },
};
