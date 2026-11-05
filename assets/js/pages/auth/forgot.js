/* Quên mật khẩu: gửi liên kết đặt lại qua email. Không tiết lộ email có tồn tại hay không. */
import { resetPassword } from "../../lib/auth.js";
import { authMessage } from "../../lib/messages.js";
import { EMAIL_RE, withNext, shell, field, setErr, busy } from "./shared.js";

export function mount(ctx) {
  ctx.setPage({ hero: true, title: "Quên mật khẩu", desc: "Đặt lại mật khẩu tài khoản của bạn." });
  ctx.el.innerHTML = shell("Quên mật khẩu?", "Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.", `<form id="f" novalidate class="form">
      ${field("email", "Email", { type: "email", ac: "username", ph: "ban@email.com" })}
      <p class="form-error" id="err" role="alert" aria-live="polite"></p><p class="form-ok" id="ok" role="status"></p>
      <button class="btn primary lg block" type="submit">Gửi liên kết đặt lại</button></form>
    <p class="auth-foot"><a href="${withNext("/login", ctx)}">← Quay lại đăng nhập</a></p>`);
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), ok = ctx.el.querySelector("#ok"), btn = f.querySelector("button[type=submit]");
  let timer = null; ctx.cleanup(() => clearInterval(timer));
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; ok.textContent = ""; const email = f.email.value.trim(), errs = {};
    if (!EMAIL_RE.test(email)) errs.email = "Email không hợp lệ."; setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    try {
      await resetPassword(email); ok.textContent = "Nếu email này đã đăng ký, bạn sẽ nhận được thư hướng dẫn trong giây lát. Hãy kiểm tra cả mục thư rác.";
      let left = 30; btn.disabled = true; const label = btn.textContent; btn.classList.remove("busy");
      timer = setInterval(() => { btn.textContent = "Gửi lại sau " + (--left) + "s"; if (left <= 0) { clearInterval(timer); btn.textContent = label; btn.disabled = false; } }, 1000);
      btn.textContent = "Gửi lại sau " + left + "s";
    } catch (ex) { err.textContent = authMessage(ex); busy(btn, false); }
  });
}
