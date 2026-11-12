/* Dải thông báo bảo trì dưới thanh trên: hiện lịch bảo trì "sắp tới" hoặc "đang diễn ra" do DEV cập nhật. Đóng được (nhớ trong phiên). */
import { $, esc, fmtTime } from "./util.js";
import { ICO } from "./icons.js";
import * as S from "./store.js";
import { openNotifPanel } from "./notifpanel.js";

const KEY = "ssw_mn_closed";
const closed = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
export function renderMnBanner() {
  const el = $("#mnBanner"); if (!el) return;
  const c = closed(), n = S.liveMaintNotes().filter(x => (x.level === "active" || x.level === "planned") && c[x.key] !== (x.ts || 1))
    .sort((a, b) => (a.level === "active" ? -1 : 1) - (b.level === "active" ? -1 : 1) || (a.start || 9e15) - (b.start || 9e15))[0];
  document.documentElement.classList.toggle("has-mn", !!n);
  if (!n) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false; el.dataset.level = n.level;
  el.innerHTML = `<span class="mnb-ico">${n.level === "active" ? ICO.wrench : ICO.calendar}</span><span class="mnb-txt"><b translate="no">${esc(n.title)}</b>${n.start ? `<small>${esc(fmtTime(n.start))}${n.end ? " → " + esc(fmtTime(n.end)) : ""}</small>` : ""}</span>
    <button class="mnb-more" type="button" data-a="more">Chi tiết</button><button class="mnb-x" type="button" data-a="x" aria-label="Ẩn thông báo">${ICO.x}</button>`;
  el.onclick = e => { const b = e.target.closest("[data-a]"); if (!b) return;
    if (b.dataset.a === "more") openNotifPanel("maint");
    else { const o = closed(); o[n.key] = n.ts || 1; try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} renderMnBanner(); } };
}
