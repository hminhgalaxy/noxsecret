/* Hồ sơ cá nhân: xem thông tin, đổi tên hiển thị, gửi email đổi mật khẩu, đăng xuất. */
import { esc, toast, fmtTime } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { session, onAuth, updateDisplayName, resendVerification, resetPassword, providerLabel, canChangePassword } from "../lib/auth.js";
import { avatarHTML } from "../lib/ui.js";
import { friendly } from "../lib/messages.js";

const when = s => { const t = s ? new Date(s).getTime() : 0; return t ? fmtTime(t) : "—"; };

export function mount(ctx) {
  ctx.setPage({ title: "Hồ sơ", sub: "Thông tin và bảo mật tài khoản của bạn.", noindex: true });
  let timer = null; ctx.cleanup(() => clearInterval(timer));
  const draw = () => {
    const u = session.user; if (!u) return;
    const name = u.displayName || "", shown = name || (u.email || "").split("@")[0];
    const meta = u.metadata || {};
    ctx.el.innerHTML = `<div class="profile">
      <section class="profile-head"><span class="avatar xl">${avatarHTML(u)}</span>
        <div class="profile-id"><h2>${esc(shown)}</h2><span class="mail">${esc(u.email || "")}</span>
          <div class="tags"><span class="badge${session.isDev ? " strong" : ""}">${ICO.shield}${session.isDev ? "Quản trị viên" : "Thành viên"}</span>
          <span class="badge">${u.emailVerified ? ICO.check + "Email đã xác minh" : "Email chưa xác minh"}</span></div></div>
        ${session.isDev ? `<a class="btn primary" href="/dev">${ICO.shield}Dev Panel</a>` : ""}</section>
      <section class="panel"><h3>Thông tin cá nhân</h3>
        <form id="nameForm" class="form" novalidate><div class="field"><label for="dn">Tên hiển thị</label><input id="dn" name="name" value="${esc(name)}" maxlength="60" autocomplete="name" placeholder="Tên của bạn"><p class="field-error" data-err="name" role="alert"></p></div>
          <div class="form-acts"><button class="btn primary" type="submit" id="saveName">Lưu thay đổi</button></div></form></section>
      <section class="panel"><h3>Tài khoản</h3><dl class="info">
        <div><dt>Email</dt><dd>${esc(u.email || "—")}</dd></div><div><dt>Đăng nhập bằng</dt><dd>${esc(providerLabel(u))}</dd></div>
        <div><dt>Tham gia</dt><dd>${esc(when(meta.creationTime))}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>${esc(when(meta.lastSignInTime))}</dd></div></dl></section>
      <section class="panel"><h3>Bảo mật</h3>
        <p class="muted">${canChangePassword(u) ? "Bạn có thể đổi mật khẩu bằng liên kết gửi qua email." : "Tài khoản của bạn đăng nhập bằng Google nên không cần mật khẩu riêng."}</p>
        <div class="acts">${canChangePassword(u) ? `<button class="btn ghost" id="pwMail" type="button">${ICO.mail}Gửi email đổi mật khẩu</button>` : ""}
          ${!u.emailVerified ? `<button class="btn ghost" id="vMail" type="button">${ICO.check}Gửi lại email xác minh</button>` : ""}
          <button class="btn ghost" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div></section></div>`;
    const f = ctx.el.querySelector("#nameForm"), b = f.querySelector("#saveName");
    f.addEventListener("submit", async e => {
      e.preventDefault(); const v = f.name.value.trim().replace(/\s+/g, " "), er = f.querySelector('[data-err="name"]'); er.textContent = "";
      if (v.length < 2) { er.textContent = "Tên cần có ít nhất 2 ký tự."; return; }
      if (v === name) { toast("Tên hiển thị chưa thay đổi."); return; }
      b.classList.add("busy");
      try { await updateDisplayName(v); toast("Đã cập nhật hồ sơ."); } catch (x) { er.textContent = friendly(x); b.classList.remove("busy"); }
    });
    const cool = (btn, ms = 30000) => { btn.disabled = true; const label = btn.innerHTML; let left = ms / 1000; btn.textContent = "Gửi lại sau " + left + "s";
      clearInterval(timer); timer = setInterval(() => { btn.textContent = "Gửi lại sau " + (--left) + "s"; if (left <= 0) { clearInterval(timer); btn.innerHTML = label; btn.disabled = false; } }, 1000); };
    const pw = ctx.el.querySelector("#pwMail"); if (pw) pw.addEventListener("click", () => resetPassword(u.email).then(() => { toast("Đã gửi email đổi mật khẩu. Hãy kiểm tra hộp thư."); cool(pw); }).catch(x => toast(friendly(x), "err")));
    const vm = ctx.el.querySelector("#vMail"); if (vm) vm.addEventListener("click", () => resendVerification().then(() => { toast("Đã gửi email xác minh. Hãy kiểm tra hộp thư."); cool(vm); }).catch(x => toast(friendly(x), "err")));
  };
  draw(); return onAuth(draw);
}
