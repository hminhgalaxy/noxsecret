/* Thông báo: thông báo đang ghim + toàn bộ cập nhật ("Cập nhật này có gì?"). Mở trang này là đã xem hết. */
import { esc, fmtTime } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { session, onAuth } from "../lib/auth.js";
import { feed, seenTs, markSeen } from "../lib/updates.js";
import { updHTML, clampUpdates } from "../lib/news.js";
import { renderNotifDot } from "../lib/nav.js";

export function mount(ctx) {
  ctx.setPage({ title: "Thông báo", sub: "Tin mới nhất và những thay đổi của website.", desc: "Thông báo và cập nhật mới nhất từ SKIBIDI SCRIPT WEB." });
  const before = seenTs(); let flt = "";
  markSeen(); renderNotifDot();
  const draw = () => {
    const n = S.store.notice, has = n && n.enabled !== false && ((n.body || "").trim() || (n.title || "").trim());
    const all = feed(), tags = Object.keys(S.UPD_TAGS).filter(k => all.some(x => x.tag === k)), list = flt ? all.filter(x => x.tag === flt) : all;
    ctx.el.innerHTML = `${has ? `<article class="notice-card"><span class="badge strong" style="align-self:flex-start">${ICO.bell}Thông báo</span><h2${(n.title || "").trim() ? ' translate="no"' : ""}>${esc((n.title || "").trim() || "Thông báo")}</h2>
        <p class="notice-body" translate="no">${esc((n.body || "").trim())}</p>${n.updatedAt ? `<small class="faint">Cập nhật ${esc(fmtTime(n.updatedAt))}</small>` : ""}</article>` : ""}
      <div class="sec-head"><h2>Cập nhật này có gì?</h2></div>
      ${tags.length ? `<div class="seg upd-flt" role="radiogroup" aria-label="Lọc theo loại">${[["", "Tất cả"]].concat(tags.map(k => [k, S.UPD_TAGS[k]])).map(([k, l]) => `<button type="button" role="radio" aria-checked="${flt === k}" data-flt="${k}" class="${flt === k ? "on" : ""}">${l}</button>`).join("")}</div>` : ""}
      <div class="news wide">${list.length ? list.map((e, i) => updHTML(e, i, { fresh: e.ts > before })).join("") : `<div class="statebox">${ICO.bell}<p>Hiện chưa có thông báo nào.</p></div>`}</div>
      ${session.isDev ? `<div class="acts"><a class="btn ghost" href="/dev/updates">${ICO.plus}Đăng cập nhật mới</a><a class="btn ghost" href="/dev/system#notice">${ICO.pencil}Chỉnh sửa thông báo</a></div>` : ""}`;
    clampUpdates(ctx.el);
    ctx.el.querySelectorAll("[data-flt]").forEach(b => b.addEventListener("click", () => { flt = b.dataset.flt; draw(); const n = ctx.el.querySelector(`[data-flt="${flt}"]`); if (n) n.focus(); }));
  };
  draw(); const u1 = S.subscribe(t => { if (t === "notice" || t === "updates") { markSeen(); renderNotifDot(); draw(); } }), u2 = onAuth(draw); return () => { u1(); u2(); };
}
