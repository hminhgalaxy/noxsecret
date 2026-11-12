/* Dev Panel: tổng quan và lối tắt tới từng mục quản trị. */
import { esc, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { countOf } from "../../lib/ui.js";
import { locked } from "./shared.js";
import { diagnose, repair } from "../../lib/devdoctor.js";

const SHORTCUTS = [
  { href: "/dev/data", t: "Dữ liệu", d: "Thêm, sửa, xóa nội dung trong từng danh mục.", i: "box" },
  { href: "/dev/categories", t: "Danh mục", d: "Thêm, sửa, xóa mọi danh mục (kể cả Script, APK, iOS, Link) và gán cảnh báo.", i: "grid" },
  { href: "/inbox", t: "Hộp thư", d: "Hộp thư chung của website: tin nhắn, báo cáo và hỗ trợ (mở từ biểu tượng thư trên đầu trang).", i: "chat" },
  { href: "/dev/review", t: "Duyệt bài", d: "Duyệt hoặc từ chối mục và danh mục do người dùng gửi.", i: "check" },
  { href: "/dev/users", t: "Người dùng", d: "Những tài khoản đã đăng nhập vào website.", i: "users" },
  { href: "/dev/theme", t: "Giao diện", d: "Hình nền, video nền và nhạc nền.", i: "paint" },
  { href: "/dev/updates", t: "Cập nhật", d: "Đăng tin \"Cập nhật này có gì?\" và làm sáng chuông thông báo.", i: "bell" },
  { href: "/dev/mail", t: "Gửi thư", d: "Trả lời người dùng bằng văn mẫu tiếng Anh và xem trước các thư tự động.", i: "mail" },
  { href: "/dev/system", t: "Bảo trì & thông báo", d: "Bật chế độ bảo trì, đăng thông báo cho mọi người.", i: "wrench" },
  { href: "/dev/test", t: "Kiểm tra hệ thống", d: "Chạy thử mọi thành phần và xem lỗi cùng cách khắc phục ngay.", i: "check" }
];
const doctorHtml = (r, busy) => `<section class="doctor ${r ? (r.ok ? "ok" : "bad") : ""}" aria-live="polite">
  <header><span class="dr-ico">${r && r.ok ? ICO.check : ICO.shield}</span><div><b>${r ? (r.ok ? "Quyền quản trị hoạt động bình thường" : "Quyền quản trị đang bị chặn") : "Đang kiểm tra quyền quản trị…"}</b><small>${r ? (r.ok ? "Thao tác ghi dữ liệu thử đã thành công." : "Có mục bên dưới chưa đạt — bấm “Kiểm tra & sửa”.") : "Vui lòng chờ giây lát."}</small></div>
  <button class="btn ${r && r.ok ? "ghost" : ""}" id="drFix"${busy ? " disabled" : ""}>${busy ? "Đang sửa…" : "Kiểm tra & sửa"}</button></header>
  ${r ? `<ul class="dr-list">${r.checks.map(c => `<li class="${c.ok ? "ok" : "no"}"><span>${c.ok ? ICO.check : ICO.x}</span><div><b>${esc(c.label)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ""}${!c.ok && c.how ? `<small class="how">Cách xử lý: ${esc(c.how)}</small>` : ""}</div></li>`).join("")}</ul>` : ""}
</section>`;
export function mount(ctx) {
  if (locked(ctx)) return;
  let dr = null, busy = false, dead = false;
  const slot = () => ctx.el.querySelector("#doctor");
  const paintDoctor = () => { const s = slot(); if (!s) return; s.innerHTML = doctorHtml(dr, busy); const b = s.querySelector("#drFix"); if (b) b.onclick = fix; };
  const run = async () => { try { dr = await diagnose(); } catch (e) { dr = { ok: false, checks: [{ ok: false, label: "Chẩn đoán", detail: String(e && e.message || e), how: "Tải lại trang." }] }; } if (!dead) paintDoctor(); };
  const fix = async () => { busy = true; paintDoctor(); try { const r = await repair(); dr = r; if (r.needCode) toast("Cần nhập mã xác minh 2 bước để cấp lại quyền.", "warn"); else if (r.ok) toast("Đã khôi phục quyền quản trị.", "ok"); } catch (e) { toast("Không sửa được: " + (e && e.message || e), "err"); } busy = false; if (!dead) paintDoctor(); };
  ctx.setPage({ title: "Dev Panel", sub: "Bảng điều khiển dành cho quản trị viên.", noindex: true });
  const draw = () => {
    const total = S.store.cats.reduce((n, c) => n + countOf(c.id), 0), m = S.store.maint && S.store.maint.enabled;
    ctx.el.innerHTML = `<div id="doctor"></div><div class="stats">
      <div class="stat"><small>Tổng nội dung</small><b>${total}</b></div><div class="stat"><small>Danh mục</small><b>${S.store.cats.length}</b></div>
      <div class="stat"><small>Người dùng</small><b>${S.store.users ? S.store.users.length : "—"}</b></div>
      <div class="stat"><small>Bảo trì</small><b class="${m ? "warn" : "okc"}">${m ? "Đang bật" : "Đang tắt"}</b></div>
      <div class="stat"><small>Kết nối</small><b class="${S.store.connected ? "okc" : "warn"}">${S.store.connected ? "Ổn định" : "Đang chờ"}</b></div></div>
      <div class="tiles">${SHORTCUTS.map(d => `<a class="tile" href="${d.href}"><span class="tile-ico">${ICO[d.i]}</span><b>${esc(d.t)}</b><small>${esc(d.d)}</small><span class="tile-go">${ICO.arrow}</span></a>`).join("")}</div>`;
  };
  draw(); paintDoctor(); run();
  const off = S.subscribe(t => { if (["data", "cats", "users", "maint", "conn"].includes(t)) { draw(); paintDoctor(); } });
  return () => { dead = true; try { off && off(); } catch (_) {} };
}
