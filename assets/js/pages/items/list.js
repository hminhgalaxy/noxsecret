/* Danh sách nội dung của một danh mục: /scripts, /apk, /ios, /links, /c/:danh-mục */
import { esc, vi } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { session, onAuth } from "../../lib/auth.js";
import { skeletonHTML, emptyHTML, errorHTML, cardHTML, fresh } from "../../lib/ui.js";
import { resolveCat, notFound, crumbsFor } from "./shared.js";

export async function mount(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  let q = "", first = true;
  const head = () => { const a = S.items(cat.id), n = (a || []).length;
    ctx.setPage({ title: cat.label, sub: cat.sub, crumbs: crumbsFor(cat), count: a ? n + " mục" : null, desc: cat.label + " — " + (cat.sub || "Danh mục trên SKIBIDI SCRIPT WEB") + (a ? " (" + n + " mục)" : ""),
      actions: (session.isDev || session.isEditor) ? `<a class="btn primary" href="${S.catHref(cat)}/create">${ICO.plus}Thêm mới</a>` : "" }); };
  ctx.el.innerHTML = `<div class="toolbar"><div class="field"><label class="sr" for="catFilter">Lọc nội dung</label><input id="catFilter" type="search" placeholder="Lọc trong ${esc(cat.label)}…" autocomplete="off"></div></div><div class="grid" id="grid"></div>`;
  const grid = ctx.el.querySelector("#grid");
  const draw = () => {
    head(); const arr = S.items(cat.id);
    if (S.store.status[cat.id] === "error" && arr == null) { grid.innerHTML = errorHTML(cat.id); return; }
    if (arr == null) { grid.innerHTML = skeletonHTML(); return; }
    const f = vi(q.trim()), res = f ? arr.filter(it => vi(it.name).includes(f) || vi(it.desc).includes(f) || vi(it.code).includes(f)) : arr;
    grid.innerHTML = res.length ? res.map((it, i) => cardHTML(it, cat.id, i, false)).join("") : emptyHTML(f ? "Không có mục nào khớp với bộ lọc." : "Chưa có nội dung trong " + cat.label + ".");
    if (first && arr) { first = false; fresh(grid); }
  };
  ctx.el.querySelector("#catFilter").addEventListener("input", e => { q = e.target.value; draw(); });
  draw();
  const u1 = S.subscribe((t, id) => { if ((t === "data" && id === cat.id) || t === "cats") draw(); }), u2 = onAuth(draw);
  return () => { u1(); u2(); };
}
