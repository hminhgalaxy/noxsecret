/* Nhận thông báo "có tiền vào tài khoản" từ SePay / Casso và cộng tiền vào ví người dùng.
   POST /api/bank-webhook — xác thực bằng khoá bí mật (biến môi trường SEPAY_API_KEY / SEPAY_SECRET / CASSO_SECURE_TOKEN),
   KHÔNG xác thực được thì từ chối. Mọi thông báo đều được chống cộng trùng theo mã giao dịch của nhà cung cấp.
   Cần đọc nguyên văn thân yêu cầu (để kiểm tra chữ ký HMAC) nên tắt bodyParser. */
const { getApi } = require("./_lib/runtime");

function readRaw(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === "string") return resolve(req.body);
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return resolve(JSON.stringify(req.body));
    const chunks = []; let n = 0;
    req.on("data", (c) => { n += c.length; if (n > 200000) { reject(new Error("too big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ success: false }); }
  try {
    const raw = await readRaw(req);
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const out = await getApi().webhook({ headers: req.headers, raw, ip });
    return res.status(out.status).json(out.body);
  } catch (e) {
    console.error("bank-webhook", e && e.message);
    return res.status(500).json({ success: false }); /* 500 → nhà cung cấp tự gửi lại sau */
  }
};
module.exports.config = { api: { bodyParser: false } };
