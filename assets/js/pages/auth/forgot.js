/* Quên mật khẩu. Khi máy chủ thư đã bật: nhập email → nhận MÃ 6 số → nhập mã + mật khẩu mới (không dùng liên kết).
   Chưa bật máy chủ thư: quay về thư liên kết mặc định của Firebase. Không tiết lộ email có tồn tại hay không. */
import { resetPassword, resetConfirm, recoverByRecoveryEmail } from "../../lib/auth.js";
import { serverReady } from "../../lib/account.js";
import { authMessage } from "../../lib/messages.js";
import { toast } from "../../lib/util.js";
import { navigate } from "../../lib/router.js";
import { emailError, EMAIL_EXAMPLE, withNext, shell, field, pwField, wireEyes, setErr, busy } from "./shared.js";

const rules = p => ({ len: p.length >= 8, letter: /[A-Za-z]/.test(p), digit: /\d/.test(p) });

export async function mount(ctx) {
  ctx.setPage({ hero: true, title: "Quên mật khẩu", desc: "Đặt lại mật khẩu tài khoản của bạn." });
  const byCode = await serverReady(); if (!ctx.isCurrent()) return;
  ctx.el.innerHTML = shell("Quên mật khẩu?", byCode ? "Nhập email của bạn, chúng tôi sẽ gửi một mã gồm 6 chữ số để đặt lại mật khẩu." : "Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.", `<form id="f" novalidate class="form">
      ${field("email", "Email", { type: "email", ac: "username", ph: EMAIL_EXAMPLE })}
      <p class="form-error" id="err" role="alert" aria-live="polite"></p><p class="form-ok" id="ok" role="status"></p>
      <button class="btn primary lg block" type="submit">${byCode ? "Gửi mã đặt lại" : "Gửi liên kết đặt lại"}</button></form>
    ${byCode ? `<p class="sub-note rec-note">Không vào được hộp thư này nữa? Nhập email đăng nhập ở trên rồi <button class="linkbtn" id="recover" type="button">dùng email khôi phục</button> (nếu bạn đã thêm).</p>` : ""}
    <p class="auth-foot"><a href="${withNext("/login", ctx)}">← Quay lại đăng nhập</a></p>`);
  const card = ctx.el.querySelector(".auth-card");
  const f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), ok = ctx.el.querySelector("#ok"), btn = f.querySelector("button[type=submit]");
  let timer = null, sentVia = "mail"; ctx.cleanup(() => clearInterval(timer));
  const cool = () => { let left = 30; btn.disabled = true; const label = btn.textContent; btn.classList.remove("busy"); btn.textContent = "Gửi lại sau " + left + "s"; clearInterval(timer); timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); btn.textContent = label; btn.disabled = false; } else btn.textContent = "Gửi lại sau " + left + "s"; }, 1000); };

  /* Bước 2 (chỉ khi dùng mã): mã + mật khẩu mới */
  const stepCode = email => {
    clearInterval(timer);
    card.querySelector("h1").textContent = "Nhập mã xác nhận";
    card.querySelector(".auth-sub").textContent = "Nếu có tài khoản với email này, chúng tôi đã gửi mã gồm 6 chữ số " + (sentVia === "recovery" ? "tới email khôi phục của tài khoản." : "tới hộp thư của bạn.");
    const body = card.querySelector("#f").parentElement;
    card.querySelector("#f").outerHTML = `<form id="f2" novalidate class="form">
      <div class="field"><label for="code">Mã xác nhận</label><input id="code" name="code" class="code-in" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000"><p class="field-error" data-err="code" role="alert"></p></div>
      ${pwField("password", "Mật khẩu mới", "new-password")}${pwField("confirm", "Nhập lại mật khẩu", "new-password")}
      <ul class="rules" id="rules"><li data-r="len">Ít nhất 8 ký tự</li><li data-r="letter">Có chữ cái</li><li data-r="digit">Có chữ số</li></ul>
      <p class="form-error" id="err2" role="alert" aria-live="polite"></p>
      <button class="btn primary lg block" type="submit">Lưu mật khẩu mới</button></form>
      <p class="sub-note">Mã có hiệu lực trong 10 phút. Kiểm tra cả mục thư rác.</p>
      <p class="tf-links"><button class="linkbtn" id="again" type="button">Gửi lại mã</button></p>`;
    const rec = card.querySelector(".rec-note"); if (rec) rec.remove();
    wireEyes(card); const f2 = card.querySelector("#f2"), e2 = card.querySelector("#err2"), b2 = f2.querySelector("button[type=submit]"), again = card.querySelector("#again");
    f2.password.addEventListener("input", () => { const r = rules(f2.password.value); card.querySelectorAll("#rules li").forEach(li => li.classList.toggle("ok", !!r[li.dataset.r])); });
    const coolAgain = () => { let left = 30; again.disabled = true; again.textContent = "Gửi lại sau " + left + "s"; clearInterval(timer); timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); again.disabled = false; again.textContent = "Gửi lại mã"; } else again.textContent = "Gửi lại sau " + left + "s"; }, 1000); }; coolAgain();
    again.addEventListener("click", async () => { e2.textContent = ""; try { await (sentVia === "recovery" ? recoverByRecoveryEmail(email) : resetPassword(email)); toast("Đã gửi mã mới."); } catch (ex) { e2.textContent = authMessage(ex); } coolAgain(); });
    f2.addEventListener("submit", async e => {
      e.preventDefault(); e2.textContent = ""; const code = f2.code.value.replace(/\s+/g, ""), p = f2.password.value, errs = {}, r = rules(p);
      if (!/^\d{6}$/.test(code)) errs.code = "Nhập mã gồm 6 chữ số."; if (!(r.len && r.letter && r.digit)) errs.password = "Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số."; if (f2.confirm.value !== p) errs.confirm = "Mật khẩu nhập lại chưa khớp.";
      setErr(f2, errs); if (Object.keys(errs).length) return; busy(b2, true);
      try { await resetConfirm(email, code, p); toast("Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới."); navigate(withNext("/login", ctx), { replace: true }); }
      catch (ex) { e2.textContent = authMessage(ex); busy(b2, false); }
    });
    f2.code.focus();
  };

  const rec = ctx.el.querySelector("#recover");
  if (rec) rec.addEventListener("click", async () => {
    err.textContent = ""; ok.textContent = ""; const email = f.email.value.trim(), em = emailError(email); if (em) { setErr(f, { email: em }); return; } setErr(f, {});
    rec.disabled = true;
    try { await recoverByRecoveryEmail(email); sentVia = "recovery"; stepCode(email); }
    catch (ex) { err.textContent = authMessage(ex); setTimeout(() => { rec.disabled = false; }, 15000); }
  });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; ok.textContent = ""; const email = f.email.value.trim(), errs = {};
    const em = emailError(email); if (em) errs.email = em; setErr(f, errs); if (Object.keys(errs).length) return;
    busy(btn, true);
    try {
      await resetPassword(email);
      if (byCode) { sentVia = "mail"; stepCode(email); return; }
      ok.textContent = "Nếu email này đã đăng ký, bạn sẽ nhận được thư hướng dẫn trong giây lát. Hãy kiểm tra cả mục thư rác."; cool();
    } catch (ex) { err.textContent = authMessage(ex); busy(btn, false); }
  });
}
