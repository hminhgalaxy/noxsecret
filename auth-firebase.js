/* ===== FIREBASE (độc lập) — đăng ký / đăng nhập email + mật khẩu, (KHÔNG có Google) =====
   Không biết Google Client ID là gì. Mọi lỗi được chuẩn hóa thành Error có .code (chữ ngắn) để UI tự dịch. */
(function () {
  "use strict";
  const SDK = "https://www.gstatic.com/firebasejs/10.14.1/firebase-";
  const mk = (code, e) => { const x = new Error(code); x.code = code; x.raw = e; x.sk = true; return x; };
  /* Mọi thao tác mạng đều có hạn chót: không bao giờ để trang đứng ở "Đang xử lý…" mãi */
  const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(mk("timeout")), ms))]);
  const load = src => new Promise(r => { const s = document.createElement("script"); s.src = src; const to = setTimeout(() => { s.remove(); r(false); }, 8000); s.onload = () => { clearTimeout(to); r(true); }; s.onerror = () => { clearTimeout(to); s.remove(); r(false); }; document.head.appendChild(s); });
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
  function norm(e) {
    if (e && e.sk) return e;
    const c = (e && e.code) || "";
    console.warn("[firebase]", c, e && e.message);
    for (const k in MAP) if (MAP[k].includes(c)) return mk(k, e);
    return mk("other", e);
  }

  /* null = tên còn trống · chuỗi = đã có người dùng · undefined = chưa kiểm tra được (mạng chậm / chưa cấp quyền đọc) */
  async function nameOwner(n) {
    const cfg = window.FIREBASE_CONFIG || {};
    if (!cfg.databaseURL) return undefined;
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 5000);
    try {
      const r = await fetch(cfg.databaseURL.replace(/\/$/, "") + "/pub/names/" + encodeURIComponent(String(n).toLowerCase()) + ".json", { signal: ac.signal });
      if (!r.ok) return undefined;
      return (await r.json()) || null;
    } catch (e) { return undefined; } finally { clearTimeout(tm); }
  }

  async function register(b) {
    const { auth, db } = await within(ready(), 25000), lower = b.name.toLowerCase();
    if (await nameOwner(lower)) throw mk("nametaken");
    let u;
    try { u = (await within(auth.createUserWithEmailAndPassword(b.email, b.password), 20000)).user; } catch (e) { throw norm(e); }
    /* chỉ hủy tài khoản khi tên THẬT SỰ bị người khác lấy; lỗi quyền ghi thì vẫn cho đăng ký (trang chính tự tạo lại hồ sơ) */
    try { await within(db.ref("pub/names/" + lower).set(u.uid), 6000); }
    catch (e) { const o = await nameOwner(lower); if (o && o !== u.uid) { await u.delete().catch(() => {}); throw mk("nametaken"); } console.warn("[name]", e); }
    try { await within(db.ref("pub/users/" + u.uid).set({ name: b.name, pic: "", bio: "", createdAt: firebase.database.ServerValue.TIMESTAMP }), 6000); } catch (e) { console.warn("[profile]", e); }
    try { await within(u.updateProfile({ displayName: b.name }), 4000); } catch (e) {}
    return u;
  }
  async function login(b) {
    const { auth } = await within(ready(), 25000);
    try { return (await within(auth.signInWithEmailAndPassword(b.email, b.password), 20000)).user; } catch (e) { throw norm(e); }
  }
  /* Gửi email đặt lại mật khẩu (Firebase gửi miễn phí). Gmail không tồn tại: Firebase không báo lỗi để người lạ không dò được ai có tài khoản */
  async function resetPassword(email) {
    const { auth } = await within(ready(), 25000);
    try { await within(auth.sendPasswordResetEmail(email), 20000); }
    catch (e) { const n = norm(e); if (n.raw && n.raw.code === "auth/user-not-found") return; throw n; }
  }
  /* gọi cb(user|null) đúng một lần với phiên đã lưu */
  async function onceUser(cb) {
    const { auth } = await ready();
    const un = auth.onAuthStateChanged(u => { un(); cb(u); });
  }

  window.SkibidiFB = { ready, register, login, resetPassword, nameOwner, onceUser };
})();
