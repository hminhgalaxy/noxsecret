/* Một điểm vào duy nhất cho thư HTML, xác minh 2 bước, email khôi phục, đổi email, cấm/mute/cấp quyền và thư mẫu của DEV.
   POST /api/account  { action, ...tham số }  (đăng nhập: header Authorization: Bearer <Firebase ID token>)
   Biến môi trường (Vercel → Settings → Environment Variables): xem HUONG-DAN.md
     BREVO_API_KEY, MAIL_FROM_EMAIL, [MAIL_FROM_NAME], [MAIL_REPLY_TO], FIREBASE_SERVICE_ACCOUNT, [FIREBASE_DATABASE_URL], [SITE_URL], [CODE_SALT] */
const { getApi } = require("./_lib/runtime");

function sameOrigin(req) {
  const o = req.headers.origin; if (!o) return true;
  try { const h = new URL(o).host; const site = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : "skibidiscript.vercel.app"; return h === req.headers.host || h === site || /^localhost(:\d+)?$/.test(h); } catch (_) { return false; }
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false, code: "method" }); }
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, code: "origin" });
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = null; } }
  if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ ok: false, code: "bad_request" });
  const h = String(req.headers.authorization || ""), token = /^Bearer /i.test(h) ? h.slice(7).trim() : "";
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const dec = v => { try { return decodeURIComponent(String(v || "")).slice(0, 60); } catch (_) { return ""; } };
  const geo = { country: dec(req.headers["x-vercel-ip-country"]).slice(0, 2).toUpperCase(), city: dec(req.headers["x-vercel-ip-city"]) };
  let out;
  try { out = await getApi()({ action: body.action, body, token, ip, geo }); }
  catch (e) { console.error("account init", e && e.message); out = { status: 501, body: { ok: false, code: "not_configured", message: "The email service isn't set up yet." } }; }
  return res.status(out.status).json(out.body);
};
