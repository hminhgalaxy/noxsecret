/* Phiên đăng nhập dùng chung. Một listener onAuthStateChanged duy nhất cho mọi trang. */
import { auth, db, TS, GoogleProvider } from "./firebase.js";
import { DEV_EMAIL, GOOGLE_CLIENT_ID, USERS_NODE } from "./config.js";
import { dlog } from "./log.js";

const subs = new Set();
export const session = { user: null, ready: false, isDev: false, devBlocked: "" };
let readyResolve; export const ready = new Promise(r => { readyResolve = r; });

export function computeDev(u) {
  if (!u) return { dev: false, why: "" };
  const mail = String(u.email || "").toLowerCase();
  if (mail !== DEV_EMAIL.toLowerCase()) return { dev: false, why: "" };
  if (!u.emailVerified) return { dev: false, why: "Email DEV chưa được xác minh. Hãy đăng nhập bằng Google hoặc xác minh email." };
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

const MSG = {
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.", "auth/wrong-password": "Email hoặc mật khẩu không đúng.",
  "auth/user-not-found": "Tài khoản không tồn tại.", "auth/invalid-email": "Email không hợp lệ.",
  "auth/email-already-in-use": "Email này đã được đăng ký.", "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự).",
  "auth/too-many-requests": "Quá nhiều lần thử. Vui lòng thử lại sau.", "auth/network-request-failed": "Lỗi kết nối mạng.",
  "auth/operation-not-allowed": "Phương thức đăng nhập chưa được bật trong Firebase Auth (Authentication → Sign-in method).",
  "auth/unauthorized-domain": "Domain này chưa được cấp phép trong Firebase Auth (Authentication → Settings → Authorized domains).",
  "auth/user-disabled": "Tài khoản đã bị vô hiệu hóa.", "auth/missing-password": "Vui lòng nhập mật khẩu.",
  "auth/configuration-not-found": "Chưa cấu hình Firebase Auth.", "auth/api-key-not-valid": "API key không hợp lệ."
};
export function authErrMsg(err) {
  const c = (err && err.code) || "";
  return MSG[c] || ("Thao tác thất bại" + (c ? " (" + c + ")" : ". Vui lòng thử lại."));
}
const need = () => { if (!auth) throw Object.assign(new Error("Hệ thống đăng nhập chưa sẵn sàng (Firebase SDK không tải được)."), { code: "app/no-sdk" }); return auth; };
export const signInEmail = (e, p) => need().signInWithEmailAndPassword(e, p);
export async function signUpEmail(e, p) {
  const cred = await need().createUserWithEmailAndPassword(e, p);
  try { await cred.user.sendEmailVerification(); } catch (_) {}
  return cred;
}
export const resetPassword = e => need().sendPasswordResetEmail(e);
export const signOut = () => need().signOut();
export async function resendVerification() { const u = need().currentUser; if (!u) throw new Error("Chưa đăng nhập."); return u.sendEmailVerification(); }

/* Google Identity Services — nạp lười, chỉ ở trang cần dùng */
let gisPromise = null;
function loadGis() {
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = res; s.onerror = () => { gisPromise = null; rej(new Error("Không tải được accounts.google.com/gsi/client")); };
    document.head.appendChild(s);
  });
  return gisPromise;
}
export async function renderGoogleButton(container, { onDone, onError } = {}) {
  try {
    await loadGis();
    const g = window.google.accounts.id;
    g.initialize({
      client_id: GOOGLE_CLIENT_ID, auto_select: false, cancel_on_tap_outside: true,
      callback: async resp => {
        try {
          if (!resp || !resp.credential) throw new Error("Không nhận được credential từ Google.");
          const cred = GoogleProvider().credential(resp.credential);
          await need().signInWithCredential(cred);
          dlog("ok", "Google → Firebase Auth thành công."); onDone && onDone();
        } catch (e) { dlog("er", "Google: " + (e.code || e.message)); onError && onError(authErrMsg(e)); }
      }
    });
    const w = Math.min(320, Math.max(200, container.clientWidth || 280));
    g.renderButton(container, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", logo_alignment: "left", width: w });
  } catch (e) {
    container.innerHTML = '<span class="gnote">Không tải được nút Google. Kiểm tra kết nối mạng.</span>';
    dlog("er", "GIS: " + e.message);
  }
}
