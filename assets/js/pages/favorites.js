/* Yêu thích & đã lưu: ba thẻ — Đã lưu (đồng bộ theo tài khoản), Đã thích, Xem gần đây (chỉ trên trình duyệt này). */
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { cardHTML, emptyHTML, fresh } from "../lib/ui.js";
import { favs, recent, clearRecent, onFavs } from "../lib/favs.js";
import { confirmDialog } from "../lib/confirm.js";
import { session } from "../lib/auth.js";

const TABS = [["saved", "Đã lưu", "bookmark"], ["liked", "Đã thích", "heart"], ["recent", "Xem gần đây", "clock"]];
export function mount(ctx) {
  ctx.setPage({ title: "Yêu thích & đã lưu", sub: "Bài viết bạn đã lưu, đã thích và xem gần đây.", noindex: true, crumbs: [] });
  let tab = TABS.some(t => t[0] === ctx.query.get("tab")) ? ctx.query.get("tab") : "saved", first = true;
  const resolve = l => l.map(x => { const it = (S.items(x.c) || []).find(i => i.key === x.k); return it ? { ...it, cat: x.c } : null; }).filter(Boolean);
  const liked = () => Object.keys(S.store.likes).filter(k => S.store.likes[k].mine).map(k => { const i = k.indexOf("/"); return { c: k.slice(0, i), k: k.slice(i + 1) }; });
  const draw = () => {
    const lists = { saved: resolve(favs()), liked: resolve(liked()), recent: resolve(recent()) }, l = lists[tab];
    ctx.setPage({ count: l.length ? l.length + " mục" : null });
    const msg = { saved: "Bạn chưa lưu bài viết nào. Mở menu ⋯ của một bài và chọn “Lưu bài viết”." + (session.user && !session.isGuest ? "" : " Đăng nhập để đồng bộ danh sách đã lưu giữa các thiết bị."), liked: session.user && !session.isGuest ? "Bạn chưa thích bài viết nào. Bấm nút trái tim ở bài viết để thích." : "Đăng nhập bằng tài khoản thật để thích bài viết.", recent: "Chưa có bài viết nào được xem gần đây." }[tab];
    ctx.el.innerHTML = `<div class="seg tabs fav-tabs" role="tablist">${TABS.map(([k, lb, ic]) => `<button type="button" role="tab" aria-selected="${k === tab}" data-t="${k}" class="${k === tab ? "on" : ""}">${ICO[ic]}<span>${lb}</span><i class="tn">${lists[k].length || ""}</i></button>`).join("")}</div>
      ${tab === "recent" && l.length ? `<div class="fav-h2"><span></span><button class="btn ghost sm" type="button" id="clrRecent">Xóa lịch sử</button></div>` : ""}
      ${l.length ? `<div class="grid" id="favGrid">${l.map((it, i) => cardHTML(it, it.cat, i, true)).join("")}</div>` : emptyHTML(msg, tab === "saved" ? "bookmark" : tab === "liked" ? "heart" : "clock")}`;
    if (first) { first = false; ctx.el.querySelectorAll(".grid").forEach(fresh); }
    ctx.el.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { tab = b.dataset.t; draw(); }));
    const c = ctx.el.querySelector("#clrRecent"); if (c) c.addEventListener("click", async () => { if (await confirmDialog({ kind: "reset", title: "Xóa lịch sử xem?", message: "Danh sách bài viết đã xem gần đây trên trình duyệt này sẽ bị xóa. Bài đã lưu và đã thích không bị ảnh hưởng.", ok: "Xóa lịch sử" })) clearRecent(); });
  };
  draw(); const u1 = S.subscribe(t => { if (t === "data" || t === "cats" || t === "likes") draw(); }), u2 = onFavs(draw); return () => { u1(); u2(); };
}
