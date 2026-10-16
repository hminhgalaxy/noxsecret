/* ===== TRANG GOOGLE RIÊNG (google.html) — chỉ xử lý đăng nhập Google, không có form Gmail/mật khẩu ===== */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let lang = "en"; try { lang = localStorage.getItem("lang") === "vi" ? "vi" : "en"; } catch (e) {}
  const S = {}, D = (k, v, e) => { S[k] = { vi: v, en: e }; };
  const t = k => (S[k] || {})[lang] || k;
  document.documentElement.lang = lang;
  D("title", "Đăng nhập bằng Google", "Sign in with Google"); D("sub", "Dùng tài khoản Google của bạn. Không cần mật khẩu.", "Use your Google account. No password needed.");
  D("btn", "Tiếp tục với Google", "Continue with Google"); D("mail", "Dùng Gmail và mật khẩu", "Use Gmail and password");
  D("back", "Về trang chủ", "Back to home"); D("alt", "Đăng nhập Google qua Firebase (cửa sổ phụ)", "Sign in with Google via Firebase (small window)");
  D("pn.title", "Một tài khoản cho cả cộng đồng.", "One account for the whole community.");
  D("pn.1", "Script, APK, iOS và link do mọi người chia sẻ", "Scripts, APKs, iOS files and links shared by everyone");
  D("pn.2", "World: đăng bài và trò chuyện trong nhóm chat", "World: post and talk in group chats");
  D("pn.3", "Thả tim, chấm sao và lưu những bài bạn thích", "Like, rate and keep the posts you love");
  D("verify", "Đang xác thực với Google…", "Verifying with Google…"); D("wait", "Đang xử lý…", "Working…");
  D("cancel", "Bạn đã hủy đăng nhập Google.", "Google sign-in was cancelled.");
  D("bad", "Phiên Google không hợp lệ hoặc đã hết hạn. Hãy thử lại.", "The Google session is invalid or expired. Please try again.");
  D("noclient", "Chưa cấu hình Google Client ID (google-config.js).", "Google Client ID is missing (google-config.js).");
  D("e.client", "Google đã xác nhận bạn, nhưng Firebase chưa chấp nhận Client ID này. Thêm vào Firebase Console → Authentication → Sign-in method → Google → Safelist client IDs from external projects, hoặc dùng nút bên dưới.", "Google verified you, but Firebase doesn't accept this Client ID yet. Add it under Firebase Console → Authentication → Sign-in method → Google → Safelist client IDs from external projects, or use the button below.");
  D("e.off", "Đăng nhập Google chưa bật: Firebase Console → Authentication → Sign-in method → bật Google.", "Google sign-in is off: Firebase Console → Authentication → Sign-in method → enable Google.");
  D("e.domain", "Tên miền này chưa được phép: Firebase Console → Authentication → Settings → Authorized domains.", "This domain isn't authorized: Firebase Console → Authentication → Settings → Authorized domains.");
  D("e.config", "Firebase Authentication chưa bật cho project này.", "Firebase Authentication isn't set up for this project.");
  D("e.noload", "Không tải được Firebase. Kiểm tra mạng rồi tải lại trang.", "Firebase couldn't load. Check your connection and reload.");
  D("e.network", "Mất kết nối mạng. Kiểm tra mạng rồi thử lại.", "Network error. Check your connection and try again.");
  D("e.popup", "Cửa sổ Google bị đóng hoặc bị chặn. Cho phép popup rồi thử lại.", "The Google window was closed or blocked. Allow popups and try again.");
  D("e.diff", "Gmail này đã đăng ký bằng mật khẩu. Hãy đăng nhập bằng Gmail và mật khẩu, rồi gắn Google trong Cài đặt.", "This Gmail is registered with a password. Log in with it, then link Google in Settings.");
  D("e.disabled", "Tài khoản này đã bị khóa.", "This account is disabled."); D("e.toomany", "Thao tác quá nhanh, hãy thử lại sau ít phút.", "Too many requests, try again in a few minutes.");
  D("e.other", "Chưa thực hiện được. Hãy thử lại.", "That didn't work. Please try again.");
  const fbText = e => S["e." + (e && e.code)] ? t("e." + e.code) : t("e.other");
  const msg = (s, c) => { const e = $("gMsg"); e.textContent = s || ""; e.className = "fm" + (c ? " " + c : ""); };
  function safeNext(n) {
    try { const u = new URL(n || "./", location.href); if (u.origin !== location.origin || /\/(login|register|google)(\.html)?\/?$/.test(u.pathname)) return "./"; return u.pathname + u.search + u.hash; } catch (e) { return "./"; }
  }
  let NEXT = safeNext(new URLSearchParams(location.search).get("next"));
  const busy = on => { ["gBtn", "gAltBtn"].forEach(i => { $(i).disabled = on; }); };
  const done = () => location.replace(NEXT);

  async function returned(r) {
    if (r.error) return msg(r.error === "access_denied" ? t("cancel") : t("bad"), "bad");
    NEXT = safeNext(r.next); busy(true); msg(t("verify"));
    try { await SkibidiFB.googleIdToken(r.idToken); done(); }
    catch (e) { busy(false); msg(fbText(e), "bad"); if (e.code === "client" || e.code === "off") $("gAlt").hidden = false; }
  }
  document.querySelectorAll("[data-i]").forEach(e => { e.textContent = t(e.dataset.i); });
  document.title = t("title") + " — SKIBIDISCRIPT";
  $("mail").href = "login.html" + (NEXT !== "./" ? "?next=" + encodeURIComponent(NEXT) : "");
  $("gBtn").addEventListener("click", () => { try { msg(""); SkibidiGoogle.start(NEXT); } catch (e) { msg(t("noclient"), "bad"); } });
  $("gAltBtn").addEventListener("click", async () => {
    busy(true); msg("");
    try { await SkibidiFB.googlePopup(); done(); } catch (e) { busy(false); msg(fbText(e), "bad"); }
  });
  const r = SkibidiGoogle.readReturn();
  if (r) returned(r);
})();
