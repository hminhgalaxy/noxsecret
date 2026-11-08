/* Nối lõi với dịch vụ thật: Firebase Admin (đọc từ biến môi trường) + Brevo (gửi thư).
   Thiếu biến nào thì phần đó "chưa cấu hình" và website tự dùng thư mặc định của Firebase. */
let cached = null;

function loadServiceAccount(env) {
  let raw = env.FIREBASE_SERVICE_ACCOUNT; if (!raw) return null;
  raw = String(raw).trim();
  try { if (!raw.startsWith("{")) raw = Buffer.from(raw, "base64").toString("utf8"); const j = JSON.parse(raw); if (j.private_key) j.private_key = String(j.private_key).replace(/\\n/g, "\n"); return j.client_email && j.private_key ? j : null; } catch (_) { return null; }
}
function makeAdmin(env) {
  const sa = loadServiceAccount(env); if (!sa) return {};
  const admin = require("firebase-admin");
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: env.FIREBASE_DATABASE_URL || "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app" });
  const a = admin.auth(), d = admin.database();
  const auth = { verifyIdToken: t => a.verifyIdToken(t, true), getUser: u => a.getUser(u), getUserByEmail: e => a.getUserByEmail(e), setCustomUserClaims: (u, c) => a.setCustomUserClaims(u, c), updateUser: (u, p) => a.updateUser(u, p), revokeRefreshTokens: u => a.revokeRefreshTokens(u), generateEmailVerificationLink: e => a.generateEmailVerificationLink(e), generatePasswordResetLink: e => a.generatePasswordResetLink(e), generateVerifyAndChangeEmailLink: (e, n) => a.generateVerifyAndChangeEmailLink(e, n) };
  const db = { get: async p => (await d.ref(p).get()).val(), set: (p, v) => d.ref(p).set(v), update: (p, o) => d.ref(p).update(o), remove: p => d.ref(p).remove() };
  return { auth, db };
}
function makeMailer(env) {
  const key = env.BREVO_API_KEY, from = env.MAIL_FROM_EMAIL; if (!key || !from) return null;
  const name = env.MAIL_FROM_NAME || "SkibidiScript";
  return async function sendMail({ to, subject, html, text }) {
    const body = { sender: { name, email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: text };
    if (env.MAIL_REPLY_TO) body.replyTo = { email: env.MAIL_REPLY_TO, name };
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": key, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { let m = ""; try { m = (await r.text()).slice(0, 300); } catch (_) {} const e = new Error("mail " + r.status + " " + m); e.code = "mail_failed"; throw e; }
  };
}
function makeVerifyPassword(env) {
  const key = env.FIREBASE_API_KEY || "AIzaSyDNGa1YNLJk1n5C_cxCqsGlx7_hP7DjetA"; /* khoá web công khai (cùng khoá trong config.js) */
  return async (email, password) => {
    const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + encodeURIComponent(key), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: false }) });
    return r.ok;
  };
}
let initError = null;
function getApi(env = process.env) {
  if (cached) return cached;
  const { createApi } = require("./core");
  let admin = {}; try { admin = makeAdmin(env); initError = null; } catch (e) { initError = String((e && e.message) || e).slice(0, 200); console.error("firebase-admin init:", initError); throw e; }
  cached = createApi({ auth: admin.auth, db: admin.db, sendMail: makeMailer(env), verifyPassword: makeVerifyPassword(env), env, diagnose: () => diagnose(env), liveCheck: () => liveCheck(env) });
  return cached;
}
/* Chẩn đoán KHÔNG gọi mạng và KHÔNG lộ giá trị bí mật: chỉ nói biến nào thiếu/sai. */
const WANT = ["BREVO_API_KEY", "MAIL_FROM_EMAIL", "FIREBASE_SERVICE_ACCOUNT"];
function diagnose(env = process.env) {
  const p = [], add = (code, msg) => p.push({ code, msg });
  for (const w of WANT) {
    if (env[w] && String(env[w]).trim()) continue;
    const near = Object.keys(env).find(k => k !== w && k.trim().toUpperCase().replace(/[\s-]+/g, "_") === w);
    add(near ? "typo:" + w : "missing:" + w, near ? "Biến môi trường đang tên \"" + near + "\" nhưng phải đúng là " + w + " (không khoảng trắng, viết hoa)." : "Thiếu biến môi trường " + w + " trên Vercel (hoặc chưa Redeploy sau khi thêm).");
  }
  const from = String(env.MAIL_FROM_EMAIL || "").trim();
  if (from && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)) add("bad:MAIL_FROM_EMAIL", "MAIL_FROM_EMAIL phải là MỘT địa chỉ email thuần (vd: ten@gmail.com), không kèm tên hay dấu < >.");
  const key = String(env.BREVO_API_KEY || "").trim();
  if (key && !/^xkeysib-/.test(key)) add("bad:BREVO_API_KEY", "BREVO_API_KEY thường bắt đầu bằng \"xkeysib-\". Hãy tạo khoá API (không phải khoá SMTP \"xsmtpsib-\") ở Brevo → SMTP & API → API Keys.");
  if (/^xsmtpsib-/.test(key)) p.push({ code: "bad:smtp_key", msg: "Đây là khoá SMTP (xsmtpsib-), website cần khoá API (xkeysib-)." });
  if (env.FIREBASE_SERVICE_ACCOUNT && String(env.FIREBASE_SERVICE_ACCOUNT).trim() && !loadServiceAccount(env)) add("bad:FIREBASE_SERVICE_ACCOUNT", "FIREBASE_SERVICE_ACCOUNT không đọc được: hãy dán NGUYÊN nội dung file JSON (bắt đầu bằng {) hoặc mã base64 của nó, có client_email và private_key.");
  if (initError) add("init", "Khởi tạo Firebase Admin lỗi: " + initError);
  return p;
}
/* Kiểm tra thật với Brevo (chỉ DEV gọi): khoá có đúng không, SMTP đã bật chưa, địa chỉ người gửi đã xác minh chưa. */
async function liveCheck(env = process.env) {
  const out = [], key = String(env.BREVO_API_KEY || "").trim(), from = String(env.MAIL_FROM_EMAIL || "").trim().toLowerCase();
  const get = async path => { const r = await fetch("https://api.brevo.com/v3" + path, { headers: { "api-key": key, accept: "application/json" } }); let j = null; try { j = await r.json(); } catch (_) {} return { status: r.status, j }; };
  try {
    const a = await get("/account");
    if (a.status === 401) { out.push({ ok: false, msg: "Brevo từ chối khoá API (401): khoá sai, đã bị xoá hoặc bạn dán thiếu ký tự." }); return out; }
    if (a.status !== 200) { out.push({ ok: false, msg: "Brevo trả lỗi " + a.status + ": " + String((a.j && a.j.message) || "").slice(0, 160) }); return out; }
    out.push({ ok: true, msg: "Khoá API hợp lệ." });
    const relay = a.j && a.j.relay; if (relay && relay.enabled === false) out.push({ ok: false, msg: "Tài khoản Brevo CHƯA bật gửi thư giao dịch (SMTP). Brevo → SMTP & API → bật / liên hệ hỗ trợ Brevo để kích hoạt. Chưa bật thì Brevo từ chối mọi thư." }); else if (relay) out.push({ ok: true, msg: "Gửi thư giao dịch (SMTP) đã bật." });
    const s = await get("/senders");
    if (s.status === 200) {
      const list = (s.j && s.j.senders) || [], me = list.find(x => String(x.email || "").toLowerCase() === from);
      if (!me) out.push({ ok: false, msg: "Địa chỉ người gửi " + from + " CHƯA có trong Brevo → Senders, Domains & Dedicated IPs → Senders. Hãy thêm và bấm liên kết xác minh Brevo gửi về hộp thư đó." + (list.length ? " Người gửi hiện có: " + list.map(x => x.email + (x.active ? "" : " (chưa kích hoạt)")).join(", ") + "." : "") });
      else if (me.active === false) out.push({ ok: false, msg: "Người gửi " + from + " có trong Brevo nhưng CHƯA kích hoạt: mở hộp thư đó, bấm liên kết xác minh của Brevo." });
      else out.push({ ok: true, msg: "Người gửi " + from + " đã xác minh." });
    } else out.push({ ok: false, msg: "Không đọc được danh sách người gửi (" + s.status + ")." });
  } catch (e) { out.push({ ok: false, msg: "Không gọi được Brevo: " + String((e && e.message) || e).slice(0, 120) }); }
  return out;
}
module.exports = { getApi, loadServiceAccount, makeMailer, diagnose, liveCheck };
