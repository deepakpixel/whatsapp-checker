/**
 * Secret Authentication Helper
 */

export function isAuthorized(req) {
  const expectedSecret =
    process.env.CHECKER_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.MONITOR_KEY ||
    process.env.WA_MONITOR_KEY;

  // If no secret configured in environment, allow requests (unprotected mode)
  if (!expectedSecret) {
    return true;
  }

  // Check headers
  const headerKey =
    req.headers["x-monitor-key"] ||
    req.headers["x-checker-secret"];
  if (headerKey && String(headerKey).trim() === expectedSecret) {
    return true;
  }

  // Check Bearer authorization header
  const authHeader = req.headers["authorization"] || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === expectedSecret) {
      return true;
    }
  }

  // Check query parameters
  const queryKey = req.query?.key || req.query?.secret;
  if (queryKey && String(queryKey).trim() === expectedSecret) {
    return true;
  }

  return false;
}
