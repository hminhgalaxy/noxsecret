/* Hồ sơ cá nhân: ảnh đại diện, mô tả bản thân, tên hiển thị, bảo mật, đăng xuất. Khách (ẩn danh) chỉ thấy bản hạn chế. */
import { esc, toast, fmtTime } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { session, onAuth, updateDisplayName, resendVerification, resetPassword, providerLabel, canChangePassword, saveProfileFields, muteInfo, isEditor } from "../lib/auth.js";
import { avatarHTML } from "../lib/ui.js";
import { friendly } from "../lib/messages.js";
import { fileToAvatar } from "../lib/avatar.js";
import { confirmDialog } from "../lib/confirm.js";

const when = s => { const t = s ? new Date(s).getTime() : 0; return t ? fmtTime(t) : "—"; };
const BIO_MAX = 300;

export function mount(ctx) {
  ctx.setPage({ title: "Hồ sơ", sub: "Thông tin và bảo mật tài khoản của bạn.", noindex: true });
  let timer = null, sig = ""; ctx.cleanup(() => clearInterval(timer));
  const sigOf = () => { const u = session.user, p = session.profile || {}, m = muteInfo(); return [u && u.uid, u && u.displayName, u && u.emailVerified, session.isGuest, session.isDev, isEditor(), p.bio, (p.avatar || "").length, m && m.until].join("|"); };
  const drawGuest = () => {
    ctx.el.innerHTML = `<div class="profile">
      <section class="profile-head"><span class="avatar xl">${ICO.user}</span>
        <div class="profile-id"><h2>Khách</h2><span class="mail">Bạn đang dùng web với tư cách khách.</span>
          <div class="tags"><span class="badge">${ICO.user}Khách</span></div></div></section>
      <section class="panel"><h3>Tài khoản khách bị hạn chế</h3>
        <p class="muted">Khách có thể xem và sao chép nội dung, nhưng không có hồ sơ riêng: không đổi được ảnh đại diện, mô tả bản thân hay tên hiển thị, và không được tính là người dùng. Tạo tài khoản miễn phí để dùng đầy đủ.</p>
        <div class="acts"><a class="btn primary" href="/register">Tạo tài khoản</a><a class="btn ghost" href="/login">Đăng nhập</a><button class="btn ghost" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div></section></div>`;
  };
  const draw = () => {
    const u = session.user; if (!u) return;
    sig = sigOf(); if (session.isGuest) return drawGuest();
    const name = u.displayName || "", shown = name || (u.email || "").split("@")[0], meta = u.metadata || {}, prof = session.profile || {}, mute = muteInfo();
    const role = session.isDev ? "Quản trị viên" : session.isEditor ? "Biên tập viên" : "Thành viên", dis = mute ? "disabled" : "";
    ctx.el.innerHTML = `<div class="profile">
      <section class="profile-head"><span class="avatar xl">${avatarHTML(u)}</span>
        <div class="profile-id"><h2>${esc(shown)}</h2><span class="mail">${esc(u.email || "")}</span>
          ${prof.bio ? `<p class="bio" translate="no">${esc(prof.bio)}</p>` : ""}
          <div class="tags"><span class="badge${session.isDev ? " strong" : ""}">${ICO.shield}${role}</span>
          <span class="badge">${u.emailVerified ? ICO.check + "Email đã xác minh" : "Email chưa xác minh"}</span>${mute ? `<span class="badge warn">Đang bị mute</span>` : ""}</div></div>
        ${session.isDev ? `<a class="btn primary" href="/dev">${ICO.shield}Dev Panel</a>` : ""}</section>
      ${mute ? `<section class="panel notice-mute" role="status"><h3>Bạn đang bị mute</h3><p class="muted">Bạn chưa thể đổi ảnh, mô tả hoặc tên cho tới ${esc(fmtTime(mute.until))}.${mute.reason ? " Lý do: " + esc(mute.reason) : ""}</p></section>` : ""}
      <section class="panel"><h3>Ảnh đại diện</h3>
        <div class="av-row"><span class="avatar xl">${avatarHTML(u)}</span>
          <div class="acts"><button class="btn ghost" id="avPick" type="button" ${dis}>${ICO.paint}Đổi ảnh</button>${prof.avatar ? `<button class="btn ghost" id="avDel" type="button" ${dis}>${ICO.trash}Xóa ảnh</button>` : ""}</div>
          <input type="file" id="avFile" accept="image/jpeg,image/png,image/webp" hidden></div>
        <p class="sub-note">Ảnh sẽ được cắt vuông và thu nhỏ tự động.</p><p class="field-error" id="avErr" role="alert"></p></section>
      <section class="panel"><h3>Giới thiệu bản thân</h3>
        <form id="bioForm" class="form" novalidate><div class="field"><label for="bio">Mô tả</label><textarea id="bio" name="bio" rows="4" maxlength="${BIO_MAX}" placeholder="Bạn muốn nói gì về mình?" ${dis}>${esc(prof.bio || "")}</textarea>
          <div class="cnt-row"><p class="field-error" data-err="bio" role="alert"></p><span class="sub-note" id="bioN" translate="no">${(prof.bio || "").length}/${BIO_MAX}</span></div></div>
          <div class="form-acts"><button class="btn primary" type="submit" id="saveBio" ${dis}>Lưu mô tả</button></div></form></section>
      <section class="panel"><h3>Thông tin cá nhân</h3>
        <form id="nameForm" class="form" novalidate><div class="field"><label for="dn">Tên hiển thị</label><input id="dn" name="name" value="${esc(name)}" maxlength="60" autocomplete="name" placeholder="Tên của bạn" ${dis}><p class="field-error" data-err="name" role="alert"></p></div>
          <div class="form-acts"><button class="btn primary" type="submit" id="saveName" ${dis}>Lưu thay đổi</button></div></form></section>
      <section class="panel"><h3>Tài khoản</h3><dl class="info">
        <div><dt>Email</dt><dd>${esc(u.email || "—")}</dd></div><div><dt>Đăng nhập bằng</dt><dd>${esc(providerLabel(u))}</dd></div>
        <div><dt>Tham gia</dt><dd>${esc(when(meta.creationTime))}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>${esc(when(meta.lastSignInTime))}</dd></div></dl></section>
      <section class="panel"><h3>Bảo mật</h3>
        <p class="muted">${canChangePassword(u) ? "Bạn có thể đổi mật khẩu bằng liên kết gửi qua email." : "Tài khoản của bạn đăng nhập bằng Google nên không cần mật khẩu riêng."}</p>
        <div class="acts">${canChangePassword(u) ? `<button class="btn ghost" id="pwMail" type="button">${ICO.mail}Gửi email đổi mật khẩu</button>` : ""}
          ${!u.emailVerified ? `<button class="btn ghost" id="vMail" type="button">${ICO.check}Gửi lại email xác minh</button>` : ""}
          <button class="btn ghost" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div></section></div>`;
    const $q = x => ctx.el.querySelector(x);
    /* Tên hiển thị */
    const f = $q("#nameForm"), b = f.querySelector("#saveName");
    f.addEventListener("submit", async e => {
      e.preventDefault(); const v = f.name.value.trim().replace(/\s+/g, " "), er = f.querySelector('[data-err="name"]'); er.textContent = "";
      if (v.length < 2) { er.textContent = "Tên cần có ít nhất 2 ký tự."; return; }
      if (v === name) { toast("Tên hiển thị chưa thay đổi."); return; }
      b.classList.add("busy");
      try { await updateDisplayName(v); toast("Đã cập nhật hồ sơ."); } catch (x) { er.textContent = friendly(x); b.classList.remove("busy"); }
    });
    /* Mô tả */
    const bf = $q("#bioForm"), bio = bf.bio, bn = $q("#bioN");
    bio.addEventListener("input", () => { bn.textContent = bio.value.length + "/" + BIO_MAX; });
    bf.addEventListener("submit", async e => {
      e.preventDefault(); const v = bio.value.trim(), er = bf.querySelector('[data-err="bio"]'), sb = $q("#saveBio"); er.textContent = "";
      if (v.length > BIO_MAX) { er.textContent = "Mô tả tối đa " + BIO_MAX + " ký tự."; return; }
      if (v === (prof.bio || "")) { toast("Mô tả chưa thay đổi."); return; }
      sb.classList.add("busy");
      try { await saveProfileFields({ bio: v }); toast("Đã cập nhật hồ sơ."); } catch (x) { er.textContent = friendly(x); } sb.classList.remove("busy");
    });
    /* Ảnh đại diện */
    const file = $q("#avFile"), ae = $q("#avErr");
    $q("#avPick").addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      const fl = file.files && file.files[0]; file.value = ""; if (!fl) return; ae.textContent = "";
      const pk = $q("#avPick"); pk.classList.add("busy");
      try { await saveProfileFields({ avatar: await fileToAvatar(fl) }); toast("Đã cập nhật hồ sơ."); } catch (x) { ae.textContent = x.code && /^avatar\//.test(x.code) || /ảnh/i.test(x.message) ? x.message : friendly(x); } pk.classList.remove("busy");
    });
    const del = $q("#avDel"); if (del) del.addEventListener("click", async () => {
      if (!(await confirmDialog({ title: "Xóa ảnh đại diện?", message: "Bạn sẽ quay về chữ cái đầu của tên.", ok: "Xóa ảnh", danger: true }))) return;
      try { await saveProfileFields({ avatar: "" }); toast("Đã cập nhật hồ sơ."); } catch (x) { ae.textContent = friendly(x); }
    });
    const cool = (btn, ms = 30000) => { btn.disabled = true; const label = btn.innerHTML; let left = ms / 1000; btn.textContent = "Gửi lại sau " + left + "s";
      clearInterval(timer); timer = setInterval(() => { btn.textContent = "Gửi lại sau " + (--left) + "s"; if (left <= 0) { clearInterval(timer); btn.innerHTML = label; btn.disabled = false; } }, 1000); };
    const pw = $q("#pwMail"); if (pw) pw.addEventListener("click", () => resetPassword(u.email).then(() => { toast("Đã gửi email đổi mật khẩu. Hãy kiểm tra hộp thư."); cool(pw); }).catch(x => toast(friendly(x), "err")));
    const vm = $q("#vMail"); if (vm) vm.addEventListener("click", () => resendVerification().then(() => { toast("Đã gửi email xác minh. Hãy kiểm tra hộp thư."); cool(vm); }).catch(x => toast(friendly(x), "err")));
  };
  draw(); return onAuth(() => { if (sigOf() !== sig) draw(); });
}
