import { isAuthorized } from "../lib/auth.js";
import { checkBatchUrls, checkWhatsApp } from "../lib/checker.js";

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

  // Handle GET single URL
  if (req.method === "GET") {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({
        ok: false,
        error: "Missing required query parameter: url",
      });
    }

    const result = await checkWhatsApp(url);
    return res.status(200).json({
      ok: true,
      ...result,
    });
  }

  // Handle POST
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON body" });
      }
    }

    // Case 1: Array of URLs or { urls: [...] }
    const urlList = Array.isArray(body)
      ? body
      : Array.isArray(body?.urls)
      ? body.urls
      : null;

    if (urlList) {
      if (urlList.length > 250) {
        return res.status(400).json({
          ok: false,
          error: "Maximum 250 URLs per request",
        });
      }
      const data = await checkBatchUrls(urlList);
      return res.status(200).json(data);
    }

    // Case 2: Single URL in POST body { url: "..." }
    if (body?.url) {
      const result = await checkWhatsApp(body.url);
      return res.status(200).json({
        ok: true,
        ...result,
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Provide either { urls: [...] } or { url: '...' } in request body",
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed. Use GET or POST." });
}
