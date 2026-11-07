/* Người dùng: danh sách + cấp quyền (biên tập viên), mute, ban. Chỉ DEV. */
import { esc, fmtTime, toast } from "../../lib/util.js";
import { DEV_EMAIL } from "../../lib/config.js";
import * as S from "../../lib/store.js";
import { emptyHTML } from "../../lib/ui.js";
import { ICO } from "../../lib/icons.js";
import { friendly } from "../../lib/messages.js";
import { confirmDialog, formDialog } from "../../lib/confirm.js";
import { api, apiMessage, serverReady } from "../../lib/account.js";
import { locked, devCrumb } from "./shared.js";

const via = p => String(p || "").startsWith("google") ? "Google" : p ? "Email" : "—";
const DUR = [["3600000", "1 giờ"], ["21600000", "6 giờ"], ["86400000", "1 ngày"], ["604800000", "7 ngày"], ["2592000000", "30 ngày"], ["perm", "Vĩnh viễn"]];
const act = t => typeof t === "number" && t > Date.now();
const until = t => t >= S.PERM_UNTIL ? "vĩnh viễn" : fmtTime(t);
const untilOf = v => v === "perm" ? S.PERM_UNTIL : Date.now() + Number(v);

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Người dùng", crumbs: devCrumb, sub: "Tài khoản đã đăng nhập, cấp quyền, mute và ban.", noindex: true });
  const draw = () => { const u = S.store.users, A = S.store.admins || {};
    ctx.setPage({ count: u ? u.length + " người dùng" : null });
    if (u == null) { ctx.el.innerHTML = '<div class="statebox"><p>Đang tải danh sách…</p></div>'; return; }
    ctx.el.innerHTML = u.length ? `<div class="table-wrap"><table class="table users-t"><thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Lần cuối</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>${u.map(x => {
      const nm = x.name || String(x.email || "?").split("@")[0], ini = esc(nm.charAt(0).toUpperCase()), a = A[x.uid] || {}, isDev = String(x.email || "").toLowerCase() === DEV_EMAIL.toLowerCase();
      const banned = act(a.banUntil), muted = act(a.muteUntil), editor = a.role === "editor";
      const av = x.avatar ? `<img src="${esc(x.avatar)}" alt="">` : x.photo ? `<img src="${esc(x.photo)}" alt="" referrerpolicy="no-referrer">` : ini;
      const status = banned ? `<span class="badge bad">Bị ban · ${esc(until(a.banUntil))}</span>` : muted ? `<span class="badge warn">Bị mute · ${esc(until(a.muteUntil))}</span>` : `<span class="badge">Bình thường</span>`;
      const acts = isDev ? "" : `<div class="row-acts" data-uid="${esc(x.uid)}" data-name="${esc(nm)}">
        <button class="btn ghost sm" data-a="role" type="button">${editor ? "Gỡ biên tập viên" : "Cấp biên tập viên"}</button>
        <button class="btn ghost sm" data-a="mute" type="button">${muted ? "Bỏ mute" : "Mute"}</button>
        <button class="btn ${banned ? "ghost" : "danger"} sm" data-a="ban" type="button">${banned ? "Bỏ ban" : "Ban"}</button></div>`;
      return `<tr><td><span class="cell-user"><span class="avatar">${av}</span><span translate="no">${esc(nm)}</span></span></td>
      <td><span translate="no">${esc(x.email || "")}</span></td><td>${isDev ? '<span class="badge strong">Quản trị viên</span>' : editor ? '<span class="badge">Biên tập viên</span>' : '<span class="badge">Thành viên</span>'}</td>
      <td>${status}</td><td>${esc(fmtTime(x.lastLogin))}<br><small class="faint">${via(x.provider)}</small></td><td>${acts}</td></tr>`; }).join("")}</tbody></table></div>`
      : emptyHTML("Chưa có người dùng nào được ghi nhận.", "users"); };
  ctx.el.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]"); if (!b) return; const box = b.closest("[data-uid]"), uid = box.dataset.uid, name = box.dataset.name, a = (S.store.admins || {})[uid] || {};
    /* Có máy chủ thư: làm qua API (ghi quyền + gửi thư thông báo + khoá tài khoản thật khi ban vĩnh viễn). Chưa có: ghi trực tiếp như trước. */
    const run = async (p, ok, op, extra) => {
      try {
        if (op && await serverReady()) { const r = await api("moderate", { uid, op, ...extra }); if (r.ok) { toast(ok + (r.emailed ? " Đã gửi email thông báo." : "")); return; } if (r.code !== "not_configured") { toast(apiMessage(r), "err"); return; } }
        await S.setUserAdmin(uid, p); toast(ok);
      } catch (x) { toast(friendly(x), "err"); }
    };
    if (b.dataset.a === "role") {
      const on = a.role === "editor";
      if (await confirmDialog({ title: on ? "Gỡ quyền biên tập viên?" : "Cấp quyền biên tập viên?", message: on ? name + " sẽ không còn thêm, sửa hay xóa nội dung được." : name + " sẽ được thêm, sửa và xóa nội dung (Script, APK, iOS, Link...). Không đụng được vào danh mục, giao diện hay người dùng.", ok: on ? "Gỡ quyền" : "Cấp quyền", danger: on })) run({ role: on ? "" : "editor" }, on ? "Đã gỡ quyền." : "Đã cấp quyền.", on ? "unrole" : "role");
    } else if (b.dataset.a === "mute") {
      if (act(a.muteUntil)) { if (await confirmDialog({ title: "Bỏ mute?", message: name + " sẽ đổi được ảnh, mô tả và tên trở lại.", ok: "Bỏ mute" })) run({ muteUntil: "", muteReason: "" }, "Đã bỏ mute.", "unmute"); return; }
      const v = await formDialog({ title: "Mute " + name + "?", message: "Người bị mute không đổi được ảnh, mô tả và tên hiển thị.", ok: "Mute", danger: true,
        fields: [{ id: "dur", label: "Thời hạn", options: DUR, value: "86400000" }, { id: "why", label: "Lý do (không bắt buộc)", max: 200 }] });
      if (v) run({ muteUntil: untilOf(v.dur), muteReason: (v.why || "").trim() }, "Đã mute.", "mute", { until: untilOf(v.dur), reason: (v.why || "").trim() });
    } else if (b.dataset.a === "ban") {
      if (act(a.banUntil)) { if (await confirmDialog({ title: "Bỏ ban?", message: name + " sẽ dùng được tài khoản trở lại.", ok: "Bỏ ban" })) run({ banUntil: "", banReason: "" }, "Đã bỏ ban.", "unban"); return; }
      const v = await formDialog({ title: "Ban " + name + "?", message: "Người bị ban bị đăng xuất ngay và không thể dùng tài khoản trong thời hạn này.", ok: "Ban", danger: true,
        fields: [{ id: "dur", label: "Thời hạn", options: DUR, value: "604800000" }, { id: "why", label: "Lý do (người dùng sẽ thấy)", max: 200 }] });
      if (v) run({ banUntil: untilOf(v.dur), banReason: (v.why || "").trim() }, "Đã ban.", "ban", { until: untilOf(v.dur), reason: (v.why || "").trim() });
    }
  });
  draw(); return S.subscribe(t => { if (t === "users") draw(); });
}
