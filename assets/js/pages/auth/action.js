/* Trang xử lý liên kết trong email: đặt lại mật khẩu, xác minh email, xác nhận đổi email.
   Liên kết có dạng /auth/action?mode=...&oobCode=... (do máy chủ tạo từ mã của Firebase). */
import { auth } from "../../lib/firebase.js";
import { refreshSession } from "../../lib/auth.js";
import { authMessage } from "../../lib/messages.js";
import { esc } from "../../lib/util.js";
import { shell, pwField, wireEyes, setErr, busy } from "./shared.js";
import { ICO } from "../../lib/icons.js";

const rules = p => ({ len: p.length >= 8, letter: /[A-Za-zÀ-ỹ]/.test(p), digit: /\d/.test(p) });
const done = (ctx, title, sub, links) => { ctx.el.innerHTML = shell(title, sub, `<div class="act-links">${links}</div>`); };
const bad = (ctx, e) => done(ctx, "Liên kết không dùng được", authMessage(e), `<a class="btn primary lg block" href="/forgot-password">Yêu cầu liên kết mới</a><a class="btn ghost block" href="/login">Về trang đăng nhập</a>`);

export async function mount(ctx) {
  ctx.setPage({ hero: true, title: "Xác nhận từ email", noindex: true });
  const mode = ctx.query.get("mode") || "", code = ctx.query.get("oobCode") || "";
  ctx.el.innerHTML = shell("Đang xử lý…", "Vui lòng chờ trong giây lát.", `<div class="act-wait" aria-hidden="true"></div>`);
  if (!auth || !code || !/^(resetPassword|verifyEmail|verifyAndChangeEmail|recoverEmail)$/.test(mode)) return bad(ctx, { code: "auth/invalid-action-code" });
  try {
    if (mode === "resetPassword") {
      const email = await auth.verifyPasswordResetCode(code);
      ctx.el.innerHTML = shell("Đặt mật khẩu mới", "Tạo mật khẩu mới cho " + email + ".", `<form id="f" novalidate class="form">${pwField("password", "Mật khẩu mới", "new-password")}${pwField("confirm", "Nhập lại mật khẩu", "new-password")}
        <ul class="rules" id="rules"><li data-r="len">Ít nhất 8 ký tự</li><li data-r="letter">Có chữ cái</li><li data-r="digit">Có chữ số</li></ul>
        <p class="form-error" id="err" role="alert" aria-live="polite"></p><button class="btn primary lg block" type="submit">Lưu mật khẩu mới</button></form>`);
      wireEyes(ctx.el);
      const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), btn = f.querySelector("button[type=submit]");
      f.password.addEventListener("input", () => { const r = rules(f.password.value); ctx.el.querySelectorAll("#rules li").forEach(li => li.classList.toggle("ok", !!r[li.dataset.r])); });
      f.addEventListener("submit", async e => {
        e.preventDefault(); err.textContent = ""; const p = f.password.value, errs = {}, r = rules(p);
        if (!(r.len && r.letter && r.digit)) errs.password = "Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số."; if (f.confirm.value !== p) errs.confirm = "Mật khẩu nhập lại chưa khớp.";
        setErr(f, errs); if (Object.keys(errs).length) return; busy(btn, true);
        try { await auth.confirmPasswordReset(code, p); done(ctx, "Đã đổi mật khẩu", "Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.", `<a class="btn primary lg block" href="/login">Đăng nhập</a>`); }
        catch (ex) { if (/expired|invalid/.test(ex.code || "")) return bad(ctx, ex); err.textContent = authMessage(ex); busy(btn, false); }
      });
    } else if (mode === "verifyEmail") {
      await auth.applyActionCode(code);
      try { if (auth.currentUser) { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); await refreshSession(); } } catch (_) {}
      done(ctx, "Email đã được xác minh", "Cảm ơn bạn! Tài khoản của bạn đã sẵn sàng.", `<a class="btn primary lg block" href="/">Về trang chủ</a>`);
    } else if (mode === "verifyAndChangeEmail") {
      await auth.applyActionCode(code);
      try { await auth.signOut(); } catch (_) {}
      done(ctx, "Đã đổi email", "Email đăng nhập của bạn đã được cập nhật. Hãy đăng nhập lại bằng email mới.", `<a class="btn primary lg block" href="/login">Đăng nhập</a>`);
    } else {
      await auth.applyActionCode(code);
      done(ctx, "Đã khôi phục email cũ", "Email đăng nhập của bạn đã được đổi lại. Nếu bạn không yêu cầu thay đổi, hãy đặt lại mật khẩu ngay.", `<a class="btn primary lg block" href="/forgot-password">Đặt lại mật khẩu</a><a class="btn ghost block" href="/login">Đăng nhập</a>`);
    }
  } catch (e) { bad(ctx, e); }
}
