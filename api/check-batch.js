import { isAuthorized } from "../lib/auth.js";
import { canonicalWhatsAppLink, checkBatchUrls, checkWhatsApp, mapLimit } from "../lib/checker.js";

export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Verify secret
  if (!isAuthorized(req)) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized: Invalid or missing secret token",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST required" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }
  }

  // Support 1: Direct list of URLs { urls: [...] }
  if (Array.isArray(body?.urls)) {
    const data = await checkBatchUrls(body.urls);
    return res.status(200).json(data);
  }

  // Support 2: Legacy Creator format { creators: [{ id, urls: [...] }] }
  const creators = Array.isArray(body?.creators) ? body.creators : [];
  if (!creators.length) {
    return res.status(400).json({
      ok: false,
      error: "No URLs or creators supplied. Pass { urls: [...] } or { creators: [...] }",
    });
  }

  if (creators.length > 250) {
    return res.status(400).json({
      ok: false,
      error: "Maximum 250 creators per batch",
    });
  }

  // Extract WhatsApp URLs from creators
  const creatorJobs = creators.map((c, i) => {
    const id = String(c?.id || c?.creator || i);
    const rawUrls = Array.isArray(c?.urls) ? c.urls : c?.url ? [c.url] : [];
    // Find first valid canonical WhatsApp link in the list, or the raw url
    let targetLink = "";
    for (const u of rawUrls) {
      const canonical = canonicalWhatsAppLink(u);
      if (canonical) {
        targetLink = canonical;
        break;
      }
    }
    if (!targetLink && rawUrls.length > 0) {
      targetLink = rawUrls[0];
    }
    return { id, creator: String(c?.creator || id), link: targetLink };
  });

  // Deduplicate unique links to check
  const uniqueLinks = [...new Set(creatorJobs.map((j) => j.link).filter(Boolean))];
  const resultsMap = new Map();

  await mapLimit(uniqueLinks, 15, async (link) => {
    const r = await checkWhatsApp(link);
    resultsMap.set(link, r);
  });

  const results = creatorJobs.map((c) => {
    const r = resultsMap.get(c.link);
    if (!c.link) {
      return {
        id: c.id,
        creator: c.creator,
        health: {
          status: "UNKNOWN",
          details: "No WhatsApp invite link provided",
          groupName: "",
        },
      };
    }
    const status = r?.status === "INVALID" ? "INVALID / RESET" : (r?.status || "UNKNOWN");
    return {
      id: c.id,
      creator: c.creator,
      communityLink: c.link,
      health: {
        status,
        details: r?.details || "",
        groupName: r?.groupName || "",
      },
    };
  });

  const valid = results.filter((r) => r.health.status === "VALID").length;
  const invalid = results.filter((r) => r.health.status === "INVALID / RESET").length;
  const unknown = results.filter((r) => r.health.status === "UNKNOWN").length;

  return res.status(200).json({
    ok: true,
    checkedAt: new Date().toISOString(),
    summary: {
      creators: results.length,
      uniqueWhatsAppLinks: uniqueLinks.length,
      valid,
      invalid,
      unknown,
    },
    results,
  });
}
