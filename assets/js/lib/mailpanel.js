/* Hộp thư dạng popup (bấm biểu tượng thư ở đầu trang): hai tab "Tin nhắn" và "Hoạt động". Mở trang đầy đủ ở /inbox. */
import { openPopup, closePopup } from "./popup.js";
import { session, onAuth } from "./auth.js";
import * as H from "./help.js";
import { subscribeShop, startShop } from "./shop.js";
import { buildActivity, activityHTML } from "./activity.js";
import { unreadFor, avatarChip } from "./chatui.js";
import { esc } from "./util.js";
import { ICO } from "./icons.js";
import { navigate } from "./router.js";
import { store } from "./store.js";

const ago = ts => { const s = Math.max(0, (Date.now() - (ts || 0)) / 1000); if (s < 60) return "Vừa xong"; if (s < 3600) return Math.floor(s / 60) + " phút"; if (s < 86400) return Math.floor(s / 3600) + " giờ"; return Math.floor(s / 86400) + " ngày"; };
let tab = "msg";
export function openMailPanel(anchor) {
  if (!session.user || session.isGuest) { navigate("/login?next=" + encodeURIComponent(location.pathname)); return null; }
  const dev = session.isDev; let threads = null, offs = [];
  startShop();
  const h = openPopup({ id: "mail", variant: "panel", anchor: anchor || document.getElementById("btnMail"), title: "Hộp thư", icon: "mail", onClose: () => offs.forEach(f => f()) });
  const draw = () => {
    const un = (threads || []).filter(t => unreadFor(t, dev)).length;
    let body;
    if (tab === "msg") {
      const L = (threads || []).slice(0, 12);
      body = threads === null ? `<div class="statebox sm"><p>Đang tải…</p></div>` : L.length ? `<ul class="mp-list">${L.map(t => { const key = dev ? t.uid + "." + t.tid : t.key, name = dev ? ((S_users(t.uid)) || "Người dùng") : (t.key === "chat" ? "Dev" : (t.subject || H.TYPE_LABEL[t.type] || "Tin nhắn")), u = unreadFor(t, dev);
        return `<li><button type="button" class="mp-row${u ? " unread" : ""}" data-k="${esc(key)}" data-chat="${!dev && t.key === "chat" ? 1 : 0}">${dev ? avatarChip(name) : `<span class="cv-av ${t.key === "chat" ? "dev" : ""}">${t.key === "chat" ? "D" : ICO.mail}</span>`}<span class="mp-m"><span class="mp-l1"><b translate="no">${esc(name)}</b><time>${esc(ago(t.updatedAt))}</time></span><span class="mp-l2" translate="no">${t.last === "dev" && !dev ? "Dev: " : t.last === "user" && !dev ? "Bạn: " : ""}${esc(t.preview || "")}</span></span>${u ? `<i class="mbx-dot" aria-label="Chưa đọc"></i>` : ""}</button></li>`; }).join("")}</ul>`
        : `<div class="statebox sm">${ICO.chat}<p>${dev ? "Chưa có tin nhắn nào." : "Chưa có tin nhắn. Bấm “Nhắn với dev” để bắt đầu."}</p></div>`;
    } else body = `<div class="mp-act">${activityHTML(buildActivity().slice(0, 12), "Bạn chưa có hoạt động nào.")}</div>`;
    h.setBody(`<div class="mp"><div class="mp-tabs" role="tablist"><button type="button" role="tab" data-t="msg" aria-selected="${tab === "msg"}" class="${tab === "msg" ? "on" : ""}">Tin nhắn${un ? `<i>${un}</i>` : ""}</button><button type="button" role="tab" data-t="act" aria-selected="${tab === "act"}" class="${tab === "act" ? "on" : ""}">Hoạt động</button></div>
      <div class="mp-body">${body}</div>
      <div class="mp-foot">${!dev && tab === "msg" ? `<button class="btn primary sm" type="button" data-chat-open>${ICO.chat}Nhắn với dev</button>` : ""}<a class="btn ghost sm" href="/inbox${tab === "act" ? "?tab=activity" : ""}" data-link>Mở hộp thư đầy đủ</a></div></div>`);
    const b = h.body;
    b.querySelectorAll("[data-t]").forEach(x => x.addEventListener("click", () => { tab = x.dataset.t; draw(); }));
    b.querySelectorAll("[data-k]").forEach(x => x.addEventListener("click", () => { h.close(true); if (x.dataset.chat === "1") import("./chatwidget.js").then(m => m.openChat()); else navigate("/inbox/" + encodeURIComponent(x.dataset.k)); }));
    const co = b.querySelector("[data-chat-open]"); if (co) co.addEventListener("click", () => { h.close(true); import("./chatwidget.js").then(m => m.openChat()); });
    b.querySelectorAll("a[data-link]").forEach(a => a.addEventListener("click", () => h.close(true)));
  };
  offs.push(dev ? H.listenAllThreads(v => { threads = v; draw(); }) : H.listenMyThreads(v => { threads = v.map(t => ({ ...t, tid: t.key, uid: session.user.uid })); draw(); }));
  offs.push(subscribeShop(t => { if (tab === "act" && (t === "orders" || t === "topups" || t === "txs")) draw(); }));
  draw(); return h;
}
const S_users = uid => { const u = (store.users || []).find(x => x.uid === uid); return u ? (u.name || u.email || "") : ""; };
export const closeMailPanel = () => closePopup("mail");
export function initMailPanel() {
  const btn = document.getElementById("btnMail"); if (!btn) return;
  btn.addEventListener("click", e => { if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); e.stopPropagation(); openMailPanel(btn); }, true);
}
