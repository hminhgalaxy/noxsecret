/* ===== ĐĂNG NHẬP GOOGLE — hoàn toàn độc lập, KHÔNG dùng Firebase =====
   Google trả id_token -> kiểm tra (state, nonce, aud, iss, exp) trong auth-google.js -> lưu phiên Google trên máy -> về trang chính. */
(function () {
  "use strict";
  const KEY = "skibidi_google_session", $ = id => document.getElementById(id);
  let vi = false; try { vi = localStorage.getItem("lang") === "vi"; } catch (e) {}
  const T = vi
    ? { cancel: "Bạn đã hủy đăng nhập Google.", bad: "Đăng nhập Google chưa thành công. Hãy thử lại.", noc: "Đăng nhập Google tạm thời chưa dùng được.", wait: "Đang chuyển sang Google…",
        lost: "Phiên đăng nhập bị gián đoạn (thường do trình duyệt mở Google ở tab khác). Hãy bấm nút Google và hoàn tất ngay trong cùng một tab.",
        old: "Bạn để quá lâu nên phiên đã hết hạn. Hãy bấm nút Google để thử lại.",
        clock: "Đồng hồ trên thiết bị của bạn đang lệch giờ. Hãy bật giờ tự động rồi thử lại." }
    : { cancel: "Google sign-in was cancelled.", bad: "Google sign-in didn't work. Please try again.", noc: "Google sign-in is temporarily unavailable.", wait: "Redirecting to Google…",
        lost: "The sign-in was interrupted (often the browser opens Google in another tab). Tap the Google button and finish in the same tab.",
        old: "You waited too long and the session expired. Tap the Google button to try again.",
        clock: "Your device clock is off. Turn on automatic time and try again." };
  T.state = T.lost; T.token = T.bad; T.client = T.bad;
  const msg = (s, c) => { const e = $("gMsg"); if (e) { e.textContent = s || ""; e.className = "fm" + (c ? " " + c : ""); } };
  const safeNext = n => { try { const u = new URL(n || "./", location.href); if (u.origin !== location.origin || /\/(login|register)(\.html)?\/?$/.test(u.pathname)) return "./"; return u.pathname + u.search + u.hash; } catch (e) { return "./"; } };
  const NEXT = safeNext(new URLSearchParams(location.search).get("next"));

  $("gBtn").addEventListener("click", () => {
    try { msg(T.wait); $("gBtn").disabled = true; document.body.classList.add("loading"); SkibidiGoogle.start(NEXT); } catch (e) { $("gBtn").disabled = false; document.body.classList.remove("loading"); msg(T.noc, "bad"); }
  });

  const r = SkibidiGoogle.readReturn();
  if (r) {
    document.body.classList.add("loading");
    if (r.error || !r.sub) { document.body.classList.remove("loading"); msg(r.error === "access_denied" ? T.cancel : (T[r.error] || (T.bad + (r.error ? " (" + r.error + ")" : ""))), "bad"); }
    else {
      try { localStorage.setItem(KEY, JSON.stringify({ sub: r.sub, email: r.email || "", name: r.name || "", picture: r.picture || "", exp: Date.now() + 30 * 864e5 })); location.replace(safeNext(r.next)); }
      catch (e) { document.body.classList.remove("loading"); msg(T.bad, "bad"); }
    }
  }
})();
