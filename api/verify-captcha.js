/* Xác minh token Cloudflare Turnstile ở phía máy chủ (Vercel Serverless Function).
   Cần đặt biến môi trường TURNSTILE_SECRET_KEY trong Vercel → Settings → Environment Variables.
   Chưa đặt thì trả về configured:false và website chỉ dùng kiểm tra phía trình duyệt. */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false }); }
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return res.status(200).json({ ok: true, configured: false });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = null; } }
  const token = body && body.token;
  if (typeof token !== "string" || !token || token.length > 2048) return res.status(400).json({ ok: false, configured: true });
  try {
    const form = new URLSearchParams({ secret, response: token });
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(); if (ip) form.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const j = await r.json();
    return res.status(j && j.success ? 200 : 403).json({ ok: !!(j && j.success), configured: true });
  } catch (_) { return res.status(502).json({ ok: false, configured: true }); }
};
