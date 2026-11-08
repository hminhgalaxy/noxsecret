/* Chi tiết một mục: /scripts/:id, /apk/:id, ... */
import { esc, fmtTime, validUrl, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { session, onAuth } from "../../lib/auth.js";
import { skeletonHTML, armDelete, icoOf } from "../../lib/ui.js";
import { friendly } from "../../lib/messages.js";
import { clampText } from "../../lib/collapse.js";
import { resolveCat, notFound, crumbsFor, settled, missingHTML } from "./shared.js";

export async function mount(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  const key = ctx.params.id, base = S.catHref(cat);
  const draw = () => {
    const it = S.item(cat.id, key);
    if (!it && !settled(cat)) { ctx.setPage({ title: cat.label, crumbs: crumbsFor(cat) }); ctx.el.innerHTML = `<div class="grid one">${skeletonHTML(1)}</div>`; return; }
    if (!it) { ctx.setPage({ title: "Không tìm thấy mục", noindex: true, crumbs: crumbsFor(cat).concat([{ label: cat.label, href: base }]) }); ctx.el.innerHTML = missingHTML(base, cat.label); return; }
    ctx.setPage({ title: it.name, desc: it.desc || (cat.label + " — " + it.name), noindex: false, crumbs: crumbsFor(cat).concat([{ label: cat.label, href: base }]),
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
        <a class="btn ghost" href="${base}">${ICO.back}Quay lại</a>
        ${(session.isDev || session.isEditor) ? `<button class="btn danger" type="button" id="delBtn">${ICO.trash}Xóa</button>` : ""}
      </div></article>`;
    const del = ctx.el.querySelector("#delBtn");
    clampText(ctx.el.querySelector(".detail-desc"), 8);
    if (del) del.addEventListener("click", () => armDelete(del, () => S.deleteItem(cat.id, key).then(() => { toast("Đã xóa."); ctx.navigate(base); }).catch(e => toast(friendly(e), "err")), { title: "Xóa mục này?", message: "Mục sẽ bị xóa khỏi website. Hành động này không thể hoàn tác." }));
  };
  draw();
  const u1 = S.subscribe((t, id) => { if ((t === "data" && id === cat.id) || t === "cats") draw(); }), u2 = onAuth(draw);
  return () => { u1(); u2(); };
}
