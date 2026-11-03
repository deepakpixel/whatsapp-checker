/**
 * WhatsApp Link Validator Core
 */

export function canonicalWhatsAppLink(url = "") {
  const m = String(url).match(/https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9_-]{15,})/i);
  return m ? `https://chat.whatsapp.com/${m[1]}` : "";
}

export function decodeHtml(s = "") {
  return String(s)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\\//g, "/");
}

export function stripTags(s = "") {
  return decodeHtml(
    String(s)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

const BAD_MARKERS = [
  "this invite link is no longer valid",
  "invite link is no longer valid",
  "this link is no longer valid",
  "invalid invite link",
  "invite link is invalid",
  "couldn't load group info",
  "could not load group info",
  "unable to load group info",
  "group is no longer available",
  "community is no longer available",
  "link has been reset",
  "this link has been revoked",
  "link has been revoked",
];

export async function checkWhatsApp(url, timeoutMs = 10000) {
  const canonical = canonicalWhatsAppLink(url);
  if (!canonical) {
    return {
      url,
      canonical: "",
      status: "INVALID",
      groupName: "",
      details: "Invalid WhatsApp invite URL format",
      httpStatus: 400,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(canonical, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
      },
    });

    const code = res.status;
    const html = await res.text();

    if (code === 404 || code === 410) {
      return {
        url,
        canonical,
        status: "INVALID",
        groupName: "",
        details: `Invite page returned HTTP ${code}`,
        httpStatus: code,
      };
    }

    if (code === 429 || code === 403) {
      return {
        url,
        canonical,
        status: "UNKNOWN",
        groupName: "",
        details: `WhatsApp rate-limited or blocked request (HTTP ${code})`,
        httpStatus: code,
      };
    }

    // Check title tags
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch ? stripTags(titleMatch[1]) : "";

    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
    const ogTitle = ogTitleMatch ? decodeHtml(ogTitleMatch[1]).trim() : "";

    const text = stripTags(html);
    const lower = text.toLowerCase();

    // 1. Check known failure markers
    const foundBadMarker = BAD_MARKERS.find((m) => lower.includes(m));
    if (foundBadMarker) {
      return {
        url,
        canonical,
        status: "INVALID",
        groupName: "",
        details: foundBadMarker,
        httpStatus: code,
      };
    }

    // 2. Extract group name if present
    let groupName = "";
    if (
      ogTitle &&
      !/^(whatsapp group invite|whatsapp invite|whatsapp community invite)$/i.test(ogTitle)
    ) {
      groupName = ogTitle;
    }

    // 3. Check for successful invite page
    const hasInviteMarker =
      lower.includes("group chat invite") ||
      lower.includes("community invite") ||
      lower.includes("chat invite");
    const hasOpenApp = lower.includes("open app");
    const hasWebOption = lower.includes("continue to whatsapp web") || lower.includes("whatsapp web");

    if (code >= 200 && code < 400 && groupName) {
      return {
        url,
        canonical,
        status: "VALID",
        groupName,
        details: "Active WhatsApp group invite",
        httpStatus: code,
      };
    }

    if (code >= 200 && code < 400 && (hasInviteMarker || hasOpenApp || hasWebOption) && !groupName) {
      return {
        url,
        canonical,
        status: "INVALID",
        groupName: "",
        details: "Invite page loaded without a group/community name (link revoked or expired)",
        httpStatus: code,
      };
    }

    return {
      url,
      canonical,
      status: "UNKNOWN",
      groupName: "",
      details: "Could not conclusively verify invite page",
      httpStatus: code,
    };
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    return {
      url,
      canonical,
      status: "UNKNOWN",
      groupName: "",
      details: isTimeout ? "Request timed out" : (err?.message || "Fetch failed"),
      httpStatus: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function checkBatchUrls(urls = [], concurrency = 15) {
  const rawList = Array.isArray(urls) ? urls : [urls];
  const list = rawList.map((u) => String(u || "").trim()).filter(Boolean);

  if (!list.length) {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      summary: { total: 0, valid: 0, invalid: 0, unknown: 0 },
      results: [],
    };
  }

  // Deduplicate URLs for checking
  const uniqueUrls = [...new Set(list)];
  const checkedMap = new Map();

  await mapLimit(uniqueUrls, concurrency, async (url) => {
    const res = await checkWhatsApp(url);
    checkedMap.set(url, res);
  });

  // Map results back in the original requested order
  const results = list.map((u) => checkedMap.get(u) || {
    url: u,
    status: "UNKNOWN",
    groupName: "",
    details: "Not checked",
  });

  const valid = results.filter((r) => r.status === "VALID").length;
  const invalid = results.filter((r) => r.status === "INVALID").length;
  const unknown = results.filter((r) => r.status === "UNKNOWN").length;

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      valid,
      invalid,
      unknown,
    },
    results,
  };
}
