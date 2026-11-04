const ALLOWED_ACTIONS = new Set(["login", "signup"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Phương thức không được hỗ trợ." });
  }

  // TURNSTILE_SECRET is the canonical name. The KEY alias keeps compatibility
  // with an earlier Vercel setup; neither value is ever sent to the browser.
  const secret = process.env.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET_KEY;
  const expectedHostnames = new Set(
    String(process.env.TURNSTILE_HOSTNAMES || "")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  );

  if (!secret || expectedHostnames.size === 0) {
    return res.status(503).json({
      success: false,
      error: "Xác minh bảo mật chưa được cấu hình đầy đủ."
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const token = body.token;
  const action = body.action;

  if (typeof token !== "string" || token.length === 0 || token.length > 2048 ||
      typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ success: false, error: "Yêu cầu xác minh không hợp lệ." });
  }

  try {
    const form = new URLSearchParams({
      secret,
      response: token
    });

    const forwarded = req.headers["x-forwarded-for"];
    const cfConnectingIp = req.headers["cf-connecting-ip"];
    const remoteIp = cfConnectingIp || (forwarded && String(forwarded).split(",")[0].trim());
    if (remoteIp) form.set("remoteip", String(remoteIp));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let cloudflareResponse;
    try {
      cloudflareResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!cloudflareResponse.ok) {
      return res.status(502).json({ success: false, error: "Dịch vụ xác minh đang bận. Hãy thử lại." });
    }

    const result = await cloudflareResponse.json();
    const hostname = typeof result.hostname === "string"
      ? result.hostname.toLowerCase()
      : "";

    if (
      result.success !== true ||
      result.action !== action ||
      !expectedHostnames.has(hostname)
    ) {
      return res.status(403).json({
        success: false,
        error: "Xác minh không hợp lệ hoặc không đúng tên miền. Vui lòng thử lại."
      });
    }

    return res.status(200).json({ success: true });
  } catch (_) {
    return res.status(502).json({
      success: false,
      error: "Không kết nối được dịch vụ xác minh. Vui lòng thử lại."
    });
  }
}
