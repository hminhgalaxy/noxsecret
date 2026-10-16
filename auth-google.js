/* ===== GOOGLE (độc lập) — chuyển trang thẳng sang Google, không popup, không dùng Firebase =====
   Luồng: start() -> accounts.google.com -> quay lại login.html#id_token=... -> readReturn() kiểm tra state/nonce/aud/iss/exp.
   Module này chỉ trả về id_token + thông tin Google; việc đưa vào tài khoản là của auth-page.js. */
(function () {
  "use strict";
  const KEY = "skibidi_g_oauth";
  const hex = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, "0")).join(""); };
  const cfg = () => window.GOOGLE_CONFIG || {};
  /* Luôn quay về login.html (kể cả khi bấm từ register.html) — thêm đúng địa chỉ này vào Authorized redirect URIs */
  const redirectUri = () => new URL("login.html", location.href).href.split(/[?#]/)[0];
  const b64 = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const b = atob(s); return decodeURIComponent([...b].map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")); };

  function start(next) {
    if (!cfg().clientId) throw new Error("no-client");
    const state = hex(), nonce = hex();
    sessionStorage.setItem(KEY, JSON.stringify({ state, nonce, next: next || "./", t: Date.now() }));
    const q = new URLSearchParams({ client_id: cfg().clientId, redirect_uri: redirectUri(), response_type: "id_token", scope: "openid email profile", state, nonce, prompt: "select_account" });
    location.assign("https://accounts.google.com/o/oauth2/v2/auth?" + q);
  }

  /* null = trang này không phải lượt quay về từ Google */
  function readReturn() {
    const h = location.hash.replace(/^#/, "");
    if (!/(^|&)(id_token|error)=/.test(h)) return null;
    const p = new URLSearchParams(h);
    history.replaceState(null, "", location.pathname + location.search); /* xóa token khỏi thanh địa chỉ */
    let s = null;
    try { s = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (e) {}
    if (p.get("error")) return { error: p.get("error"), next: s && s.next };
    if (!s || s.state !== p.get("state") || Date.now() - s.t > 600000) return { error: "state" };
    const tok = p.get("id_token") || "";
    let c;
    try { c = JSON.parse(b64(tok.split(".")[1])); } catch (e) { return { error: "token" }; }
    const iss = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
    if (c.nonce !== s.nonce || c.aud !== cfg().clientId || !iss || !(c.exp * 1000 > Date.now())) return { error: "token" };
    return { idToken: tok, email: c.email, name: c.name, picture: c.picture, next: s.next };
  }

  window.SkibidiGoogle = { start, readReturn, redirectUri, configured: () => !!cfg().clientId };
})();
