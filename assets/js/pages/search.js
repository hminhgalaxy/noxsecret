/* Trang tìm kiếm: lọc theo tên, mô tả và code; hỗ trợ tiếng Việt không dấu. Gõ tới đâu kết quả đổi tới đó, ô nhập không bị mất con trỏ. */
import { vi, esc, debounce } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { onAuth } from "../lib/auth.js";
import { setSearchValue } from "../lib/header.js";
import { cardHTML, emptyHTML, fresh } from "../lib/ui.js";

export function mount(ctx) {
  let q0 = (ctx.query.get("q") || "").trim(), q = vi(q0), first = true;
  ctx.el.innerHTML = `<div class="search-page"><form class="hero-search" id="sf" role="search" action="/search">${ICO.search}
      <input id="sq" type="search" name="q" value="${esc(q0)}" placeholder="Nhập từ khóa…" aria-label="Từ khóa" autocomplete="off" enterkeyhint="search"><button class="btn primary" type="submit">Tìm</button></form></div>
    <div class="grid" id="grid"></div>`;
  const grid = ctx.el.querySelector("#grid"), inp = ctx.el.querySelector("#sq");
  const head = () => ctx.setPage({ title: q0 ? "Tìm kiếm: " + q0 : "Tìm kiếm", sub: "Tìm theo tên, mô tả hoặc nội dung. Gõ tiếng Việt có dấu hay không dấu đều được.", crumbs: [], noindex: true });
  const draw = () => {
    head();
    if (!q) { grid.innerHTML = emptyHTML("Nhập từ khóa để bắt đầu tìm kiếm.", "search"); ctx.setPage({ count: null }); return; }
    const res = []; S.store.cats.forEach(c => (S.items(c.id) || []).forEach(it => { if (vi(it.name).includes(q) || vi(it.desc).includes(q) || vi(it.code).includes(q)) res.push({ ...it, cat: c.id }); }));
    res.sort((a, b) => (b.ts || 0) - (a.ts || 0)); ctx.setPage({ count: res.length + " kết quả" });
    grid.innerHTML = res.length ? res.map((it, i) => cardHTML(it, it.cat, i, true)).join("") : emptyHTML("Không tìm thấy kết quả phù hợp. Hãy thử từ khóa khác.", "search");
    if (first) { first = false; fresh(grid); }
  };
  const run = v => {
    q0 = v.trim(); q = vi(q0);
    try { history.replaceState(history.state, "", q0 ? "/search?q=" + encodeURIComponent(q0) : "/search"); } catch (_) {}
    setSearchValue(q0, true); draw();
  };
  const later = debounce(run, 220);
  inp.addEventListener("input", () => later(inp.value));
  ctx.el.querySelector("#sf").addEventListener("submit", e => { e.preventDefault(); later.cancel(); run(inp.value); inp.blur(); });
  if (!q0 && matchMedia("(pointer:fine)").matches) setTimeout(() => inp.focus({ preventScroll: true }), 120);
  draw(); const u1 = S.subscribe(t => { if (t === "data" || t === "cats") draw(); }), u2 = onAuth(draw); return () => { later.cancel(); u1(); u2(); };
}
