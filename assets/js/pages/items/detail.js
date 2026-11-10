/* Chi tiết một mục: /scripts/:id, /apk/:id, ... */
import { esc, fmtTime, validUrl, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { session, onAuth } from "../../lib/auth.js";
import { skeletonHTML, armDelete, icoOf } from "../../lib/ui.js";
import { friendly } from "../../lib/messages.js";
import { clampText } from "../../lib/collapse.js";
import { riskGate } from "../../lib/risk.js";
import { isFav, toggleFav, pushRecent } from "../../lib/favs.js";
import { copyText } from "../../lib/util.js";
import { resolveCat, notFound, crumbsFor, settled, missingHTML } from "./shared.js";

export async function mount(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  if (!(await riskGate(cat))) { ctx.navigate("/categories", { replace: true }); return; }
  if (!ctx.isCurrent()) return;
  const key = ctx.params.id, base = S.catHref(cat);
  const draw = () => {
    const it = S.item(cat.id, key);
    if (!it && !settled(cat)) { ctx.setPage({ title: cat.label, crumbs: crumbsFor(cat) }); ctx.el.innerHTML = `<div class="grid one">${skeletonHTML(1)}</div>`; return; }
    if (!it) { ctx.setPage({ title: "Không tìm thấy mục", noindex: true, crumbs: crumbsFor(cat).concat([{ label: cat.label, href: base }]) }); ctx.el.innerHTML = missingHTML(base, cat.label); return; }
    ctx.setPage({ title: it.name, desc: it.desc || (cat.label + " — " + it.name), noindex: false, crumbs: crumbsFor(cat).concat([{ label: cat.label, href: base }]),
      extra: { "@type": "CreativeWork", name: it.name, description: it.desc || cat.label + " — " + it.name, url: "https://skibidiscript.vercel.app" + base + "/" + encodeURIComponent(key), genre: cat.label, inLanguage: "vi", publisher: { "@id": "https://skibidiscript.vercel.app/#org" }, ...(it.created ? { datePublished: new Date(it.created).toISOString() } : {}), ...(it.ts ? { dateModified: new Date(it.ts).toISOString() } : {}), ...(it.img && /^https:/.test(it.img) ? { image: it.img } : {}) },
      actions: (session.isDev || session.isEditor) ? `<a class="btn ghost" href="${base}/${encodeURIComponent(key)}/edit">${ICO.pencil}Sửa</a>` : "" });
    const hasUrl = validUrl(it.url), times = [];
    if (it.created) times.push("Đăng " + fmtTime(it.created)); if (it.ts && it.ts !== it.created) times.push("Cập nhật " + fmtTime(it.ts));
    ctx.el.innerHTML = `<article class="detail">
      <div class="meta"><span class="badge">${icoOf(cat).replace("<svg", "<svg aria-hidden=\"true\"")}${esc(cat.label)}</span>${it.vault ? `<span class="badge strong">Vault</span>` : ""}
        ${it.copies != null ? `<span>Đã sao chép ${it.copies} lần</span>` : ""}${times.map(t => `<span>${esc(t)}</span>`).join("")}</div>
      ${it.img ? `<img class="detail-img" src="${esc(it.img)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
      ${it.desc ? `<p class="detail-desc">${esc(it.desc)}</p>` : ""}
      ${it.code ? `<div class="code"><pre tabindex="0">${esc(it.code)}</pre></div>` : ""}
      ${hasUrl ? `<div class="urlbox">${ICO.link}<code>${esc(it.url.trim())}</code></div>` : ""}
      <div class="detail-acts">
        ${it.code ? `<button class="btn primary" type="button" data-act="copycode" data-cat="${esc(cat.id)}" data-key="${esc(it.key)}">${ICO.copy}Sao chép code</button>` : ""}
        ${hasUrl ? `<a class="btn primary" href="${esc(it.url.trim())}" target="_blank" rel="noopener noreferrer">${ICO.ext}Mở link</a><button class="btn ghost" type="button" data-act="copyurl" data-url="${esc(it.url.trim())}">${ICO.copy}Sao chép link</button>` : ""}
        <button class="btn ghost" type="button" id="favBtn" aria-pressed="${isFav(cat.id, it.key)}">${ICO.heart}<span>${isFav(cat.id, it.key) ? "Đã yêu thích" : "Yêu thích"}</span></button>
        <button class="btn ghost" type="button" id="shareBtn">${ICO.share}Chia sẻ</button>
        <a class="btn ghost" href="${base}">${ICO.back}Quay lại</a>
        <a class="btn ghost" href="/help/report?cat=${encodeURIComponent(cat.id)}&amp;key=${encodeURIComponent(it.key)}">${ICO.flag}Báo cáo</a>
        ${(session.isDev || session.isEditor) ? `<button class="btn danger" type="button" id="delBtn">${ICO.trash}Xóa</button>` : ""}
      </div></article>`;
    pushRecent(cat.id, it.key);
    const fb = ctx.el.querySelector("#favBtn"); if (fb) fb.addEventListener("click", () => { const on = toggleFav(cat.id, it.key); fb.setAttribute("aria-pressed", on); fb.querySelector("span").textContent = on ? "Đã yêu thích" : "Yêu thích"; toast(on ? "Đã thêm vào Yêu thích." : "Đã bỏ khỏi Yêu thích.", "ok"); });
    const sb = ctx.el.querySelector("#shareBtn"); if (sb) sb.addEventListener("click", async () => { const url = location.origin + S.itemHref(cat.id, it.key), data = { title: it.name + " · SKIBIDI SCRIPT WEB", text: it.desc ? String(it.desc).slice(0, 120) : it.name, url };
      try { if (navigator.share && matchMedia("(pointer:coarse)").matches) { await navigator.share(data); return; } } catch (e) { if (e && e.name === "AbortError") return; }
      copyText(url).then(() => toast("Đã sao chép liên kết để chia sẻ.", "ok")).catch(() => toast("Không sao chép được liên kết.", "err")); });
    const del = ctx.el.querySelector("#delBtn");
    clampText(ctx.el.querySelector(".detail-desc"), 8);
    if (del) del.addEventListener("click", () => armDelete(del, () => S.deleteItem(cat.id, key).then(() => { toast("Đã xóa."); ctx.navigate(base); }).catch(e => toast(friendly(e), "err")), { title: "Xóa mục này?", message: "Mục sẽ bị xóa khỏi website. Hành động này không thể hoàn tác." }));
  };
  draw();
  const u1 = S.subscribe((t, id) => { if ((t === "data" && id === cat.id) || t === "cats") draw(); }), u2 = onAuth(draw);
  return () => { u1(); u2(); };
}
