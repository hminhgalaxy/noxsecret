/* Phiên đăng nhập dùng chung. Một listener onAuthStateChanged duy nhất cho mọi trang. */
import { auth, db, TS, GoogleProvider } from "./firebase.js";
import { DEV_EMAIL, GOOGLE_CLIENT_ID, USERS_NODE, ADMIN_NODE, SEC_NODE } from "./config.js";
import { dlog } from "./log.js";
import { authMessage, GENERIC } from "./messages.js";
import { api, apiMessage, serverReady } from "./account.js";

const subs = new Set();
export const session = { user: null, ready: false, isDev: false, devBlocked: "", isGuest: false, isEditor: false, adminLoaded: false, profile: null, admin: null, banned: null, needTwofaSetup: false, sec: null, secLoaded: false, twofaPending: false };
/* Quyền theo hồ sơ quản trị của chính người dùng (do DEV cấp): vai trò, ban, mute */
const active = t => typeof t === "number" && t > Date.now();
export const banInfo = () => (session.admin && active(session.admin.banUntil)) ? { until: session.admin.banUntil, reason: session.admin.banReason || "" } : null;
export const muteInfo = () => (session.admin && active(session.admin.muteUntil)) ? { until: session.admin.muteUntil, reason: session.admin.muteReason || "" } : null;
export const isEditor = () => !!(session.user && !session.isGuest && session.user.emailVerified && session.admin && session.admin.role === "editor" && !banInfo());
let readyResolve; export const ready = new Promise(r => { readyResolve = r; });

export function computeDev(u) {
  if (!u) return { dev: false, why: "" };
  const mail = String(u.email || "").toLowerCase();
  if (mail !== DEV_EMAIL.toLowerCase()) return { dev: false, why: "" };
  if (!u.emailVerified) return { dev: false, why: "Hãy xác minh email của tài khoản quản trị để dùng đầy đủ quyền." };
  return { dev: true, why: "" };
}
function apply(u) {
  session.user = u || null; session.isGuest = !!(u && u.isAnonymous); session.isEditor = isEditor();
  const r = computeDev(u); session.isDev = r.dev; session.devBlocked = r.why;
  if (!session.ready) { session.ready = true; readyResolve(); }
  subs.forEach(f => { try { f(session); } catch (e) { console.error(e); } });
}
/* Chờ hồ sơ quyền (vai trò) của người dùng tải xong — tối đa 3 giây — trước khi quyết định trang chỉ dành cho nhân sự */
export const adminReady = () => (!session.user || session.isGuest || session.adminLoaded) ? Promise.resolve() : new Promise(res => { const off = onAuth(() => { if (session.adminLoaded) { off(); res(); } }); setTimeout(() => { off(); res(); }, 6000); });
/* Chờ biết tài khoản có đang chờ nhập mã 2 bước hay không (tối đa 6 giây) */
export const secReady = () => (!session.user || session.isGuest || session.secLoaded) ? Promise.resolve() : new Promise(res => { const off = onAuth(() => { if (session.secLoaded) { off(); res(); } }); setTimeout(() => { off(); res(); }, 3000); });
export const onAuth = fn => { subs.add(fn); return () => subs.delete(fn); };

if (auth) {
  auth.onAuthStateChanged(u => {
    dlog(u ? "ok" : "in", u ? "Auth: " + u.email : "Auth: chưa đăng nhập.");
    apply(u); if (u && !u.isAnonymous) touchProfile(u); watchSelf(u);
  }, e => { dlog("er", "Auth: " + (e.code || e.message)); apply(null); });
  setTimeout(() => { if (!session.ready) apply(null); }, 8000); // không treo vô hạn nếu SDK lỗi
} else apply(null);

/* Theo dõi hồ sơ + hồ sơ quản trị của chính mình (mô tả, avatar, vai trò, ban/mute). Bị ban → đăng xuất ngay. */
let offSelf = [], banShown = 0;
function watchSelf(u) {
  offSelf.forEach(f => f()); offSelf = []; session.profile = null; session.admin = null; session.isEditor = false; session.adminLoaded = false; session.sec = null; session.secLoaded = false; session.twofaPending = false;
  if (!u || !db) return;
  const notify = () => subs.forEach(f => { try { f(session); } catch (e) { console.error(e); } });
  if (!u.isAnonymous) { const r = db.ref(USERS_NODE + "/" + u.uid), h = r.on("value", sn => { session.profile = sn.val() || null; notify(); }, () => {}); offSelf.push(() => r.off("value", h)); }
  if (!u.isAnonymous) {
    const rs = db.ref(SEC_NODE + "/" + u.uid), hs = rs.on("value", sn => { session.sec = sn.val() || null; computeTwofa(u).then(() => computeSetup(u)).then(() => { if (auth.currentUser === u || (auth.currentUser && auth.currentUser.uid === u.uid)) { session.secLoaded = true; notify(); } }); }, () => { session.secLoaded = true; notify(); });
    offSelf.push(() => rs.off("value", hs));
  } else session.secLoaded = true;
  const ra = db.ref(ADMIN_NODE + "/" + u.uid), ha = ra.on("value", sn => {
    session.admin = sn.val() || null; session.adminLoaded = true; session.isEditor = isEditor(); const b = banInfo();
    if (b) { session.banned = b; if (Date.now() - banShown > 4000) { banShown = Date.now(); import("./confirm.js").then(m => m.alertDialog({ kind: "ban", title: "Account suspended", message: b.reason ? "Reason: " + b.reason : "Your account has been suspended by an administrator.", ok: "OK", danger: true })).catch(() => {}); } need().signOut().catch(() => {}); }
    notify();
  }, () => { session.adminLoaded = true; notify(); }); offSelf.push(() => ra.off("value", ha));
}

/* Phiên đăng nhập này đã được "thẻ phiên" (claim tf1/tf2/tf3 khớp auth_time) chưa?
   - Tài khoản chưa có cổng (gate) hoặc chưa có thẻ: hỏi máy chủ (login-check). IP quen + không bật 2 bước → máy chủ cấp thẻ tự động.
   - Bật 2 bước hoặc IP/vị trí lạ → twofaPending = true → router đưa tới /two-step để nhập mã gửi qua email. */
let twofaRun = null;
function computeTwofa(u) {
  if (twofaRun) return twofaRun;
  twofaRun = (async () => {
    if (!u || u.isAnonymous) { session.twofaPending = false; session.twofaReason = null; return; }
    const flagged = !!(session.sec && session.sec.twofa);
    if (!u.emailVerified) { try { await u.reload(); } catch (_) {} if (u.emailVerified) { const r = computeDev(u); session.isDev = r.dev; session.devBlocked = r.why; session.isEditor = isEditor(); } }
    try {
      let c = ((await u.getIdTokenResult(true)).claims) || {}; const has = () => [c.tf1, c.tf2, c.tf3].includes(c.auth_time);
      if (has() && session.sec && (session.sec.gate || session.sec.twofa)) { session.twofaPending = false; session.twofaReason = null; return; }
      if (u.emailVerified && await serverReady()) {
        const r = await api("login-check");
        if (r.ok) {
          if (!r.need && !has()) { c = ((await u.getIdTokenResult(true)).claims) || {}; }
          session.twofaPending = !!r.need; session.twofaReason = r.need || null; session.twofaPlace = r.place || ""; return;
        }
      }
      session.twofaPending = flagged && !has(); session.twofaReason = session.twofaPending ? "twofa" : null;
    } catch (_) { session.twofaPending = flagged; session.twofaReason = flagged ? "twofa" : null; }
  })().finally(() => { twofaRun = null; });
  return twofaRun;
}
/* Tài khoản Google cũng PHẢI bật xác minh 2 bước (khi máy chủ gửi thư đã sẵn sàng): chưa bật → router đưa tới Hồ sơ › Bảo mật để bật */
export const isGoogleUser = u => !!(u && (u.providerData || []).some(p => p.providerId === "google.com"));
async function computeSetup(u) {
  session.needTwofaSetup = false;
  if (!u || u.isAnonymous || !isGoogleUser(u) || !u.emailVerified || (session.sec && session.sec.twofa) || session.twofaPending) return;
  try { session.needTwofaSetup = await serverReady(); } catch (_) { session.needTwofaSetup = false; }
}
/* Ép đưa tới /two-step (dùng khi phiên thiếu "thẻ phiên" nên không ghi được dữ liệu quản trị) */
export function forceTwofa() { session.twofaPending = true; session.twofaReason = "twofa"; subs.forEach(f => { try { f(session); } catch (e) { console.error(e); } }); }
/* Sau khi máy chủ cấp claim (nhập đúng mã / bật 2FA) → lấy token mới và đánh giá lại */
export async function refreshSession() {
  const u = need().currentUser; if (!u) return; await computeTwofa(u); subs.forEach(f => { try { f(session); } catch (e) { console.error(e); } });
}

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
  try { await sendVerification(); api("welcome"); } catch (_) {}
  apply(need().currentUser || cred.user); touchProfile(need().currentUser || cred.user);
  return cred;
}
/* Thư do máy chủ gửi (HTML tiếng Anh có logo). Chưa cấu hình / lỗi mạng / lỗi máy chủ → quay về thư mặc định của Firebase. */
const fallback = r => r.code === "not_configured" || r.code === "network" || r.code === "server_error" || r.status >= 500;
const apiErr = r => Object.assign(new Error(apiMessage(r)), { code: "api/" + r.code });
export async function resetPassword(e) {
  const r = await api("reset", { email: e }, { token: false });
  if (r.ok) return; if (fallback(r)) return need().sendPasswordResetEmail(e); throw apiErr(r);
}
export async function sendVerification() {
  const u = need().currentUser; if (!u) throw Object.assign(new Error("Bạn chưa đăng nhập."), { code: "app/no-user" });
  const r = await api("verify-email"); if (r.ok) return; if (fallback(r)) return u.sendEmailVerification(); throw apiErr(r);
}
/* Quên cả email đăng nhập? Gửi liên kết đặt lại mật khẩu tới EMAIL KHÔI PHỤC (nếu có). Luôn báo thành công để không lộ thông tin. */
/* Nhập mã nhận qua email + mật khẩu mới → đổi mật khẩu (chưa cần đăng nhập). */
export async function resetConfirm(email, code, password) { const r = await api("reset-confirm", { email, code, password }, { token: false }); if (!r.ok) throw apiErr(r); return r; }
export const passwordCodeSend = via => act("password-code-send", { via });
/* Đổi mật khẩu khi đang đăng nhập — một trong ba cách: via = "current" (mật khẩu hiện tại) | "recovery" (mã gửi email khôi phục) | "twofa" (mã xác minh 2 bước). Máy chủ thu hồi mọi phiên → đăng nhập lại. */
export async function changePassword({ via, currentPassword, code, password }) { const r = await act("password-change", { via, currentPassword, code, password }); try { await need().signOut(); } catch (_) {} return r; }
export async function recoverByRecoveryEmail(e) { const r = await api("recover", { email: e }, { token: false }); if (r.ok) return; throw apiErr(r); }
/* Xác minh 2 bước + email khôi phục + đổi email (cần máy chủ đã cấu hình) */
async function act(action, body, refresh) { const r = await api(action, body); if (!r.ok) throw apiErr(r); if (refresh && r.refresh) await refreshSession(); return r; }
export const twofaSend = purpose => act("twofa-send", { purpose });
export const twofaVerify = (purpose, code) => act("twofa-verify", { purpose, code }, true);
export const recoveryStart = email => act("recovery-start", { email });
export const recoveryConfirm = code => act("recovery-confirm", { code });
export const recoveryRemove = () => act("recovery-remove", {});
export const changeEmail = (newEmail, password) => act("change-email", { newEmail, password });
export const notifyPasswordChanged = () => api("password-changed");
export const signOutBlocked = () => !!(session.maintOn && session.isDev && !session.twofaPending);
export const signOut = () => signOutBlocked() ? Promise.reject(Object.assign(new Error("Website đang bảo trì: tài khoản quản trị không thể đăng xuất lúc này."), { code: "app/maint-lock" })) : need().signOut();
/* Đăng nhập khách (ẩn danh): không phải người dùng thật, bị hạn chế một số thứ */
export const signInGuest = () => need().signInAnonymously();
/* Mô tả + avatar của chính mình */
export async function saveProfileFields(fields) {
  const u = need().currentUser; if (!u || u.isAnonymous || !db) throw new Error("Bạn cần đăng nhập để làm việc này.");
  await db.ref(USERS_NODE + "/" + u.uid).update(fields);
}
export const resendVerification = () => sendVerification();
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

/* Quay lại tab sau khi bấm liên kết xác minh email ở tab khác → tự cập nhật (không phải tải lại trang) */
document.addEventListener("visibilitychange", async () => {
  const u = auth && auth.currentUser; if (document.visibilityState !== "visible" || !u || u.isAnonymous || u.emailVerified) return;
  try { await u.reload(); if (u.emailVerified) { await u.getIdToken(true); apply(u); computeTwofa(u).then(() => subs.forEach(f => { try { f(session); } catch (e) { console.error(e); } })); } } catch (_) {}
});
