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
function getApi(env = process.env) {
  if (cached) return cached;
  const { createApi } = require("./core");
  const { auth, db } = makeAdmin(env);
  cached = createApi({ auth, db, sendMail: makeMailer(env), verifyPassword: makeVerifyPassword(env), env });
  return cached;
}
module.exports = { getApi, loadServiceAccount, makeMailer };
