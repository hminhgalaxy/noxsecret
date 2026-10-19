/* ===== QUÊN MẬT KHẨU — Firebase gửi email đặt lại mật khẩu về Gmail (miễn phí) ===== */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let vi = false; try { vi = localStorage.getItem("lang") === "vi"; } catch (e) {}
  document.documentElement.lang = vi ? "vi" : "en";
  const T = vi ? {
    title: "Quên mật khẩu", sub: "Nhập Gmail bạn đã đăng ký. Chúng mình sẽ gửi một email có liên kết để đặt mật khẩu mới.", send: "Gửi email", back2: "Quay lại đăng nhập", wait: "Đang gửi…",
    pn1: "Một tài khoản cho cả cộng đồng.", back: "Về trang chủ",
    empty: "Vui lòng nhập Gmail", bad: "Gmail chưa đúng định dạng",
    ok: "Nếu Gmail này đã đăng ký, email đặt lại mật khẩu đã được gửi. Hãy mở hộp thư (kiểm tra cả mục Spam) và bấm vào liên kết trong email.",
    again: "Gửi lại sau {0} giây", toomany: "Bạn thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.", net: "Kết nối đang chậm. Hãy kiểm tra mạng rồi thử lại.",
    other: "Chưa gửi được email. Hãy thử lại sau.", sys: "Kiểm tra hệ thống",
    pn2: "Script, APK, iOS và link do mọi người chia sẻ", pn3: "World: đăng bài và trò chuyện trong nhóm chat", pn4: "Thả tim, chấm sao và lưu những bài bạn thích"
  } : {
    title: "Forgot password", sub: "Enter the Gmail you signed up with. We'll email you a link to set a new password.", send: "Send email", back2: "Back to log in", wait: "Sending…",
    pn1: "One account for the whole community.", back: "Back to home",
    empty: "Enter your Gmail", bad: "That Gmail doesn't look right",
    ok: "If this Gmail is registered, a reset email has been sent. Open your inbox (check Spam too) and tap the link inside.",
    again: "Send again in {0}s", toomany: "Too many attempts. Wait a few minutes and try again.", net: "The connection is slow. Check your network and try again.",
    other: "Couldn't send the email. Please try again later.", sys: "Run system check",
    pn2: "Scripts, APKs, iOS files and links shared by everyone", pn3: "World: post and talk in group chats", pn4: "Like, rate and keep the posts you love"
  };
  const K = { title: T.title, sub: T.sub, send: T.send, back2: T.back2, back: T.back, "pn.title": T.pn1, "pn.1": T.pn2, "pn.2": T.pn3, "pn.3": T.pn4 };
  document.querySelectorAll("[data-i]").forEach(e => { const v = K[e.dataset.i]; if (v) e.textContent = v; });
  document.title = T.title + " — SKIBIDISCRIPT";
  const msg = (s, c) => { const e = $("aMsg"); e.textContent = s || ""; e.className = "fm" + (c ? " " + c : ""); };
  const next = new URLSearchParams(location.search).get("e"); if (next) $("email").value = next;
  let cool = 0, timer = null;
  function countdown() {
    clearInterval(timer);
    timer = setInterval(() => {
      cool--; if (cool <= 0) { clearInterval(timer); $("go").disabled = false; $("go").textContent = T.send; return; }
      $("go").textContent = T.again.replace("{0}", cool);
    }, 1000);
  }
  $("f").addEventListener("submit", async ev => {
    ev.preventDefault(); if ($("go").disabled) return;
    const email = $("email").value.trim().toLowerCase();
    if (!email) return msg(T.empty, "bad");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg(T.bad, "bad");
    $("go").disabled = true; $("go").textContent = T.wait; document.body.classList.add("loading"); msg("");
    try {
      await SkibidiFB.resetPassword(email);
      msg(T.ok, "ok"); cool = 60; $("go").textContent = T.again.replace("{0}", cool); countdown();
    } catch (e) {
      $("go").disabled = false; $("go").textContent = T.send;
      const m = { toomany: T.toomany, network: T.net, timeout: T.net, noload: T.net }[e.code] || (e.raw && e.raw.code === "auth/invalid-email" ? T.bad : T.other);
      msg(m, "bad");
      if (m === T.other) { const a = document.createElement("a"); a.href = "check.html"; a.textContent = " " + T.sys; a.style.fontWeight = "600"; $("aMsg").appendChild(a); }
    }
    document.body.classList.remove("loading");
  });
})();
