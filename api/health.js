export default function handler(req, res) {
  const hasSecret = Boolean(
    process.env.CHECKER_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.MONITOR_KEY ||
    process.env.WA_MONITOR_KEY
  );

  return res.status(200).json({
    ok: true,
    service: "whatsapp-checker",
    authConfigured: hasSecret,
    timestamp: new Date().toISOString(),
  });
}
