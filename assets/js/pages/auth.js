import { esc, safeNext, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { signInEmail, signUpEmail, resetPassword, authErrMsg, renderGoogleButton } from "../lib/auth.js";
import { dlog } from "../lib/log.js";
import { mountCaptcha, verifyCaptcha } from "../lib/captcha.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const next = ctx => safeNext(ctx.query.get("next"));
const withNext = (p, ctx) => { const n = next(ctx); return n ? p + "?next=" + encodeURIComponent(n) : p; };
const shell = (title, body) => `<div class="authwrap"><div class="authcard"><div class="authlogo" aria-hidden="true">${ICO.key}</div><h2>${esc(title)}</h2>${body}</div></div>`;
const pw = (id, label, ac) => `<div class="fld"><label for="${id}">${label}</label><div class="pw"><input id="${id}" name="${id}" type="password" autocomplete="${ac}" required><button class="eye" type="button" data-eye="${id}" aria-label="Hiện/ẩn mật khẩu">${ICO.eye}</button></div><p class="ferr" data-err="${id}" role="alert"></p></div>`;
function wireEyes(root) { root.querySelectorAll("[data-eye]").forEach(b => b.addEventListener("click", () => { const i = root.querySelector("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; })); }
function setErr(form, errs) {
  form.querySelectorAll(".ferr").forEach(e => { e.textContent = ""; });
  Object.keys(errs).forEach(k => { const e = form.querySelector(`[data-err="${k}"]`); if (e) e.textContent = errs[k]; });
  const f = Object.keys(errs)[0]; if (f && form.elements[f]) form.elements[f].focus();
}
function busy(btn, on, txt) { btn.disabled = on; btn.querySelector("span").textContent = on ? "Đang xử lý…" : txt; }

export function login(ctx) {
  ctx.setPage({ hero: true, title: null }); document.title = "Đăng nhập · SKIBIDI SCRIPT WEB";
  const n = next(ctx);
  ctx.el.innerHTML = shell("Đăng nhập", `${n ? `<p class="hint">Bạn cần đăng nhập để tiếp tục tới <code>${esc(n)}</code>.</p>` : ""}
    <form id="f" novalidate class="stack">
      <div class="fld"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required><p class="ferr" data-err="email" role="alert"></p></div>
      ${pw("password", "Mật khẩu", "current-password")}
      <div class="captcha-wrap"><div id="captcha"></div></div>
      <p class="form-err" id="err" role="alert" aria-live="polite"></p>
      <button class="btn btn-p btn-wide" type="submit" style="--cat:var(--accent-primary)">${ICO.key}<span>Đăng nhập</span></button>
      <a class="alink" href="${withNext("/forgot-password", ctx)}">Quên mật khẩu?</a>
    </form><div class="divider">HOẶC</div><div class="gwrap" id="g"></div>
    <p class="gnote">Chưa có tài khoản? <a href="${withNext("/register", ctx)}">Đăng ký</a></p>`);
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), btn = f.querySelector("button[type=submit]");
  wireEyes(ctx.el); const captcha = ctx.el.querySelector("#captcha"); mountCaptcha(captcha, "login");
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; const errs = {};
    const email = f.email.value.trim(), pass = f.password.value;
    if (!email) errs.email = "Vui lòng nhập email."; else if (!EMAIL_RE.test(email)) errs.email = "Email không hợp lệ.";
    if (!pass) errs.password = "Vui lòng nhập mật khẩu.";
    setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    try { await verifyCaptcha(captcha, "login"); await signInEmail(email, pass); toast("Đăng nhập thành công."); /* router tự chuyển về trang đích khi phiên đăng nhập sẵn sàng */ }
    catch (ex) { dlog("er", "Login: " + (ex.code || ex.message)); err.textContent = ex.code === "app/no-sdk" ? ex.message : (ex.message && !ex.code ? ex.message : authErrMsg(ex)); busy(btn, false, "Đăng nhập"); }
  });
  renderGoogleButton(ctx.el.querySelector("#g"), { beforeSignIn: () => verifyCaptcha(captcha, "login"), onDone: () => toast("Đăng nhập Google thành công."), onError: m => { err.textContent = m; } });
}
export function register(ctx) {
  ctx.setPage({ hero: true, title: null }); document.title = "Đăng ký · SKIBIDI SCRIPT WEB";
  ctx.el.innerHTML = shell("Đăng ký", `<form id="f" novalidate class="stack">
      <div class="fld"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required><p class="ferr" data-err="email" role="alert"></p></div>
      ${pw("password", "Mật khẩu", "new-password")}${pw("confirm", "Nhập lại mật khẩu", "new-password")}
      <div class="captcha-wrap"><div id="captcha"></div></div>
      <p class="form-err" id="err" role="alert" aria-live="polite"></p>
      <button class="btn btn-p btn-wide" type="submit" style="--cat:var(--accent-primary)">${ICO.plus}<span>Tạo tài khoản</span></button>
    </form><div class="divider">HOẶC</div><div class="gwrap" id="g"></div>
    <p class="gnote">Đã có tài khoản? <a href="${withNext("/login", ctx)}">Đăng nhập</a></p>`);
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), btn = f.querySelector("button[type=submit]");
  wireEyes(ctx.el); const captcha = ctx.el.querySelector("#captcha"); mountCaptcha(captcha, "signup");
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; const errs = {};
    const email = f.email.value.trim(), p = f.password.value, c = f.confirm.value;
    if (!EMAIL_RE.test(email)) errs.email = "Email không hợp lệ.";
    if (p.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự.";
    if (c !== p) errs.confirm = "Mật khẩu nhập lại không khớp.";
    setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    try { await verifyCaptcha(captcha, "signup"); await signUpEmail(email, p); toast("Đăng ký thành công. Hãy kiểm tra email để xác minh."); }
    catch (ex) { dlog("er", "Register: " + (ex.code || ex.message)); err.textContent = ex.code === "app/no-sdk" ? ex.message : (ex.message && !ex.code ? ex.message : authErrMsg(ex)); busy(btn, false, "Tạo tài khoản"); }
  });
  renderGoogleButton(ctx.el.querySelector("#g"), { beforeSignIn: () => verifyCaptcha(captcha, "signup"), onDone: () => toast("Đăng nhập Google thành công."), onError: m => { err.textContent = m; } });
}
export function forgot(ctx) {
  ctx.setPage({ hero: true, title: null }); document.title = "Quên mật khẩu · SKIBIDI SCRIPT WEB";
  ctx.el.innerHTML = shell("Quên mật khẩu", `<p class="hint">Nhập email đã đăng ký, hệ thống sẽ gửi liên kết đặt lại mật khẩu.</p>
    <form id="f" novalidate class="stack"><div class="fld"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required><p class="ferr" data-err="email" role="alert"></p></div>
      <p class="form-err" id="err" role="alert" aria-live="polite"></p><p class="okmsg" id="ok" role="status"></p>
      <button class="btn btn-p btn-wide" type="submit" style="--cat:var(--accent-primary)">${ICO.key}<span>Gửi liên kết</span></button></form>
    <p class="gnote"><a href="${withNext("/login", ctx)}">← Quay lại đăng nhập</a></p>`);
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), ok = ctx.el.querySelector("#ok"), btn = f.querySelector("button[type=submit]");
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; ok.textContent = ""; const email = f.email.value.trim(), errs = {};
    if (!EMAIL_RE.test(email)) errs.email = "Email không hợp lệ."; setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    try { await resetPassword(email); ok.textContent = "Đã gửi (nếu email tồn tại). Hãy kiểm tra hộp thư, kể cả thư rác."; }
    catch (ex) { err.textContent = ex.code === "app/no-sdk" ? ex.message : (ex.message && !ex.code ? ex.message : authErrMsg(ex)); }
    busy(btn, false, "Gửi liên kết");
  });
}
