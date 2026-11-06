/* Đăng nhập: email + mật khẩu hoặc Google, có captcha Cloudflare. */
import { toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { signInEmail } from "../../lib/auth.js";
import { dlog } from "../../lib/log.js";
import { authMessage } from "../../lib/messages.js";
import { emailError, EMAIL_EXAMPLE, nextOf, withNext, shell, field, pwField, wireEyes, setErr, busy, captchaHTML, googleHTML, setupSecurity } from "./shared.js";

export function mount(ctx) {
  ctx.setPage({ hero: true, title: "Đăng nhập", desc: "Đăng nhập để dùng đầy đủ tính năng của SKIBIDI SCRIPT WEB." });
  const n = nextOf(ctx);
  ctx.el.innerHTML = shell("Chào mừng trở lại", "Đăng nhập để tiếp tục.", `${n ? `<p class="auth-note">Bạn cần đăng nhập để xem trang này.</p>` : ""}
    <form id="f" novalidate class="form">
      ${field("email", "Email", { type: "email", ac: "username", ph: EMAIL_EXAMPLE })}
      ${pwField("password", "Mật khẩu", "current-password")}
      <a class="alink" href="${withNext("/forgot-password", ctx)}">Quên mật khẩu?</a>
      ${captchaHTML}
      <p class="form-error" id="err" role="alert" aria-live="polite"></p>
      <button class="btn primary lg block" type="submit">Đăng nhập</button>
    </form>${googleHTML}
    <p class="auth-foot">Chưa có tài khoản? <a href="${withNext("/register", ctx)}">Đăng ký ngay</a></p>`);
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), btn = f.querySelector("button[type=submit]");
  wireEyes(ctx.el);
  const sec = setupSecurity(ctx, err, { onGoogleDone: () => toast("Đăng nhập thành công.") });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; const errs = {};
    const email = f.email.value.trim(), pass = f.password.value;
    const em = emailError(email); if (em) errs.email = em;
    if (!pass) errs.password = "Vui lòng nhập mật khẩu.";
    setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    if (!(await sec.check())) { busy(btn, false); return; }
    try { await signInEmail(email, pass); toast("Đăng nhập thành công."); /* trang tự chuyển về nơi bạn cần khi phiên đăng nhập sẵn sàng */ }
    catch (ex) { dlog("er", "Login: " + (ex.code || ex.message)); err.textContent = authMessage(ex); sec.cap.reset(); busy(btn, false); }
  });
}
