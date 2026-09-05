import { createFileRoute } from "@tanstack/react-router";
import shellHtml from "../spa-shell.html?raw";
import { isBotRequest, botBlockedResponse } from "@/lib/bot-guard";

// Client-side routes of the original SPA (/details, /pay, /invoice, ...) must
// all resolve to the same shell so deep links and refreshes keep working.
export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (isBotRequest(request)) return botBlockedResponse();
        return new Response(shellHtml, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        });
      },
    },
  },
});
