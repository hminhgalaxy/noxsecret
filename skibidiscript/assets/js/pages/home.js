import { esc, fmtTime } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { store, subscribe, catById, catHref, itemHref } from "../lib/store.js";
import { session, onAuth } from "../lib/auth.js";
import { icoOf, observeAnim, countUp, countOf, emptyHTML } from "../lib/ui.js";

export function tilesHTML() {
  return store.cats.map(c => `<a class="tile" href="${catHref(c)}" data-reveal style="--nc:${c.color}"><span class="sh" aria-hidden="true"></span>
    <span class="tico">${icoOf(c)}</span><span class="num" data-tilenum="${esc(c.id)}">0</span><b>${esc(c.label)}</b><small>${esc(c.sub || "")}</small></a>`).join("");
}
export function fillTiles(box) {
  box.innerHTML = tilesHTML();
  box.querySelectorAll(".tile").forEach((t, i) => t.style.setProperty("--d", (i * 50) + "ms"));
  store.cats.forEach(c => { const el = box.querySelector(`[data-tilenum="${CSS.escape(c.id)}"]`); if (el) countUp(el, countOf(c.id)); });
  observeAnim(box);
}
export function mount(ctx) {
  ctx.setPage({ hero: true, title: null });
  ctx.el.innerHTML = `<div class="hero"><span class="spot" aria-hidden="true"></span>
      <h1>SKIBIDI <span>SCRIPT WEB</span></h1><p>Code · Share · Connect — Simple. Fast. Connected.</p>
      <div class="hero-cta" id="heroCta"></div></div>
    <div class="cattiles" id="tiles"></div>
    <h2 class="sech">Mới được thêm</h2><div class="latest" id="latest"></div>`;
  const tiles = ctx.el.querySelector("#tiles"), box = ctx.el.querySelector("#latest"), cta = ctx.el.querySelector("#heroCta");
  const drawCta = () => { cta.innerHTML = `<a class="btn btn-p" href="/scripts" style="--cat:var(--accent-primary)">${ICO.script}Khám phá Script</a>` +
    (session.user ? `<a class="btn btn-g" href="/categories">${ICO.grid}Tất cả danh mục</a>` : `<a class="btn btn-g" href="/login">${ICO.key}Đăng nhập</a>`); };
  const drawLatest = () => {
    const all = []; store.cats.forEach(c => (store.data[c.id] || []).forEach(it => all.push({ ...it, cat: c.id })));
    const latest = all.filter(x => x.ts).sort((a, b) => b.ts - a.ts).slice(0, 6);
    if (!latest.length) { box.innerHTML = emptyHTML("Chưa có dữ liệu."); return; }
    box.innerHTML = latest.map(it => { const c = catById(it.cat);
      return `<a class="lrow" href="${itemHref(it.cat, it.key)}" style="--nc:${c.color}" data-reveal><span class="lico">${icoOf(c)}</span>
        <span class="lt"><b>${esc(it.name)}</b><small>${esc(fmtTime(it.ts))}</small></span><span class="chip" style="--cat:${c.color}">${esc(c.label)}</span></a>`; }).join("");
    box.querySelectorAll("[data-reveal]").forEach((el, i) => el.style.setProperty("--d", (i * 55) + "ms")); observeAnim(box);
  };
  let tilesKey = "";
  const draw = type => {
    const key = store.cats.map(c => c.id).join(",");
    if (key !== tilesKey) { tilesKey = key; fillTiles(tiles); }
    else store.cats.forEach(c => { const el = tiles.querySelector(`[data-tilenum="${CSS.escape(c.id)}"]`); if (el) countUp(el, countOf(c.id)); });
    drawLatest();
  };
  drawCta(); draw();
  const u1 = subscribe(t => { if (t === "data" || t === "cats") draw(); }), u2 = onAuth(drawCta);
  return () => { u1(); u2(); };
}
