/* Dev Panel: tổng quan và lối tắt tới từng mục quản trị. */
import { esc } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { countOf } from "../../lib/ui.js";
import { locked } from "./shared.js";

const SHORTCUTS = [
  { href: "/dev/data", t: "Dữ liệu", d: "Thêm, sửa, xóa Script, APK, iOS, Link và các danh mục khác.", i: "box" },
  { href: "/dev/categories", t: "Danh mục", d: "Tạo hoặc xóa danh mục tùy chỉnh.", i: "grid" },
  { href: "/dev/users", t: "Người dùng", d: "Những tài khoản đã đăng nhập vào website.", i: "users" },
  { href: "/dev/theme", t: "Giao diện", d: "Hình nền, video nền và nhạc nền.", i: "paint" },
  { href: "/dev/updates", t: "Cập nhật", d: "Đăng tin \"Cập nhật này có gì?\" và làm sáng chuông thông báo.", i: "bell" },
  { href: "/dev/mail", t: "Gửi thư", d: "Trả lời người dùng bằng văn mẫu tiếng Anh và xem trước các thư tự động.", i: "mail" },
  { href: "/dev/system", t: "Bảo trì & thông báo", d: "Bật chế độ bảo trì, đăng thông báo cho mọi người.", i: "wrench" },
  { href: "/dev/test", t: "Kiểm tra hệ thống", d: "Chạy thử mọi thành phần và xem lỗi cùng cách khắc phục ngay.", i: "check" }
];
export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Dev Panel", sub: "Bảng điều khiển dành cho quản trị viên.", noindex: true });
  const draw = () => {
    const total = S.store.cats.reduce((n, c) => n + countOf(c.id), 0), m = S.store.maint && S.store.maint.enabled;
    ctx.el.innerHTML = `<div class="stats">
      <div class="stat"><small>Tổng nội dung</small><b>${total}</b></div><div class="stat"><small>Danh mục</small><b>${S.store.cats.length}</b></div>
      <div class="stat"><small>Người dùng</small><b>${S.store.users ? S.store.users.length : "—"}</b></div>
      <div class="stat"><small>Bảo trì</small><b class="${m ? "warn" : "okc"}">${m ? "Đang bật" : "Đang tắt"}</b></div>
      <div class="stat"><small>Kết nối</small><b class="${S.store.connected ? "okc" : "warn"}">${S.store.connected ? "Ổn định" : "Đang chờ"}</b></div></div>
      <div class="tiles">${SHORTCUTS.map(d => `<a class="tile" href="${d.href}"><span class="tile-ico">${ICO[d.i]}</span><b>${esc(d.t)}</b><small>${esc(d.d)}</small><span class="tile-go">${ICO.arrow}</span></a>`).join("")}</div>`;
  };
  draw(); return S.subscribe(t => { if (["data", "cats", "users", "maint", "conn"].includes(t)) draw(); });
}
