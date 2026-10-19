/* ===== Giao diện trang đăng nhập / đăng ký — CHỈ email + mật khẩu (Firebase). Google nằm riêng ở google-login.js ===== */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const REG = document.body.dataset.page === "register";
  let lang = "en"; try { lang = localStorage.getItem("lang") === "vi" ? "vi" : "en"; } catch (e) {}
  const S = {}, D = (k, v, e) => { S[k] = { vi: v, en: e }; };
  const t = (k, ...a) => { let s = (S[k] || {})[lang] || k; a.forEach((v, i) => { s = s.split("{" + i + "}").join(v); }); return s; };
  document.documentElement.lang = lang;

  D("login.title", "Đăng nhập", "Log in"); D("login.sub", "Vào tài khoản để đăng bài, thả tim và trò chuyện trong World.", "Log in to post, like and chat in World.");
  D("reg.title", "Tạo tài khoản", "Create account"); D("reg.sub", "Miễn phí. Mỗi tên hiển thị là duy nhất.", "Free. Every display name is unique.");
  D("login.go", "Đăng nhập", "Log in"); D("reg.go", "Đăng ký", "Sign up"); D("register", "Đăng ký", "Sign up"); D("login", "Đăng nhập", "Log in");
  D("no.acc", "Chưa có tài khoản?", "No account yet?"); D("has.acc", "Đã có tài khoản?", "Already have an account?"); D("back", "Về trang chủ", "Back to home");
  D("wait", "Đang xử lý…", "Working…"); D("pw", "Mật khẩu", "Password"); D("a.name", "Tên hiển thị (không có khoảng trắng)", "Display name (no spaces)");
  D("a.name.ph", "vd: skibidi_fan", "e.g. skibidi_fan"); D("a.pw2", "Nhập lại mật khẩu", "Repeat password");
  D("a.showpw", "Hiện mật khẩu", "Show password"); D("a.hidepw", "Ẩn mật khẩu", "Hide password");
  D("v.name.empty", "Vui lòng nhập tên hiển thị", "Enter a display name"); D("v.name.space", "Tên không được chứa khoảng trắng", "Name can't contain spaces");
  D("v.name.short", "Tên quá ngắn (tối thiểu 3 ký tự)", "Name is too short (min 3 characters)"); D("v.name.long", "Tên quá dài (tối đa 24 ký tự)", "Name is too long (max 24 characters)");
  D("v.name.chars", "Tên chỉ gồm chữ, số và dấu _", "Use letters, numbers and _ only");
  D("v.em.empty", "Vui lòng nhập Gmail", "Enter your Gmail"); D("v.em.space", "Gmail không được chứa khoảng trắng", "Gmail can't contain spaces");
  D("v.em.at", "Thiếu ký tự @ (ví dụ: example@gmail.com)", "Missing @ (e.g. example@gmail.com)"); D("v.em.at2", "Gmail chỉ được có một ký tự @", "Only one @ allowed");
  D("v.em.dom", "Chỉ chấp nhận địa chỉ có đuôi @gmail.com", "Only @gmail.com addresses are accepted");
  D("v.em.len", "Phần trước @gmail.com phải dài 6–30 ký tự", "The part before @gmail.com must be 6–30 characters");
  D("v.em.chars", "Gmail chỉ được dùng chữ cái, số và dấu chấm", "Use letters, numbers and dots only");
  D("v.em.dots", "Dấu chấm không được ở đầu, cuối hoặc đứng liền nhau", "Dots can't be first, last or doubled"); D("v.em.ok", "Gmail hợp lệ", "Gmail looks good");
  D("v.pw.empty", "Vui lòng nhập mật khẩu", "Enter a password"); D("v.pw.space", "Mật khẩu không được chứa khoảng trắng", "Password can't contain spaces");
  D("v.pw.weak", "Mật khẩu quá yếu: cần ít nhất 8 ký tự, có chữ hoa và ký tự đặc biệt (! @ # $ …)", "Too weak: use 8+ characters with an uppercase letter and a symbol (! @ # $ …)");
  D("v.pw.again", "Vui lòng nhập lại mật khẩu", "Repeat the password"); D("v.pw.diff", "Mật khẩu nhập lại không khớp", "Passwords don't match"); D("v.pw.same", "Mật khẩu khớp", "Passwords match");
  D("pw.l1", "Yếu — chưa thể sử dụng", "Weak — can't be used"); D("pw.l2", "Trung bình — chấp nhận được", "Fair — acceptable"); D("pw.l3", "Mạnh", "Strong");
  D("pw.r1", "Ít nhất 8 ký tự", "At least 8 characters"); D("pw.r2", "Có chữ hoa (A–Z)", "An uppercase letter (A–Z)"); D("pw.r3", "Có ký tự đặc biệt (! @ # $ …)", "A symbol (! @ # $ …)");
  D("n.checking", "Đang kiểm tra tên…", "Checking name…"); D("n.ok", "Tên hợp lệ, có thể dùng", "Name is available"); D("n.taken", "Tên này đã có người sử dụng", "This name is taken");
  D("n.nocheck", "Tên hợp lệ (chưa kiểm tra được trùng tên)", "Name looks valid (couldn't check availability)");
  D("invalid", "Thông tin chưa hợp lệ. Hãy sửa các mục báo đỏ phía trên.", "Some details are invalid. Fix the fields marked in red.");
  D("locked", "Bạn đã thử sai nhiều lần. Thử lại sau {0} giây.", "Too many attempts. Try again in {0}s.");
  D("e.wrong", "Sai Gmail hoặc mật khẩu.", "Wrong Gmail or password."); D("e.exists", "Gmail này đã được đăng ký. Hãy đăng nhập.", "This Gmail is already registered. Log in instead.");
  D("e.nametaken", "Tên hiển thị đã có người sử dụng. Hãy chọn tên khác.", "That name is taken. Choose another.");
  D("e.diff", "Gmail này đã dùng cách đăng nhập khác. Hãy đăng nhập bằng cách bạn đã dùng lúc đầu.", "This Gmail uses a different sign-in method. Log in the way you first did.");
  D("e.toomany", "Thao tác quá nhanh, hãy thử lại sau ít phút.", "Too many requests, try again in a few minutes.");
  D("e.network", "Mất kết nối mạng. Kiểm tra mạng rồi thử lại.", "Network error. Check your connection and try again.");
  D("e.noload", "Không kết nối được. Kiểm tra mạng rồi tải lại trang.", "Couldn't connect. Check your connection and reload the page.");
  D("e.config", "Đăng nhập đang tạm thời chưa dùng được. Hãy thử lại sau ít phút.", "Sign-in is temporarily unavailable. Please try again in a few minutes.");
  D("e.off", "Đăng nhập đang tạm thời chưa dùng được. Hãy thử lại sau ít phút.", "Sign-in is temporarily unavailable. Please try again in a few minutes.");
  D("e.domain", "Đăng nhập đang tạm thời chưa dùng được. Hãy thử lại sau ít phút.", "Sign-in is temporarily unavailable. Please try again in a few minutes.");
  D("e.disabled", "Tài khoản này đã bị khóa.", "This account is disabled."); D("e.weak", "Mật khẩu quá yếu.", "Password is too weak.");
  D("g.btn", "Tiếp tục với Google", "Continue with Google"); D("or", "hoặc dùng Gmail", "or use Gmail");
  D("forgot.link", "Quên mật khẩu?", "Forgot password?");
  D("sys.check", "Kiểm tra hệ thống", "Run system check");
  D("e.timeout", "Kết nối đang chậm. Hãy kiểm tra mạng rồi thử lại.", "The connection is slow. Check your network and try again.");
  D("e.other", "Chưa thực hiện được. Hãy thử lại.", "That didn't work. Please try again.");
  D("pn.title", "Một tài khoản cho cả cộng đồng.", "One account for the whole community.");
  D("pn.1", "Script, APK, iOS và link do mọi người chia sẻ", "Scripts, APKs, iOS files and links shared by everyone");
  D("pn.2", "World: đăng bài và trò chuyện trong nhóm chat", "World: post and talk in group chats");
  D("pn.3", "Thả tim, chấm sao và lưu những bài bạn thích", "Like, rate and keep the posts you love");

  /* ---- tiện ích ---- */
  const msg = (id, s, c) => { const e = $(id); if (e) { e.textContent = s || ""; e.className = "fm" + (c ? " " + c : "") + (id.endsWith("Msg") && /^(a|g)Msg$/.test(id) ? " al" : ""); } };
  const fbText = e => t("e." + ((e && e.code) || "other")) === "e." + ((e && e.code) || "other") ? t("e.other") : t("e." + e.code);
  function safeNext(n) {
    try {
      const u = new URL(n || "./", location.href);
      if (u.origin !== location.origin || /\/(login|register)(\.html)?\/?$/.test(u.pathname)) return "./";
      return u.pathname + u.search + u.hash;
    } catch (e) { return "./"; }
  }
  let NEXT = safeNext(new URLSearchParams(location.search).get("next")), working = false, fails = 0, lockUntil = 0, nTimer, nSeq = 0, nameTaken = false;
  const done = () => location.replace(NEXT);
  const busy = on => { working = on; document.body.classList.toggle("loading", on); ["go"].forEach(i => { if ($(i)) $(i).disabled = on; }); if ($("go")) $("go").textContent = on ? t("wait") : t(REG ? "reg.go" : "login.go"); };

  /* ---- kiểm tra dữ liệu (giữ nguyên luật của trang chính) ---- */
  function vName(v) { if (!v) return t("v.name.empty"); if (/\s/.test(v)) return t("v.name.space"); if (v.length < 3) return t("v.name.short"); if (v.length > 24) return t("v.name.long"); if (!/^[\p{L}\p{N}_]+$/u.test(v)) return t("v.name.chars"); return ""; }
  function vGmail(v) {
    if (!v) return t("v.em.empty"); if (/\s/.test(v)) return t("v.em.space"); if (!v.includes("@")) return t("v.em.at");
    const p = v.split("@"); if (p.length > 2) return t("v.em.at2"); if (p[1] !== "gmail.com") return t("v.em.dom");
    if (p[0].length < 6 || p[0].length > 30) return t("v.em.len"); if (!/^[a-z0-9.]+$/.test(p[0])) return t("v.em.chars"); if (/^\.|\.$|\.\./.test(p[0])) return t("v.em.dots"); return "";
  }
  const vEmailLogin = v => !v ? t("v.em.empty") : /\s/.test(v) ? t("v.em.space") : /^[^@]+@[^@]+\.[^@]+$/.test(v) ? "" : t("v.em.at");
  function pwCheck(p) {
    const r = { len: p.length >= 8, up: /\p{Lu}/u.test(p), sp: /[^\p{L}\p{N}\s]/u.test(p), ns: !/\s/.test(p) };
    const extra = [/\p{Ll}/u.test(p), /\d/.test(p), p.length >= 12].filter(Boolean).length;
    let lv = p ? 1 : 0; if (r.len && r.up && r.sp && r.ns) { lv = 2; if (extra === 3) lv = 3; } return { r, lv };
  }
  const pwErr = p => !p ? t("v.pw.empty") : /\s/.test(p) ? t("v.pw.space") : pwCheck(p).lv < 2 ? t("v.pw.weak") : "";

  function onName(force) {
    clearTimeout(nTimer); const v = $("name").value.trim(), e = vName(v);
    if (!v && !force) { msg("nameMsg", ""); return e; }
    if (e) { msg("nameMsg", e, "bad"); return e; }
    msg("nameMsg", t("n.checking")); const s = ++nSeq;
    nTimer = setTimeout(async () => {
      const o = await SkibidiFB.nameOwner(v); if (s !== nSeq) return;
      if (o === undefined) msg("nameMsg", t("n.nocheck")); else { nameTaken = !!o; msg("nameMsg", o ? t("n.taken") : t("n.ok"), o ? "bad" : "ok"); }
    }, 350);
    return "";
  }
  function onEmail(force) {
    const v = $("email").value.trim().toLowerCase(), e = REG ? vGmail(v) : vEmailLogin(v);
    if (!force && !v.includes("@")) { msg("emMsg", ""); return e; }
    msg("emMsg", e || (REG ? t("v.em.ok") : ""), e ? "bad" : "ok"); return e;
  }
  function onPw(force) {
    const p = $("pw").value, e = REG ? pwErr(p) : (p ? "" : t("v.pw.empty"));
    if (REG) {
      const c = pwCheck(p); $("pwBar").className = "sm" + (p ? " l" + c.lv : "");
      msg("pwLbl", p && c.lv ? t("pw.l" + c.lv) : "", ["", "bad", "warn", "ok"][c.lv]);
      $("pwReq").innerHTML = [[c.r.len, "pw.r1"], [c.r.up, "pw.r2"], [c.r.sp, "pw.r3"]].map(([o, k]) => `<span class="${o ? "ok" : ""}">${o ? "✓" : "○"} ${t(k)}</span>`).join("");
      if ($("pw2").value) onPw2();
    }
    msg("pwMsg", force ? e : "", "bad"); return e;
  }
  function onPw2(force) {
    if (!REG) return ""; const a = $("pw").value, b = $("pw2").value; let e = "";
    if (!b) e = force ? t("v.pw.again") : ""; else if (a !== b) e = t("v.pw.diff");
    msg("pw2Msg", e || (b ? t("v.pw.same") : ""), e ? "bad" : b ? "ok" : ""); return e;
  }

  async function submit(ev) {
    ev.preventDefault(); if (working) return;
    const now = Date.now(); if (now < lockUntil) return msg("aMsg", t("locked", Math.ceil((lockUntil - now) / 1000)), "bad");
    const eN = REG ? onName(1) : "", eE = onEmail(1), eP = onPw(1), eP2 = REG ? onPw2(1) : "";
    if (eN || eE || eP || eP2) return msg("aMsg", t("invalid"), "bad");
    if (REG && nameTaken) return msg("aMsg", t("e.nametaken"), "bad");
    msg("aMsg", ""); busy(true);
    const email = $("email").value.trim().toLowerCase(), password = $("pw").value;
    try {
      if (REG) await SkibidiFB.register({ name: $("name").value.trim(), email, password }); else await SkibidiFB.login({ email, password });
      try { localStorage.removeItem("skibidi_google_session"); } catch (e) {}
      return done();
    } catch (e) {
      busy(false);
      if (e.code === "wrong" || e.code === "exists" || e.code === "nametaken") { if (++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; } }
      msg("aMsg", fbText(e), "bad");
      if (["config", "off", "domain", "noload", "timeout", "other", "network"].includes(e.code)) {   /* lỗi từ phía hệ thống: chỉ đường tới trang tự kiểm tra */
        const a = document.createElement("a"); a.href = "check.html"; a.textContent = " " + t("sys.check"); a.style.fontWeight = "600"; $("aMsg").appendChild(a);
      }
    }
  }

  /* ---- khởi động ---- */
  function init() {
    document.querySelectorAll("[data-i]").forEach(e => { e.textContent = t(e.dataset.i); });
    document.querySelectorAll("[data-ph]").forEach(e => { e.placeholder = t(e.dataset.ph); });
    document.title = t(REG ? "reg.title" : "login.title") + " — SKIBIDISCRIPT";
    $("alt").href = (REG ? "login.html" : "register.html") + (NEXT !== "./" ? "?next=" + encodeURIComponent(NEXT) : "");
    $("f").addEventListener("submit", submit);
    $("email").addEventListener("input", () => onEmail()); $("email").addEventListener("blur", () => onEmail(1));
    $("pw").addEventListener("input", () => onPw()); $("pw").addEventListener("blur", () => onPw(1));
    if (REG) {
      $("name").addEventListener("input", () => { nameTaken = false; onName(); }); $("name").addEventListener("blur", () => onName(1));
      $("pw2").addEventListener("input", () => onPw2()); $("pw2").addEventListener("blur", () => onPw2(1)); onPw();
    }
    const EYE = { on: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>', off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.600 6.100A9.800 9.800 0 0 1 12 6c6.400 0 10 6 10 6a17 17 0 0 1-3.200 3.800M6.600 6.600A17 17 0 0 0 2 12s3.600 6 10 6a9.700 9.700 0 0 0 4.200-.9"/></svg>' };
    document.querySelectorAll(".eye").forEach(b => {
      const inp = b.parentElement.querySelector("input"); b.innerHTML = EYE.on; b.setAttribute("aria-label", t("a.showpw"));
      b.addEventListener("click", () => { const s = inp.type === "password"; inp.type = s ? "text" : "password"; b.innerHTML = s ? EYE.off : EYE.on; b.setAttribute("aria-label", t(s ? "a.hidepw" : "a.showpw")); });
    });
    /* đã đăng nhập sẵn => vào thẳng trang chính (không làm gián đoạn lúc đang đăng ký) */
    SkibidiFB.onceUser(u => { if (u && !working) done(); }).catch(e => { if (e.code === "noload" || e.code === "config") msg("aMsg", fbText(e), "bad"); });
  }
  init();
})();
