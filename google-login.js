/* ===== ĐĂNG NHẬP GOOGLE — hoàn toàn độc lập, KHÔNG dùng Firebase =====
   Google trả id_token -> kiểm tra (state, nonce, aud, iss, exp) trong auth-google.js -> lưu phiên Google trên máy -> về trang chính. */
(function () {
  "use strict";
  const KEY = "skibidi_google_session", $ = id => document.getElementById(id);
  let vi = false; try { vi = localStorage.getItem("lang") === "vi"; } catch (e) {}
  const T = vi ? { cancel: "Bạn đã hủy đăng nhập Google.", bad: "Phiên Google không hợp lệ hoặc đã hết hạn. Hãy thử lại.", noc: "Đăng nhập Google tạm thời chưa dùng được.", wait: "Đang chuyển sang Google…" }
               : { cancel: "Google sign-in was cancelled.", bad: "The Google session is invalid or expired. Please try again.", noc: "Google sign-in is temporarily unavailable.", wait: "Redirecting to Google…" };
  const msg = (s, c) => { const e = $("gMsg"); if (e) { e.textContent = s || ""; e.className = "fm" + (c ? " " + c : ""); } };
  const safeNext = n => { try { const u = new URL(n || "./", location.href); if (u.origin !== location.origin || /\/(login|register)(\.html)?\/?$/.test(u.pathname)) return "./"; return u.pathname + u.search + u.hash; } catch (e) { return "./"; } };
  const NEXT = safeNext(new URLSearchParams(location.search).get("next"));

  $("gBtn").addEventListener("click", () => {
    try { msg(T.wait); $("gBtn").disabled = true; SkibidiGoogle.start(NEXT); } catch (e) { $("gBtn").disabled = false; msg(T.noc, "bad"); }
  });

  const r = SkibidiGoogle.readReturn();
  if (r) {
    if (r.error || !r.sub) msg(r.error === "access_denied" ? T.cancel : T.bad, "bad");
    else {
      try { localStorage.setItem(KEY, JSON.stringify({ sub: r.sub, email: r.email || "", name: r.name || "", picture: r.picture || "", exp: Date.now() + 30 * 864e5 })); location.replace(safeNext(r.next)); }
      catch (e) { msg(T.bad, "bad"); }
    }
  }
})();
