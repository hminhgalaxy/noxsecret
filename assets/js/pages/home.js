/* Trang chủ: giới thiệu, ô tìm kiếm lớn, danh mục và các mục mới cập nhật. */
import { esc } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { store, subscribe, catHref } from "../lib/store.js";
import { session, onAuth } from "../lib/auth.js";
import { icoOf, tileHTML, rowHTML, countUp, countOf, emptyHTML, fresh } from "../lib/ui.js";

export function mount(ctx) {
  ctx.setPage({ hero: true, title: null, desc: "SKIBIDI SCRIPT WEB là nơi tập hợp Script, APK, iOS và các liên kết hữu ích. Gọn gàng, dễ tìm và được cập nhật liên tục." });
  ctx.el.innerHTML = `<section class="hero" aria-labelledby="h1">
      <span class="eyebrow"><i></i>Luôn được cập nhật</span>
      <h1 id="h1">Script, APK, iOS &amp; liên kết hữu ích. <span>Gọn gàng, dễ tìm.</span></h1>
      <p>Mọi thứ bạn cần được sắp xếp theo từng danh mục rõ ràng. Tìm nhanh, mở ngay, không rườm rà.</p>
      <form class="hero-search" id="heroSearch" role="search" action="/search">${ICO.search}
        <input type="search" name="q" placeholder="Bạn đang tìm gì?" aria-label="Tìm kiếm" autocomplete="off" enterkeyhint="search">
        <button class="btn primary" type="submit">Tìm</button></form>
      <div class="chips" id="chips"></div>
      <div class="stat-strip" id="stats"></div>
    </section>
    <div class="sec-head"><h2>Danh mục</h2><a href="/categories">Xem tất cả</a></div><div class="tiles" id="tiles"></div>
    <div class="sec-head"><h2>Mới cập nhật</h2></div><div class="rows" id="latest"></div>`;
  const tiles = ctx.el.querySelector("#tiles"), latest = ctx.el.querySelector("#latest"), chips = ctx.el.querySelector("#chips"), stats = ctx.el.querySelector("#stats");
  ctx.el.querySelector("#heroSearch").addEventListener("submit", e => {
    e.preventDefault(); const q = e.currentTarget.q.value.trim(); ctx.navigate(q ? "/search?q=" + encodeURIComponent(q) : "/search");
  });
  let key = "", first = true;
  const drawChips = () => { chips.innerHTML = store.cats.slice(0, 6).map(c => `<a class="chip" href="${catHref(c)}">${icoOf(c)}${esc(c.label)}</a>`).join("") + (session.user ? "" : `<a class="chip" href="/register">${ICO.user}Tạo tài khoản</a>`); };
  const drawStats = () => { const total = store.cats.reduce((n, c) => n + countOf(c.id), 0); stats.innerHTML = `<div><b>${total}</b>mục nội dung</div><div><b>${store.cats.length}</b>danh mục</div>`; };
  const drawLatest = () => {
    const all = []; store.cats.forEach(c => (store.data[c.id] || []).forEach(it => all.push({ ...it, cat: c.id })));
    const top = all.filter(x => x.ts).sort((a, b) => b.ts - a.ts).slice(0, 6);
    latest.innerHTML = top.length ? top.map((it, i) => rowHTML(it, i)).join("") : emptyHTML("Chưa có nội dung nào.");
  };
  const draw = () => {
    const k = store.cats.map(c => c.id).join(",");
    if (k !== key) { key = k; tiles.innerHTML = store.cats.map((c, i) => tileHTML(c, i)).join(""); if (first) fresh(tiles); drawChips(); }
    else store.cats.forEach(c => { const el = tiles.querySelector(`[data-tilenum="${CSS.escape(c.id)}"]`); if (el) countUp(el, countOf(c.id)); });
    drawStats(); drawLatest();
    if (first) { first = false; fresh(latest); }
  };
  draw();
  const u1 = subscribe(t => { if (t === "data" || t === "cats") draw(); }), u2 = onAuth(drawChips);
  return () => { u1(); u2(); };
}
