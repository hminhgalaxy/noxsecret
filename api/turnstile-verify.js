
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ALLOWED_ACTIONS = new Set(["login", "register", "forgot-password"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") return res.status(405).json({ success:false, message:"Phương thức không được hỗ trợ." });
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return res.status(503).json({ success:false, message:"Website chưa hoàn tất cấu hình xác minh. Vui lòng thử lại sau." });
  const body = req.body || {};
  const token = typeof body.token === "string" ? body.token : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!token || token.length > 2048 || !ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ success:false, message:"Thông tin xác minh không hợp lệ." });
  }
  try {
    const params = new URLSearchParams({ secret, response:token });
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    if (ip) params.set("remoteip", ip);
    const response = await fetch(SITEVERIFY, {
      method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:params, signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error("Siteverify unavailable");
    const result = await response.json();
    const allowedHosts = String(process.env.TURNSTILE_HOSTNAMES || "").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
    if (!allowedHosts.length) return res.status(503).json({ success:false, message:"Website chưa cấu hình tên miền xác minh." });
    const hostOk = allowedHosts.includes(String(result.hostname || "").toLowerCase());
    const ok = result.success === true && result.action === action && hostOk;
    if (!ok) return res.status(403).json({ success:false, message:"Xác minh thất bại hoặc đã hết hạn. Vui lòng thử lại." });
    return res.status(200).json({ success:true });
  } catch (_) {
    return res.status(503).json({ success:false, message:"Không thể kết nối dịch vụ xác minh. Vui lòng thử lại." });
  }
};
