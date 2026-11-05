/* Quản lý nội dung của một danh mục: xem, sửa, xóa từng mục. */
import { esc, fmtTime, toast, vi } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { icoOf, emptyHTML, armDelete } from "../../lib/ui.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb, findCat } from "./shared.js";

export async function mount(ctx) {
  if (locked(ctx)) return; const c = await findCat(ctx); if (!ctx.isCurrent()) return;
  const crumbs = devCrumb.concat([{ label: "Quản lý dữ liệu", href: "/dev/data" }]);
  if (!c) { ctx.setPage({ title: "Không tìm thấy", crumbs, noindex: true }); ctx.el.innerHTML = `<div class="statebox">${ICO.warn}<p>Danh mục này không tồn tại.</p><a class="btn ghost" href="/dev/data">Quay lại</a></div>`; return; }
  let q = ""; const base = S.catHref(c);
  ctx.el.innerHTML = `<div class="toolbar"><div class="field"><label class="sr" for="flt">Lọc</label><input id="flt" type="search" placeholder="Lọc trong ${esc(c.label)}…" autocomplete="off"></div></div><div class="dlist" id="list"></div>`;
  const list = ctx.el.querySelector("#list");
  const draw = () => {
    const arr = S.items(c.id);
    ctx.setPage({ title: "Dữ liệu: " + c.label, crumbs, noindex: true, count: arr ? arr.length + " mục" : null, actions: `<a class="btn primary" href="${base}/create">${ICO.plus}Thêm mới</a>` });
    if (arr == null) { list.innerHTML = S.store.status[c.id] === "error" ? `<div class="statebox err">${ICO.warn}<p>Không tải được dữ liệu.</p></div>` : '<div class="statebox"><p>Đang tải…</p></div>'; return; }
    const f = vi(q.trim()), res = f ? arr.filter(it => vi(it.name).includes(f)) : arr;
    list.innerHTML = res.length ? res.map(it => `<div class="drow"><span class="ci">${icoOf(c)}</span><span class="nm" title="${esc(it.name)}">${esc(it.name)}</span><small>${esc(fmtTime(it.ts))}</small>
      <a class="ib" href="${S.itemHref(c.id, it.key)}" aria-label="Xem ${esc(it.name)}">${ICO.eye}</a><a class="ib" href="${S.itemHref(c.id, it.key)}/edit" aria-label="Sửa ${esc(it.name)}">${ICO.pencil}</a>
      <button class="ib del" type="button" data-del="${esc(it.key)}" aria-label="Xóa ${esc(it.name)}">${ICO.trash}</button></div>`).join("") : emptyHTML(f ? "Không có mục nào khớp." : "Danh mục này đang trống.");
  };
  ctx.el.querySelector("#flt").addEventListener("input", e => { q = e.target.value; draw(); });
  list.addEventListener("click", e => { const b = e.target.closest("[data-del]"); if (!b) return;
    armDelete(b, () => S.deleteItem(c.id, b.dataset.del).then(() => toast("Đã xóa.")).catch(x => toast(friendly(x), "err"))); });
  draw(); return S.subscribe((t, id) => { if ((t === "data" && id === c.id) || t === "cats") draw(); });
}
