/* Thông báo dạng popup (không còn là trang): hai thẻ — "Cập nhật" (tin của DEV + ghi chú bản) và "Bảo trì" (lịch bảo trì DEV cập nhật). */
import { esc, fmtTime, fmtDate } from "./util.js";
import { ICO } from "./icons.js";
import * as S from "./store.js";
import { session } from "./auth.js";
import { feed, seenTs, markSeen } from "./updates.js";
import { updHTML, clampUpdates, bodyHTML } from "./news.js";
import { renderNotifDot } from "./nav.js";
import { openPopup, isPopupOpen, closePopup } from "./popup.js";

const LV_ICON = { info: "info", planned: "calendar", active: "wrench", done: "checkCircle" };
export const maintCardHTML = n => {
  const when = n.start || n.end ? `<span class="mn-when">${ICO.clock}${n.start ? esc(fmtTime(n.start)) : ""}${n.start && n.end ? " → " : ""}${n.end ? esc(fmtTime(n.end)) : ""}</span>` : "";
  return `<article class="mn mn-${esc(n.level)}"><span class="mn-ico">${ICO[LV_ICON[n.level]] || ICO.info}</span><div class="mn-main"><div class="mn-top"><span class="badge mn-tag">${esc(S.MNOTE_LEVELS[n.level])}</span>${when}</div>
    <h3 translate="no">${esc(n.title)}</h3>${n.body ? `<div class="mn-body" translate="no">${bodyHTML(n.body)}</div>` : ""}</div></article>`;
};

let tab = "updates", flt = "", before = 0;
export function openNotifPanel(want) {
  if (isPopupOpen("notif")) { closePopup("notif"); return; }
  if (want) tab = want;
  before = seenTs();
  const anchor = document.getElementById("btnBell");
  const h = openPopup({
    id: "notif", variant: "panel", anchor, title: "Thông báo", icon: "bell", wide: true,
    html: `<div class="np"><div class="np-tabs seg" role="tablist" aria-label="Loại thông báo"><button type="button" role="tab" data-t="updates">Cập nhật<i class="np-dot" hidden></i></button><button type="button" role="tab" data-t="maint">Bảo trì<i class="np-dot" hidden></i></button></div><div class="np-body" id="npBody" role="tabpanel"></div></div>`,
    onMount: hd => {
      const $ = s => hd.el.querySelector(s), bodyEl = $("#npBody");
      const draw = () => {
        const maint = S.liveMaintNotes(), live = maint.some(m => m.level === "active" || m.level === "planned");
        hd.el.querySelectorAll("[data-t]").forEach(b => { const on = b.dataset.t === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
        hd.el.querySelector('[data-t="maint"] .np-dot').hidden = !live;
        if (tab === "maint") {
          const n = S.store.notice, has = n && n.enabled !== false && ((n.body || "").trim() || (n.title || "").trim());
          bodyEl.innerHTML = `${S.store.maint && S.store.maint.enabled ? `<div class="mn mn-active"><span class="mn-ico">${ICO.wrench}</span><div class="mn-main"><div class="mn-top"><span class="badge mn-tag">Đang bảo trì</span></div><h3>Website đang bảo trì</h3><div class="mn-body"><p>Một số tính năng có thể tạm thời không dùng được.</p></div></div></div>` : ""}
            ${has ? `<article class="notice-card np-pin"><span class="badge strong">${ICO.bell}Ghim</span><h3${(n.title || "").trim() ? ' translate="no"' : ""}>${esc((n.title || "").trim() || "Thông báo")}</h3><p class="notice-body" translate="no">${esc((n.body || "").trim())}</p></article>` : ""}
            ${maint.length ? maint.map(maintCardHTML).join("") : `<div class="statebox sm">${ICO.checkCircle}<p>Hiện không có lịch bảo trì nào.</p></div>`}
            ${session.isDev ? `<div class="np-foot"><a class="btn soft sm" href="/dev/system#maintnotes">${ICO.pencil}Quản lý thông báo bảo trì</a></div>` : ""}`;
        } else {
          const all = feed(), tags = Object.keys(S.UPD_TAGS).filter(k => all.some(x => x.tag === k)), list = flt ? all.filter(x => x.tag === flt) : all;
          bodyEl.innerHTML = `${tags.length ? `<div class="seg upd-flt np-flt" role="radiogroup" aria-label="Lọc theo loại">${[["", "Tất cả"]].concat(tags.map(k => [k, S.UPD_TAGS[k]])).map(([k, l]) => `<button type="button" role="radio" aria-checked="${flt === k}" data-flt="${k}" class="${flt === k ? "on" : ""}">${l}</button>`).join("")}</div>` : ""}
            <div class="news np-news">${list.length ? list.map((e, i) => updHTML(e, i, { fresh: e.ts > before })).join("") : `<div class="statebox sm">${ICO.bell}<p>Hiện chưa có thông báo nào.</p></div>`}</div>
            ${session.isDev ? `<div class="np-foot"><a class="btn soft sm" href="/dev/updates">${ICO.plus}Đăng cập nhật mới</a></div>` : ""}`;
          clampUpdates(bodyEl);
        }
        bodyEl.querySelectorAll("[data-flt]").forEach(b => b.addEventListener("click", () => { flt = b.dataset.flt; draw(); const n = bodyEl.querySelector(`[data-flt="${flt}"]`); if (n) n.focus(); }));
      };
      hd.el.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { tab = b.dataset.t; draw(); }));
      hd.el.addEventListener("click", e => { if (e.target.closest("a[href]")) hd.close(true); });
      const mk = document.createElement("button"); mk.type = "button"; mk.className = "btn ghost sm np-read"; mk.textContent = "Đánh dấu đã đọc";
      hd.el.querySelector(".pop-tools").appendChild(mk);
      mk.addEventListener("click", () => { markSeen(); renderNotifDot(); before = seenTs(); draw(); });
      draw(); markSeen(); renderNotifDot();
      const off = S.subscribe(t => { if (t === "notice" || t === "updates" || t === "maintnotes" || t === "maint") { markSeen(); renderNotifDot(); draw(); } });
      hd.off = off;
    },
    onClose: () => { const x = document.querySelector('[data-pop="notif"]'); }
  });
  const prev = h.close; h.close = (s) => { if (h.off) h.off(); prev(s); };
  return h;
}
export function initNotifPanel() {
  const b = document.getElementById("btnBell"); if (!b) return;
  b.addEventListener("click", e => { e.preventDefault(); openNotifPanel(); });
  b.setAttribute("aria-haspopup", "dialog");
}
