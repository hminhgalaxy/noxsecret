/* Danh sách nội dung của một danh mục: /scripts, /apk, /ios, /links, /c/:danh-mục */
import { esc, vi } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { session, onAuth } from "../../lib/auth.js";
import { skeletonHTML, emptyHTML, errorHTML, cardHTML, fresh } from "../../lib/ui.js";
import { riskGate } from "../../lib/risk.js";
import { resolveCat, notFound, crumbsFor } from "./shared.js";

export async function mount(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  if (!(await riskGate(cat))) { ctx.navigate("/categories", { replace: true }); return; }
  if (!ctx.isCurrent()) return;
  let q = "", first = true, sort = (() => { try { return sessionStorage.getItem("ssw_sort") || "new"; } catch (_) { return "new"; } })();
  const SORTS = { new: "Mới nhất", old: "Cũ nhất", az: "Tên A → Z", za: "Tên Z → A", pop: "Sao chép nhiều nhất" };
  const sorted = a => { if (sort === "new") return a; const c = a.slice(), nm = (x, y) => String(x.name).localeCompare(String(y.name), "vi", { sensitivity: "base" });
    return sort === "old" ? c.reverse() : sort === "az" ? c.sort(nm) : sort === "za" ? c.sort((x, y) => nm(y, x)) : c.sort((x, y) => (y.copies || 0) - (x.copies || 0) || (y.ts || 0) - (x.ts || 0)); };
  const head = () => { const a = S.items(cat.id), n = (a || []).length;
    ctx.setPage({ title: cat.label, sub: cat.sub, crumbs: crumbsFor(cat), count: a ? n + " mục" : null, desc: cat.label + " — " + (cat.sub || "Danh mục trên SKIBIDI SCRIPT WEB") + (a ? " (" + n + " mục)" : ""),
      ld: "CollectionPage", extra: a && n ? { "@type": "ItemList", name: cat.label, numberOfItems: n, itemListElement: a.slice(0, 20).map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: "https://skibidiscript.vercel.app" + S.catHref(cat) + "/" + encodeURIComponent(it.key) })) } : undefined,
      actions: (session.isDev || session.isEditor) ? `<a class="btn primary" href="${S.catHref(cat)}/create">${ICO.plus}Thêm mới</a>` : "" }); };
  ctx.el.innerHTML = `<div class="toolbar"><div class="field"><label class="sr" for="catFilter">Lọc nội dung</label><input id="catFilter" type="search" placeholder="Lọc trong ${esc(cat.label)}…" autocomplete="off"></div><div class="field sortf"><label class="sr" for="catSort">Sắp xếp</label><select id="catSort">${Object.keys(SORTS).map(k => `<option value="${k}"${k === sort ? " selected" : ""}>${SORTS[k]}</option>`).join("")}</select></div></div><div class="grid" id="grid"></div>`;
  const grid = ctx.el.querySelector("#grid");
  const draw = () => {
    head(); const arr = S.items(cat.id);
    if (S.store.status[cat.id] === "error" && arr == null) { grid.innerHTML = errorHTML(cat.id); return; }
    if (arr == null) { grid.innerHTML = skeletonHTML(); return; }
    const f = vi(q.trim()), res = f ? arr.filter(it => vi(it.name).includes(f) || vi(it.desc).includes(f) || vi(it.code).includes(f)) : arr;
    grid.innerHTML = res.length ? sorted(res).map((it, i) => cardHTML(it, cat.id, i, false)).join("") : emptyHTML(f ? "Không có mục nào khớp với bộ lọc." : "Chưa có nội dung trong " + cat.label + ".");
    if (first && arr) { first = false; fresh(grid); }
  };
  ctx.el.querySelector("#catFilter").addEventListener("input", e => { q = e.target.value; draw(); });
  ctx.el.querySelector("#catSort").addEventListener("change", e => { sort = e.target.value; try { sessionStorage.setItem("ssw_sort", sort); } catch (_) {} draw(); });
  draw();
  const u1 = S.subscribe((t, id) => { if ((t === "data" && id === cat.id) || t === "cats") draw(); }), u2 = onAuth(draw);
  return () => { u1(); u2(); };
}
