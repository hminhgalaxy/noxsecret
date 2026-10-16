/* ===== FIREBASE (độc lập) — đăng ký / đăng nhập email + mật khẩu, và nhận id_token Google từ nơi khác =====
   Không biết Google Client ID là gì. Mọi lỗi được chuẩn hóa thành Error có .code (chữ ngắn) để UI tự dịch. */
(function () {
  "use strict";
  const SDK = "https://www.gstatic.com/firebasejs/10.14.1/firebase-";
  const mk = (code, e) => { const x = new Error(code); x.code = code; x.raw = e; return x; };
  const load = src => new Promise(r => { const s = document.createElement("script"); s.src = src; s.onload = () => r(true); s.onerror = () => { s.remove(); r(false); }; document.head.appendChild(s); });
  const sdkOk = () => !!(window.firebase && firebase.initializeApp && firebase.auth && firebase.database);
  async function sdk() {
    for (let i = 0; i < 3 && !sdkOk(); i++)
      for (const n of ["app", "auth", "database"]) {
        const has = window.firebase && (n === "app" ? firebase.initializeApp : firebase[n]);
        if (!has) await load(SDK + n + "-compat.js" + (i ? "?r=" + i : ""));
      }
    return sdkOk();
  }

  let P = null;
  function ready() {
    if (P) return P;
    P = (async () => {
      const cfg = window.FIREBASE_CONFIG;
      if (!cfg || !cfg.apiKey) throw mk("config");
      if (!(await sdk())) throw mk("noload");
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      return { auth: firebase.auth(), db: firebase.database() };
    })();
    P.catch(() => { P = null; });
    return P;
  }

  const MAP = {
    wrong: ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials", "auth/invalid-email"],
    exists: ["auth/email-already-in-use", "auth/credential-already-in-use"],
    diff: ["auth/account-exists-with-different-credential"],
    toomany: ["auth/too-many-requests"],
    config: ["auth/configuration-not-found", "auth/api-key-not-valid", "auth/invalid-api-key"],
    domain: ["auth/unauthorized-domain"],
    popup: ["auth/popup-closed-by-user", "auth/popup-blocked", "auth/cancelled-popup-request"],
    network: ["auth/network-request-failed"],
    off: ["auth/operation-not-allowed"],
    disabled: ["auth/user-disabled"],
    weak: ["auth/weak-password"]
  };
  function norm(e, google) {
    if (e && e.raw !== undefined) return e;
    const c = (e && e.code) || "";
    console.warn("[firebase]", c, e && e.message);
    /* Token Google hợp lệ nhưng Firebase không nhận Client ID này => lỗi "client", không phải sai mật khẩu */
    if (google && ["auth/invalid-credential", "auth/invalid-oauth-client-id", "auth/invalid-idp-response", "auth/argument-error", "auth/internal-error"].includes(c)) return mk("client", e);
    for (const k in MAP) if (MAP[k].includes(c)) return mk(k, e);
    return mk("other", e);
  }

  async function nameOwner(n) {
    try { const { db } = await ready(); return (await db.ref("pub/names/" + n.toLowerCase()).once("value")).val(); }
    catch (e) { return undefined; } /* không đọc được => coi như chưa kiểm tra */
  }

  async function register(b) {
    const { auth, db } = await ready(), lower = b.name.toLowerCase();
    if (await nameOwner(lower)) throw mk("nametaken");
    let u;
    try { u = (await auth.createUserWithEmailAndPassword(b.email, b.password)).user; } catch (e) { throw norm(e); }
    /* chỉ hủy tài khoản khi tên THẬT SỰ bị người khác lấy; lỗi quyền ghi thì vẫn cho đăng ký (trang chính tự tạo lại hồ sơ) */
    try { await db.ref("pub/names/" + lower).set(u.uid); }
    catch (e) { const o = await nameOwner(lower); if (o && o !== u.uid) { await u.delete().catch(() => {}); throw mk("nametaken"); } console.warn("[name]", e); }
    try { await db.ref("pub/users/" + u.uid).set({ name: b.name, pic: "", bio: "", createdAt: firebase.database.ServerValue.TIMESTAMP }); } catch (e) { console.warn("[profile]", e); }
    try { await u.updateProfile({ displayName: b.name }); } catch (e) {}
    return u;
  }
  async function login(b) {
    const { auth } = await ready();
    try { return (await auth.signInWithEmailAndPassword(b.email, b.password)).user; } catch (e) { throw norm(e); }
  }
  /* Nhận id_token Google (do auth-google.js lấy) và đổi lấy phiên Firebase */
  async function googleIdToken(idToken) {
    const { auth } = await ready();
    try { return (await auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(idToken))).user; } catch (e) { throw norm(e, true); }
  }
  /* Dự phòng: Google của chính Firebase (không cần Client ID riêng) */
  async function googlePopup() {
    const { auth } = await ready();
    try { return (await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())).user; } catch (e) { throw norm(e); }
  }
  /* gọi cb(user|null) đúng một lần với phiên đã lưu */
  async function onceUser(cb) {
    const { auth } = await ready();
    const un = auth.onAuthStateChanged(u => { un(); cb(u); });
  }

  window.SkibidiFB = { ready, register, login, googleIdToken, googlePopup, nameOwner, onceUser };
})();
