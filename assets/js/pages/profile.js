/* Hồ sơ cá nhân: ảnh đại diện, mô tả bản thân, tên hiển thị, bảo mật, đăng xuất. Khách (ẩn danh) chỉ thấy bản hạn chế. */
import { esc, toast, fmtTime } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { session, onAuth, updateDisplayName, resendVerification, resetPassword, providerLabel, canChangePassword, saveProfileFields, muteInfo, isEditor, twofaSend, twofaVerify, recoveryStart, recoveryConfirm, recoveryRemove, changeEmail, passwordCodeSend, changePasswordWithCode } from "../lib/auth.js";
import { serverReady } from "../lib/account.js";
import { navigate } from "../lib/router.js";
import { avatarHTML } from "../lib/ui.js";
import { friendly } from "../lib/messages.js";
import { fileToAvatar } from "../lib/avatar.js";
import { confirmDialog, formDialog } from "../lib/confirm.js";

const when = s => { const t = s ? new Date(s).getTime() : 0; return t ? fmtTime(t) : "—"; };
const BIO_MAX = 300;

let ctx0 = null, curTab = "overview";
const mailOk = { v: null };
/* Hỏi mã 6 số (hộp thoại), cho nhập lại khi sai; trả true nếu thành công */
async function askCode(o, verify) {
  for (;;) {
    const v = await formDialog({ title: o.title, message: o.message, ok: o.ok, fields: [{ id: "code", label: "Mã gồm 6 chữ số", max: 7, otp: true, placeholder: "000000" }] });
    if (!v) return false;
    try { await verify((v.code || "").replace(/\s+/g, "")); return true; }
    catch (x) { toast(friendly(x), "err"); if (/code_expired|too_many_tries/.test(x.code || "")) return false; }
  }
}
function secHTML(u) {
  const sec = session.sec || {}, rec = sec.recovery && sec.recovery.verified ? sec.recovery.email : "", off = u.emailVerified ? "" : "disabled";
  return `<section class="panel" id="secPanel"><h3>Xác minh 2 bước và khôi phục</h3>${u.emailVerified ? "" : `<p class="muted">Hãy xác minh email của bạn trước để dùng các tính năng này.</p>`}
    <div class="sec-list">
      <div class="sec-row"><div><h4>Xác minh 2 bước</h4><p>${sec.twofa ? "Đang bật: mỗi lần đăng nhập, chúng tôi gửi một mã qua email cho bạn." : "Đang tắt. Bật để mỗi lần đăng nhập cần thêm một mã gửi qua email."}</p></div>
        <button class="btn ${sec.twofa ? "ghost" : "primary"}" id="tfBtn" type="button" ${off}>${sec.twofa ? "Tắt" : "Bật"}</button></div>
      <div class="sec-row"><div><h4>Email khôi phục</h4><p translate="no">${rec ? esc(rec) : ""}</p>${rec ? "" : `<p>Chưa có. Dùng để lấy lại tài khoản nếu bạn mất quyền vào hộp thư chính.</p>`}</div>
        <div class="acts"><button class="btn ghost" id="rcBtn" type="button" ${off}>${rec ? "Đổi" : "Thêm"}</button>${rec ? `<button class="btn ghost" id="rcDel" type="button" ${off}>Xóa</button>` : ""}</div></div>
      ${canChangePassword(u) ? `<div class="sec-row"><div><h4>Mật khẩu</h4><p>Để đổi mật khẩu, bạn cần mật khẩu hiện tại và một mã gửi tới email của bạn.</p></div><button class="btn ghost" id="pwBtn" type="button" ${off}>Đổi mật khẩu</button></div>` : ""}
      ${canChangePassword(u) ? `<div class="sec-row"><div><h4>Email đăng nhập</h4><p translate="no">${esc(u.email || "")}</p></div><button class="btn ghost" id="emBtn" type="button" ${off}>Đổi email</button></div>` : ""}
    </div></section>`;
}
function fillSec(u) {
  const host = ctx0.el.querySelector("#secHost"); if (!host) return;
  const paint = () => { if (!ctx0.isCurrent() || !ctx0.el.contains(host)) return; host.innerHTML = secHTML(u); wireSec(host, u); ctx0.el.querySelectorAll("[data-legacy]").forEach(x => x.remove()); const ls = ctx0.el.querySelector("#legacySec"); if (ls && !ls.querySelector(".acts button")) ls.remove(); };
  if (mailOk.v === true) paint(); else if (mailOk.v === null) serverReady().then(ok => { mailOk.v = ok; if (ok) paint(); });
}
function wireSec(host, u) {
  const $ = x => host.querySelector(x), sec = session.sec || {};
  $("#tfBtn").addEventListener("click", async () => {
    const on = !!sec.twofa, b = $("#tfBtn"); b.classList.add("busy");
    try {
      const r = await twofaSend(on ? "disable" : "enable"); b.classList.remove("busy");
      const ok = await askCode({ title: on ? "Tắt xác minh 2 bước?" : "Bật xác minh 2 bước", message: "Chúng tôi đã gửi mã tới " + (r.sentTo || u.email) + ". Nhập mã để xác nhận.", ok: on ? "Tắt" : "Bật" }, c => twofaVerify(on ? "disable" : "enable", c));
      if (ok) toast(on ? "Đã tắt xác minh 2 bước." : "Đã bật xác minh 2 bước.");
    } catch (x) { b.classList.remove("busy"); toast(friendly(x), "err"); }
  });
  $("#rcBtn").addEventListener("click", async () => {
    const v = await formDialog({ title: "Email khôi phục", message: "Nhập một email khác với email đăng nhập. Chúng tôi sẽ gửi mã để xác nhận.", ok: "Gửi mã", fields: [{ id: "email", label: "Email khôi phục", max: 120, placeholder: "example@gmail.com" }] });
    if (!v) return; const em = (v.email || "").trim();
    try { const r = await recoveryStart(em); if (await askCode({ title: "Xác nhận email khôi phục", message: "Chúng tôi đã gửi mã tới " + (r.sentTo || em) + ".", ok: "Xác nhận" }, c => recoveryConfirm(c))) toast("Đã lưu email khôi phục."); }
    catch (x) { toast(friendly(x), "err"); }
  });
  const del = $("#rcDel"); if (del) del.addEventListener("click", async () => {
    if (!(await confirmDialog({ title: "Xóa email khôi phục?", message: "Bạn sẽ không còn dùng được email này để lấy lại tài khoản.", ok: "Xóa", danger: true }))) return;
    try { await recoveryRemove(); toast("Đã xóa email khôi phục."); } catch (x) { toast(friendly(x), "err"); }
  });
  const pwb = $("#pwBtn"); if (pwb) pwb.addEventListener("click", async () => {
    pwb.classList.add("busy");
    try {
      const r = await passwordCodeSend(); pwb.classList.remove("busy");
      let msg = "Chúng tôi đã gửi mã tới " + (r.sentTo || u.email) + ". Nhập mật khẩu hiện tại, mã và mật khẩu mới.";
      for (;;) {
        const v = await formDialog({ title: "Đổi mật khẩu", message: msg, ok: "Đổi mật khẩu", fields: [{ id: "cur", label: "Mật khẩu hiện tại", type: "password", max: 200 }, { id: "code", label: "Mã gồm 6 chữ số", max: 7, otp: true, placeholder: "000000" }, { id: "pw", label: "Mật khẩu mới", type: "password", max: 200 }, { id: "pw2", label: "Nhập lại mật khẩu mới", type: "password", max: 200 }] });
        if (!v) return;
        const code = (v.code || "").replace(/\s+/g, ""), p = v.pw || "";
        if (!v.cur) { msg = "Hãy nhập mật khẩu hiện tại."; continue; }
        if (!/^\d{6}$/.test(code)) { msg = "Nhập mã gồm 6 chữ số."; continue; }
        if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) { msg = "Mật khẩu mới cần ít nhất 8 ký tự, gồm cả chữ và số."; continue; }
        if (p !== v.pw2) { msg = "Mật khẩu nhập lại chưa khớp."; continue; }
        try { await changePasswordWithCode(v.cur, code, p); toast("Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới."); navigate("/login", { replace: true }); return; }
        catch (x) { toast(friendly(x), "err"); if (/code_expired|too_many_tries/.test(x.code || "")) return; msg = "Kiểm tra lại thông tin rồi thử lại."; }
      }
    } catch (x) { pwb.classList.remove("busy"); toast(friendly(x), "err"); }
  });
  const em = $("#emBtn"); if (em) em.addEventListener("click", async () => {
    const v = await formDialog({ title: "Đổi email đăng nhập", message: "Chúng tôi sẽ gửi liên kết xác nhận tới email mới. Nhập mật khẩu hiện tại để tiếp tục.", ok: "Gửi liên kết", fields: [{ id: "email", label: "Email mới", max: 120, placeholder: "example@gmail.com" }, { id: "pw", label: "Mật khẩu hiện tại", type: "password", max: 200 }] });
    if (!v) return;
    try { const r = await changeEmail((v.email || "").trim(), v.pw || ""); toast("Đã gửi liên kết xác nhận tới " + (r.sentTo || "email mới") + ". Mở thư để hoàn tất."); } catch (x) { toast(friendly(x), "err"); }
  });
}

export function mount(ctx) {
  ctx0 = ctx; { const q = ctx.query.get("tab"); if (/^(overview|edit|security)$/.test(q || "")) curTab = q; }
  ctx.setPage({ title: "Hồ sơ", sub: "Thông tin và bảo mật tài khoản của bạn.", noindex: true });
  let timer = null, sig = ""; ctx.cleanup(() => clearInterval(timer));
  const sigOf = () => { const u = session.user, p = session.profile || {}, m = muteInfo(); return [u && u.uid, u && u.displayName, u && u.emailVerified, session.isGuest, session.isDev, isEditor(), p.bio, (p.avatar || "").length, m && m.until, JSON.stringify(session.sec || null)].join("|"); };
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
        <div class="head-acts">${session.isDev ? `<a class="btn primary" href="/dev">${ICO.shield}Dev Panel</a>` : ""}<button class="btn ghost" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div></section>
      ${mute ? `<section class="panel notice-mute" role="status"><h3>Bạn đang bị mute</h3><p class="muted">Bạn chưa thể đổi ảnh, mô tả hoặc tên cho tới ${esc(fmtTime(mute.until))}.${mute.reason ? " Lý do: " + esc(mute.reason) : ""}</p></section>` : ""}
      <nav class="ptabs" role="tablist" aria-label="Các mục hồ sơ">${[["overview", "Tổng quan"], ["edit", "Chỉnh sửa hồ sơ"], ["security", "Bảo mật"]].map(([k, l]) => `<button class="ptab-btn${curTab === k ? " on" : ""}" type="button" role="tab" aria-selected="${curTab === k}" data-tab="${k}">${l}</button>`).join("")}</nav>
      <div class="ptab" data-pane="overview" role="tabpanel" ${curTab === "overview" ? "" : "hidden"}>
      <section class="panel"><h3>Tài khoản</h3><dl class="info">
        <div><dt>Email</dt><dd>${esc(u.email || "—")}</dd></div><div><dt>Đăng nhập bằng</dt><dd>${esc(providerLabel(u))}</dd></div>
        <div><dt>Tham gia</dt><dd>${esc(when(meta.creationTime))}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>${esc(when(meta.lastSignInTime))}</dd></div></dl></section>
      </div>
      <div class="ptab" data-pane="edit" role="tabpanel" ${curTab === "edit" ? "" : "hidden"}>
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
      </div>
      <div class="ptab" data-pane="security" role="tabpanel" ${curTab === "security" ? "" : "hidden"}>
      <section class="panel" id="legacySec"><h3>Bảo mật</h3>
        <p class="muted"${canChangePassword(u) ? " data-legacy" : ""}>${canChangePassword(u) ? "Bạn có thể đổi mật khẩu bằng liên kết gửi qua email." : "Tài khoản của bạn đăng nhập bằng Google nên không cần mật khẩu riêng."}</p>
        <div class="acts">${canChangePassword(u) ? `<button class="btn ghost" id="pwMail" type="button" data-legacy>${ICO.mail}Gửi email đổi mật khẩu</button>` : ""}
          ${!u.emailVerified ? `<button class="btn ghost" id="vMail" type="button">${ICO.check}Gửi lại email xác minh</button>` : ""}
</div></section><div id="secHost"></div></div></div>`;
    const $q = x => ctx.el.querySelector(x);
    ctx.el.querySelectorAll(".ptab-btn").forEach(b => b.addEventListener("click", () => { curTab = b.dataset.tab; ctx.el.querySelectorAll(".ptab-btn").forEach(x => { const on = x.dataset.tab === curTab; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); }); ctx.el.querySelectorAll(".ptab").forEach(p => { p.hidden = p.dataset.pane !== curTab; }); }));
    fillSec(u);
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
      try { await saveProfileFields({ bio: v }); toast("Đã cập nhật hồ sơ."); } catch (x) { er.textContent = /PERMISSION_DENIED|permission/i.test((x && (x.code || x.message)) || "") ? "Không lưu được. Hãy tải lại trang và đăng nhập lại; nếu vẫn lỗi, quản trị viên cần cập nhật Rules cho website." : friendly(x); } sb.classList.remove("busy");
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
