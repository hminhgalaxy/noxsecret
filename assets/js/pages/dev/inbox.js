/* Dev → Hộp thư: mọi yêu cầu hỗ trợ / báo cáo / chat của người dùng, trả lời, đóng, cấp quyền đăng bài. */
import { esc, fmtTime, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import * as H from "../../lib/help.js";
import { friendly } from "../../lib/messages.js";
import { mountConversation, badgeFor, unreadFor } from "../../lib/chatui.js";
import { armDelete } from "../../lib/ui.js";
import { locked, devCrumb } from "./shared.js";

const FILTERS = [["all", "Tất cả"], ["unread", "Chưa trả lời"], ["support", "Hỗ trợ"], ["report", "Báo cáo"], ["chat", "Chat"], ["post", "Xin quyền đăng"]];
export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Hộp thư", crumbs: devCrumb, sub: "Tin nhắn, báo cáo và yêu cầu hỗ trợ từ người dùng.", noindex: true });
  let all = [], perms = {}, filter = "all", sel = null, offConv = null;
  ctx.el.innerHTML = `<div class="inbox"><aside class="ib-list"><div class="chips" id="chips" role="tablist">${FILTERS.map(([v, l]) => `<button type="button" role="tab" data-f="${v}" class="${v === "all" ? "on" : ""}">${l}</button>`).join("")}</div><div class="dlist" id="tl"></div></aside><section class="ib-view" id="view"><div class="statebox">${ICO.mail}<p>Chọn một cuộc trò chuyện ở bên trái.</p></div></section></div>`;
  const root = ctx.el.querySelector(".inbox"), tl = ctx.el.querySelector("#tl"), view = ctx.el.querySelector("#view");
  const who = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return u ? (u.name || u.email || uid) : uid; };
  const emailOf = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return (u && u.email) || ""; };
  const pass = t => filter === "all" || (filter === "unread" ? t.last === "user" && t.status !== "closed" : filter === "post" ? !!t.wantPost : t.type === filter);
  const drawList = () => {
    const l = all.filter(pass);
    tl.innerHTML = l.length ? l.map(t => `<button type="button" class="drow thread${unreadFor(t, true) ? " unread" : ""}${sel && sel.uid === t.uid && sel.tid === t.tid ? " on" : ""}" data-u="${esc(t.uid)}" data-t="${esc(t.tid)}"><span class="ci">${ICO[t.type === "report" ? "flag" : t.type === "chat" ? "chat" : "mail"]}</span><span class="nm"><b translate="no">${esc(t.subject || H.TYPE_LABEL[t.type])}</b><small translate="no">${esc(who(t.uid))} · ${esc(fmtTime(t.updatedAt))}</small></span><span>${badgeFor(t)}${t.wantPost ? ' <span class="badge review">Xin quyền</span>' : ""}${unreadFor(t, true) ? ' <span class="dot" aria-label="Chưa đọc"></span>' : ""}</span></button>`).join("")
      : `<div class="statebox"><p>Không có cuộc trò chuyện nào.</p></div>`;
  };
  const extra = t => `<div class="chat-tools"><small translate="no">${esc(who(t.uid))}${emailOf(t.uid) ? " · " + esc(emailOf(t.uid)) : ""}</small>
    <button class="btn ghost sm" type="button" data-x="perm">${perms[t.uid] && perms[t.uid].post ? "Thu hồi quyền đăng" : "Cấp quyền đăng bài"}</button>
    <button class="btn ghost sm" type="button" data-x="close">${t.status === "closed" ? "Mở lại" : "Đóng"}</button>
    ${t.ref && t.ref.catId && t.ref.key && S.catById(t.ref.catId) ? `<a class="btn ghost sm" href="${S.itemHref(t.ref.catId, t.ref.key)}">Xem mục</a>` : ""}
    <button class="ib del" type="button" data-x="del" aria-label="Xóa cuộc trò chuyện">${ICO.trash}</button><button class="btn ghost sm only-m" type="button" data-x="back">${ICO.back}Danh sách</button></div>`;
  const onExtra = (head, t) => head.querySelector(".chat-tools").addEventListener("click", async e => {
    const b = e.target.closest("[data-x]"); if (!b) return; const x = b.dataset.x;
    try {
      if (x === "perm") { const on = !(perms[t.uid] && perms[t.uid].post); await H.grantPost(t.uid, on); toast(on ? "Đã cấp quyền đăng bài." : "Đã thu hồi quyền đăng bài."); }
      else if (x === "close") { await H.setThreadStatus(t.uid, t.key, t.status === "closed" ? "open" : "closed"); }
      else if (x === "back") { sel = null; root.classList.remove("has-sel"); if (offConv) offConv(); offConv = null; drawList(); }
      else if (x === "del") armDelete(b, () => H.deleteThread(t.uid, t.key).then(() => { toast("Đã xóa."); sel = null; root.classList.remove("has-sel"); if (offConv) offConv(); offConv = null; view.innerHTML = `<div class="statebox">${ICO.mail}<p>Chọn một cuộc trò chuyện ở bên trái.</p></div>`; }).catch(z => toast(friendly(z), "err")), { title: "Xóa cuộc trò chuyện này?", message: "Toàn bộ tin nhắn sẽ bị xóa." });
    } catch (z) { toast(friendly(z), "err"); }
  });
  const open = (uid, tid) => { sel = { uid, tid }; root.classList.add("has-sel"); if (offConv) offConv(); offConv = mountConversation(view, { uid, tid, asDev: true, extra, onExtra }); drawList(); };
  ctx.el.querySelector("#chips").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; ctx.el.querySelectorAll("#chips button").forEach(x => x.classList.toggle("on", x === b)); drawList(); });
  tl.addEventListener("click", e => { const b = e.target.closest("[data-u]"); if (b) open(b.dataset.u, b.dataset.t); });
  const offs = [H.listenAllThreads(v => { all = v; drawList(); }), H.listenPerms(v => { perms = v; }), S.subscribe(t => { if (t === "users") drawList(); })];
  return () => { offs.forEach(f => f()); if (offConv) offConv(); };
}
