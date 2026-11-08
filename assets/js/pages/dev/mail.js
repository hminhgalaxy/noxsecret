/* Dev Panel → Gửi thư: văn mẫu trả lời người dùng (sửa được trước khi gửi) + xem trước / gửi thử mọi thư hệ thống. */
import { esc, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { api, apiMessage, serverReady } from "../../lib/account.js";
import { locked, devCrumb } from "./shared.js";

const SYS = { resetCode: "Mã đặt lại mật khẩu", recoverCode: "Mã khôi phục tài khoản", passwordCode: "Mã đổi mật khẩu", newLocationCode: "Mã đăng nhập từ vị trí mới", passwordChangedAlert: "Đã đổi mật khẩu (cảnh báo)", verifyEmail: "Xác minh email", resetPassword: "Đặt lại mật khẩu", googleOnly: "Tài khoản dùng Google", recoverReset: "Khôi phục qua email khôi phục", changeEmail: "Xác nhận email mới", changeEmailNotice: "Báo có yêu cầu đổi email", welcome: "Chào mừng", loginCode: "Mã đăng nhập 2 bước", enableCode: "Mã bật 2 bước", disableCode: "Mã tắt 2 bước", recoveryCode: "Mã xác nhận email khôi phục", recoveryLoginCode: "Mã đăng nhập qua email khôi phục", twofaEnabled: "Đã bật 2 bước", twofaDisabled: "Đã tắt 2 bước", recoveryAdded: "Đã thêm email khôi phục", recoveryRemoved: "Đã xóa email khôi phục", passwordChanged: "Đã đổi mật khẩu", roleGranted: "Được cấp biên tập viên", roleRemoved: "Bị gỡ biên tập viên", muted: "Bị mute", unmuted: "Hết mute", banned: "Bị đình chỉ", unbanned: "Hết đình chỉ" };

export async function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Gửi thư", crumbs: devCrumb, sub: "Trả lời người dùng bằng văn mẫu và xem trước các thư tự động.", noindex: true });
  ctx.el.innerHTML = `<div class="statebox"><p>Đang tải…</p></div>`;
  if (!(await serverReady())) { ctx.el.innerHTML = `<div class="statebox"><p>Dịch vụ gửi thư chưa được bật. Hãy làm theo mục "Giai đoạn 2" trong HUONG-DAN.md (Brevo + khoá Firebase Admin), website sẽ tự bật tính năng này.</p></div>`; return; }
  const tp = await api("dev-templates"); if (!ctx.isCurrent()) return;
  if (!tp.ok) { ctx.el.innerHTML = `<div class="statebox err"><p>${esc(apiMessage(tp))}</p></div>`; return; }
  const users = () => (S.store.users || []).filter(u => u.email);
  ctx.el.innerHTML = `<form class="formcard" id="mf" novalidate><span class="dsec">Gửi thư tới người dùng</span>
      <div class="field"><label for="mT">Văn mẫu</label><select id="mT" name="tpl" translate="no">${tp.replies.map(r => `<option value="${esc(r.id)}">${esc(r.label)}</option>`).join("")}</select></div>
      <div class="field"><label for="mTo">Gửi tới (email)</label><input id="mTo" name="to" type="email" list="mUsers" autocomplete="off" placeholder="example@gmail.com" inputmode="email"><datalist id="mUsers">${users().map(u => `<option value="${esc(u.email)}">${esc(u.name || "")}</option>`).join("")}</datalist><p class="field-error" data-err="to" role="alert"></p></div>
      <div class="field"><label for="mS">Tiêu đề</label><input id="mS" name="subject" maxlength="150" autocomplete="off" translate="no"></div>
      <div class="field"><label for="mB">Nội dung</label><textarea id="mB" name="body" rows="11" maxlength="8000" translate="no"></textarea><p class="sub-note">Dùng {{name}} để chèn tên người nhận. Hỗ trợ **in đậm** và danh sách bắt đầu bằng "- ". Thư luôn có logo và chân trang SkibidiScript.</p></div>
      <p class="form-error" id="mE" role="alert"></p><p class="form-ok" id="mOk" role="status"></p>
      <div class="form-acts"><button class="btn ghost" id="mTest" type="button">Gửi thử cho tôi</button><button class="btn primary" id="mSend" type="submit">${ICO.mail}Gửi thư</button></div></form>
    <span class="dsec">Xem trước</span><iframe class="mail-frame" id="mFrame" sandbox title="Email preview"></iframe>
    <span class="dsec">Thư tự động của hệ thống</span><div class="dlist" id="sysl">${tp.system.map(k => `<div class="upd-row"><span class="nm"><b>${esc(SYS[k] || k)}</b><small translate="no">${esc(k)}</small></span><span class="row-acts"><button class="btn ghost sm" data-prev="${esc(k)}" type="button">Xem</button><button class="btn ghost sm" data-test="${esc(k)}" type="button">Gửi thử cho tôi</button></span></div>`).join("")}</div>`;
  const $ = s => ctx.el.querySelector(s), f = $("#mf"), frame = $("#mFrame"), err = $("#mE"), ok = $("#mOk");
  const fill = () => { const r = tp.replies.find(x => x.id === f.tpl.value); if (r) { f.subject.value = r.subject; f.body.value = r.body; } preview(); };
  const nameFor = () => { const u = users().find(x => (x.email || "").toLowerCase() === f.to.value.trim().toLowerCase()); return (u && u.name) || ""; };
  let pt = 0, seq = 0;
  async function preview() { const my = ++seq; const r = await api("dev-preview", { type: "custom", subject: f.subject.value, body: f.body.value, name: nameFor() || "Alex" }); if (my === seq && r.ok) frame.srcdoc = r.html; }
  const later = () => { clearTimeout(pt); pt = setTimeout(preview, 350); }; ctx.cleanup(() => clearTimeout(pt));
  f.tpl.addEventListener("change", fill); f.subject.addEventListener("input", later); f.body.addEventListener("input", later); f.to.addEventListener("input", later);
  async function send(test) {
    err.textContent = ""; ok.textContent = ""; const em = f.to.value.trim();
    if (!test && !em) { err.textContent = "Nhập email người nhận."; f.to.focus(); return; }
    const b = test ? $("#mTest") : $("#mSend"); b.classList.add("busy");
    const r = await api("dev-send", { to: test ? "test@example.com" : em, template: "custom", subject: f.subject.value, body: f.body.value, name: nameFor(), test });
    b.classList.remove("busy"); if (r.ok) { ok.textContent = (test ? "Đã gửi thử tới " : "Đã gửi tới ") + r.sentTo + "."; toast(test ? "Đã gửi thử." : "Đã gửi thư."); } else err.textContent = apiMessage(r);
  }
  f.addEventListener("submit", e => { e.preventDefault(); send(false); });
  $("#mTest").addEventListener("click", () => send(true));
  $("#sysl").addEventListener("click", async e => {
    const p = e.target.closest("[data-prev]"), t = e.target.closest("[data-test]"); if (!p && !t) return;
    if (p) { const r = await api("dev-preview", { type: p.dataset.prev }); if (r.ok) { frame.srcdoc = r.html; frame.scrollIntoView({ block: "center", behavior: "smooth" }); } else toast(apiMessage(r), "err"); return; }
    t.classList.add("busy"); const r = await api("dev-send", { to: "test@example.com", template: t.dataset.test, test: true }); t.classList.remove("busy"); r.ok ? toast("Đã gửi thử tới " + r.sentTo + ".") : toast(apiMessage(r), "err");
  });
  fill();
}
