/* Đăng ký: họ tên, email, mật khẩu (có thanh đo độ mạnh), captcha Cloudflare. */
import { toast } from "../../lib/util.js";
import { signUpEmail } from "../../lib/auth.js";
import { dlog } from "../../lib/log.js";
import { authMessage } from "../../lib/messages.js";
import { emailError, EMAIL_EXAMPLE, withNext, shell, field, pwField, wireEyes, setErr, busy, captchaHTML, googleHTML, setupSecurity, guestHTML, wireGuest } from "./shared.js";

const rules = p => ({ len: p.length >= 8, letter: /[A-Za-zÀ-ỹ]/.test(p), digit: /\d/.test(p) });
const score = p => { const r = rules(p); if (!p) return 0; let s = 0; if (r.len) s++; if (r.letter && r.digit) s++; if (p.length >= 12) s++; if (/[^A-Za-z0-9]/.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))) s++; return Math.max(1, s); };
const LABEL = ["", "Còn yếu", "Tạm được", "Khá tốt", "Rất mạnh"];

export function mount(ctx) {
  ctx.setPage({ hero: true, title: "Đăng ký", desc: "Tạo tài khoản miễn phí trên SKIBIDI SCRIPT WEB." });
  ctx.el.innerHTML = shell("Tạo tài khoản", "Chỉ mất chưa đầy một phút.", `<form id="f" novalidate class="form">
      ${field("name", "Họ và tên", { ac: "name", ph: "Nguyễn Văn A" })}
      ${field("email", "Email", { type: "email", ac: "username", ph: EMAIL_EXAMPLE })}
      <div class="field"><label for="password">Mật khẩu</label><div class="pw"><input id="password" name="password" type="password" autocomplete="new-password" required><button class="eye" type="button" data-eye="password" aria-label="Hiện hoặc ẩn mật khẩu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
        <div class="meter" id="meter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="meter-label" id="meterL"></span>
        <ul class="rules" id="rules"><li data-r="len">Ít nhất 8 ký tự</li><li data-r="letter">Có chữ cái</li><li data-r="digit">Có chữ số</li></ul>
        <p class="field-error" data-err="password" role="alert"></p></div>
      ${pwField("confirm", "Nhập lại mật khẩu", "new-password")}
      ${captchaHTML}
      <p class="form-error" id="err" role="alert" aria-live="polite"></p>
      <button class="btn primary lg block" type="submit">Tạo tài khoản</button>
    </form>${googleHTML}${guestHTML}
    <p class="auth-foot">Đã có tài khoản? <a href="${withNext("/login", ctx)}">Đăng nhập</a></p>`, true);
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), btn = f.querySelector("button[type=submit]");
  wireEyes(ctx.el);
  const meter = ctx.el.querySelector("#meter"), ml = ctx.el.querySelector("#meterL");
  f.password.addEventListener("input", () => {
    const p = f.password.value, r = rules(p), s = score(p);
    meter.dataset.s = s; ml.textContent = LABEL[s];
    ctx.el.querySelectorAll("#rules li").forEach(li => li.classList.toggle("ok", !!r[li.dataset.r]));
  });
  const sec = setupSecurity(ctx, err, { onGoogleDone: () => toast("Đăng nhập thành công.") });
  wireGuest(ctx, err, () => toast("Đã vào với tư cách khách."));
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; const errs = {};
    const name = f.name.value.trim().replace(/\s+/g, " "), email = f.email.value.trim(), p = f.password.value, c = f.confirm.value, r = rules(p);
    if (name.length < 2) errs.name = "Vui lòng nhập họ và tên (ít nhất 2 ký tự)."; else if (name.length > 60) errs.name = "Tên tối đa 60 ký tự.";
    const em = emailError(email); if (em) errs.email = em;
    if (!(r.len && r.letter && r.digit)) errs.password = "Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số.";
    if (c !== p) errs.confirm = "Mật khẩu nhập lại chưa khớp.";
    setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    if (!(await sec.check())) { busy(btn, false); return; }
    try { await signUpEmail(email, p, name); toast("Tạo tài khoản thành công! Hãy kiểm tra email để xác minh."); }
    catch (ex) { dlog("er", "Register: " + (ex.code || ex.message)); err.textContent = authMessage(ex); sec.cap.reset(); busy(btn, false); }
  });
}
