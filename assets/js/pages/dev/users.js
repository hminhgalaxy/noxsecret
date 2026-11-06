/* Danh sách người dùng đã đăng nhập vào website. */
import { esc, fmtTime } from "../../lib/util.js";
import { DEV_EMAIL } from "../../lib/config.js";
import * as S from "../../lib/store.js";
import { emptyHTML } from "../../lib/ui.js";
import { locked, devCrumb } from "./shared.js";

const via = p => String(p || "").startsWith("google") ? "Google" : p ? "Email" : "—";
export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Người dùng", crumbs: devCrumb, sub: "Những tài khoản đã đăng nhập vào website.", noindex: true });
  const draw = () => { const u = S.store.users;
    ctx.setPage({ count: u ? u.length + " người dùng" : null });
    if (u == null) { ctx.el.innerHTML = '<div class="statebox"><p>Đang tải danh sách…</p></div>'; return; }
    ctx.el.innerHTML = u.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Người dùng</th><th>Email</th><th>Đăng nhập bằng</th><th>Lần cuối</th></tr></thead><tbody>${u.map(x => {
      const nm = x.name || String(x.email || "?").split("@")[0], ini = esc(nm.charAt(0).toUpperCase());
      return `<tr><td><span class="cell-user"><span class="avatar">${x.photo ? `<img src="${esc(x.photo)}" alt="" referrerpolicy="no-referrer">` : ini}</span>${esc(nm)}</span></td>
      <td>${esc(x.email || "")}${String(x.email || "").toLowerCase() === DEV_EMAIL.toLowerCase() ? ' <span class="badge strong">Quản trị viên</span>' : ""}</td><td>${via(x.provider)}</td><td>${esc(fmtTime(x.lastLogin))}</td></tr>`; }).join("")}</tbody></table></div>`
      : emptyHTML("Chưa có người dùng nào được ghi nhận.", "users"); };
  draw(); return S.subscribe(t => { if (t === "users") draw(); });
}
