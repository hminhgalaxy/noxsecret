/* Phiên đăng nhập dùng chung. Một listener onAuthStateChanged duy nhất cho mọi trang. */
import { auth, db, TS, GoogleProvider } from "./firebase.js";
import { DEV_EMAIL, GOOGLE_CLIENT_ID, USERS_NODE } from "./config.js";
import { dlog } from "./log.js";
import { authMessage, GENERIC } from "./messages.js";

const subs = new Set();
export const session = { user: null, ready: false, isDev: false, devBlocked: "" };
let readyResolve; export const ready = new Promise(r => { readyResolve = r; });

export function computeDev(u) {
  if (!u) return { dev: false, why: "" };
  const mail = String(u.email || "").toLowerCase();
  if (mail !== DEV_EMAIL.toLowerCase()) return { dev: false, why: "" };
  if (!u.emailVerified) return { dev: false, why: "Hãy xác minh email của tài khoản quản trị để dùng đầy đủ quyền." };
  return { dev: true, why: "" };
}
function apply(u) {
  session.user = u || null;
  const r = computeDev(u); session.isDev = r.dev; session.devBlocked = r.why;
  if (!session.ready) { session.ready = true; readyResolve(); }
  subs.forEach(f => { try { f(session); } catch (e) { console.error(e); } });
}
export const onAuth = fn => { subs.add(fn); return () => subs.delete(fn); };

if (auth) {
  auth.onAuthStateChanged(u => {
    dlog(u ? "ok" : "in", u ? "Auth: " + u.email : "Auth: chưa đăng nhập.");
    apply(u); if (u) touchProfile(u);
  }, e => { dlog("er", "Auth: " + (e.code || e.message)); apply(null); });
  setTimeout(() => { if (!session.ready) apply(null); }, 8000); // không treo vô hạn nếu SDK lỗi
} else apply(null);

/* Ghi hồ sơ (best-effort) để /dev/users có dữ liệu thật. Rules chỉ cho ghi đúng node của chính mình. */
async function touchProfile(u) {
  if (!db) return;
  try {
    const ref = db.ref(USERS_NODE + "/" + u.uid), snap = await ref.child("createdAt").once("value");
    const p = { email: u.email || "", name: u.displayName || "", photo: u.photoURL || "", provider: (u.providerData[0] && u.providerData[0].providerId) || "", lastLogin: TS() };
    if (!snap.exists()) p.createdAt = TS();
    await ref.update(p);
  } catch (e) { dlog("er", "Hồ sơ người dùng: " + (e.code || e.message)); }
}

export const authErrMsg = authMessage;
const need = () => { if (!auth) throw Object.assign(new Error("Không kết nối được tới hệ thống đăng nhập. Vui lòng tải lại trang."), { code: "app/no-sdk" }); return auth; };
export const signInEmail = (e, p) => need().signInWithEmailAndPassword(e, p);
export async function signUpEmail(e, p, name) {
  const cred = await need().createUserWithEmailAndPassword(e, p);
  if (name) { try { await cred.user.updateProfile({ displayName: name }); } catch (_) {} }
  try { await cred.user.sendEmailVerification(); } catch (_) {}
  apply(need().currentUser || cred.user); touchProfile(need().currentUser || cred.user);
  return cred;
}
export const resetPassword = e => need().sendPasswordResetEmail(e);
export const signOut = () => need().signOut();
export async function resendVerification() { const u = need().currentUser; if (!u) throw new Error("Bạn chưa đăng nhập."); return u.sendEmailVerification(); }
/* Đổi tên hiển thị và làm mới phiên để mọi nơi trên web cập nhật ngay */
export async function updateDisplayName(name) {
  const u = need().currentUser; if (!u) throw new Error("Bạn chưa đăng nhập.");
  await u.updateProfile({ displayName: name });
  const cur = need().currentUser || u; apply(cur); await touchProfile(cur);
}
export const providerLabel = u => { const id = (u && u.providerData && u.providerData[0] && u.providerData[0].providerId) || ""; return id === "google.com" ? "Google" : "Email và mật khẩu"; };
export const canChangePassword = u => !!(u && (u.providerData || []).some(p => p.providerId === "password"));

/* Google Identity Services — nạp lười, chỉ ở trang cần dùng */
let gisPromise = null;
function loadGis() {
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = res; s.onerror = () => { gisPromise = null; rej(new Error("Không tải được đăng nhập Google.")); };
    document.head.appendChild(s);
  });
  return gisPromise;
}
export async function renderGoogleButton(container, { onDone, onError, guard } = {}) {
  try {
    await loadGis();
    const g = window.google.accounts.id;
    g.initialize({
      client_id: GOOGLE_CLIENT_ID, auto_select: false, cancel_on_tap_outside: true,
      callback: async resp => {
        try {
          if (!resp || !resp.credential) throw new Error("Không nhận được thông tin từ Google. Vui lòng thử lại.");
          if (guard && !(await guard())) return;
          const cred = GoogleProvider().credential(resp.credential);
          await need().signInWithCredential(cred);
          dlog("ok", "Google → Firebase Auth thành công."); onDone && onDone();
        } catch (e) { dlog("er", "Google: " + (e.code || e.message)); onError && onError(authErrMsg(e)); }
      }
    });
    const w = Math.min(400, Math.max(200, Math.round(container.clientWidth || 280)));
    g.renderButton(container, { theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "left", width: w });
  } catch (e) {
    dlog("er", "GIS: " + e.message); onError && onError("Không tải được đăng nhập Google. Hãy kiểm tra mạng rồi tải lại trang.");
  }
}
