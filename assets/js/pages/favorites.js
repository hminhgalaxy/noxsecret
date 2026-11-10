/* Yêu thích + đã xem gần đây (lưu trên trình duyệt này). */
import { esc } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { cardHTML, emptyHTML, fresh } from "../lib/ui.js";
import { favs, recent, clearRecent, onFavs } from "../lib/favs.js";
import { confirmDialog } from "../lib/confirm.js";

export function mount(ctx) {
  ctx.setPage({ title: "Yêu thích", sub: "Những mục bạn đã lưu và đã xem gần đây. Chỉ lưu trên trình duyệt này.", noindex: true, crumbs: [] });
  let first = true;
  const resolve = l => l.map(x => { const it = (S.items(x.c) || []).find(i => i.key === x.k); return it ? { ...it, cat: x.c } : null; }).filter(Boolean);
  const draw = () => {
    const fl = resolve(favs()), rl = resolve(recent()).filter(r => !fl.some(f => f.cat === r.cat && f.key === r.key));
    ctx.setPage({ count: fl.length ? fl.length + " mục" : null });
    ctx.el.innerHTML = `<section class="fav-s"><h2 class="fav-h">${ICO.heart}Yêu thích</h2>${fl.length ? `<div class="grid" id="favGrid">${fl.map((it, i) => cardHTML(it, it.cat, i, true)).join("")}</div>` : emptyHTML("Bạn chưa lưu mục nào. Bấm nút trái tim ở trang một mục để lưu.", "heart")}</section>
      ${rl.length ? `<section class="fav-s"><div class="fav-h2"><h2 class="fav-h">${ICO.clock}Xem gần đây</h2><button class="btn ghost sm" type="button" id="clrRecent">Xóa lịch sử</button></div><div class="grid" id="recGrid">${rl.map((it, i) => cardHTML(it, it.cat, i, true)).join("")}</div></section>` : ""}`;
    if (first) { first = false; ctx.el.querySelectorAll(".grid").forEach(fresh); }
    const c = ctx.el.querySelector("#clrRecent"); if (c) c.addEventListener("click", async () => { if (await confirmDialog({ title: "Xóa lịch sử xem?", message: "Danh sách mục đã xem gần đây trên trình duyệt này sẽ bị xóa. Yêu thích không bị ảnh hưởng.", ok: "Xóa lịch sử" })) clearRecent(); });
  };
  draw(); const u1 = S.subscribe(t => { if (t === "data" || t === "cats") draw(); }), u2 = onFavs(draw); return () => { u1(); u2(); };
}
