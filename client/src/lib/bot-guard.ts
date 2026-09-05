// Blocks known crawlers/bots server-side (defence in depth on top of robots.txt
// + noindex meta). Aimed especially at Google Ads / AdsBot traffic that can burn
// campaign budget when triggered maliciously.
const BOT_PATTERNS = [
  // Google
  "googlebot",
  "adsbot-google",
  "mediapartners-google",
  "apis-google",
  "storebot-google",
  "google-extended",
  "google-inspectiontool",
  "feedfetcher-google",
  "google favicon",
  "googleweblight",
  "googleother",
  // Other major search engines
  "bingbot",
  "adidxbot",
  "bingpreview",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandex",
  "sogou",
  "exabot",
  "seznambot",
  "petalbot",
  "applebot",
  // Social / preview
  "facebookexternalhit",
  "facebookcatalog",
  "meta-externalagent",
  "twitterbot",
  "linkedinbot",
  "pinterest",
  "slackbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "embedly",
  "quora link preview",
  // SEO / scraping / AI crawlers
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "dotbot",
  "rogerbot",
  "screaming frog",
  "blexbot",
  "serpstatbot",
  "dataforseo",
  "megaindex",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "ccbot",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "bytespider",
  "amazonbot",
  "diffbot",
  // Generic tooling / headless
  "headlesschrome",
  "phantomjs",
  "puppeteer",
  "playwright",
  "python-requests",
  "scrapy",
  "httpclient",
  "okhttp",
  "libwww-perl",
  "java/",
  "go-http-client",
  "curl/",
  "wget",
  "axios/",
  "node-fetch",
  "crawler",
  "spider",
  "bot/",
  "bot;",
  "bot)",
  "-bot",
  "_bot",
];

export function isBotRequest(request: Request): boolean {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true; // no UA at all is almost always automated
  return BOT_PATTERNS.some((p) => ua.includes(p));
}

export function botBlockedResponse(): Response {
  return new Response("Forbidden", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
      "cache-control": "no-store",
    },
  });
}
