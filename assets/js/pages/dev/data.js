/* Quản lý dữ liệu: chọn danh mục cần quản lý. */
import * as S from "../../lib/store.js";
import { tileHTML, countOf } from "../../lib/ui.js";
import { locked, devCrumb, dataHref } from "./shared.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Quản lý dữ liệu", crumbs: devCrumb, sub: "Chọn một danh mục để xem, thêm, sửa hoặc xóa nội dung.", noindex: true });
  const draw = () => { ctx.el.innerHTML = `<div class="tiles">${S.store.cats.map((c, i) => tileHTML(c, i, dataHref(c), countOf(c.id))).join("")}</div>`; };
  draw(); return S.subscribe(t => { if (t === "data" || t === "cats") draw(); });
}
