/* Hộp thư của người dùng: mọi yêu cầu hỗ trợ / báo cáo / chat với dev + từng cuộc trò chuyện (/help/messages/:tid) */
import { esc, fmtTime } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { session } from "../../lib/auth.js";
import * as H from "../../lib/help.js";
import { mountConversation, badgeFor, unreadFor } from "../../lib/chatui.js";

const crumbs = [{ label: "Trợ giúp", href: "/help" }];
export function mount(ctx) {
  const tid = ctx.params.tid || (ctx.def.chat ? "chat" : "");
  if (tid) return conversation(ctx, tid);
  ctx.setPage({ title: "Tin nhắn của tôi", sub: "Các yêu cầu hỗ trợ, báo cáo và cuộc trò chuyện với quản trị viên.", crumbs, noindex: true });
  ctx.el.innerHTML = `<div class="quick"><a class="btn primary" href="/help/support">${ICO.plus}Gửi yêu cầu hỗ trợ</a><a class="btn ghost" href="/help/report">${ICO.flag}Báo cáo</a><a class="btn ghost" href="/help/chat">${ICO.chat}Nhắn tin với dev</a></div><div class="dlist" id="tl"><div class="statebox"><p>Đang tải…</p></div></div>`;
  const tl = ctx.el.querySelector("#tl");
  return H.listenMyThreads(list => {
    tl.innerHTML = list.length ? list.map(t => `<a class="drow thread${unreadFor(t, false) ? " unread" : ""}" href="/help/messages/${esc(t.key)}"><span class="ci">${ICO[t.type === "report" ? "flag" : t.type === "chat" ? "chat" : "mail"]}</span><span class="nm"><b translate="no">${esc(t.subject || H.TYPE_LABEL[t.type])}</b><small>${esc(fmtTime(t.updatedAt))}</small></span><span>${badgeFor(t)}${unreadFor(t, false) ? ' <span class="dot" aria-label="Có tin mới"></span>' : ""}</span></a>`).join("")
      : `<div class="statebox">${ICO.chat}<p>Bạn chưa có tin nhắn nào. Dùng các nút ở trên để liên hệ quản trị viên.</p></div>`;
  });
}
function conversation(ctx, tid) {
  const chat = tid === "chat";
  ctx.setPage({ title: chat ? "Nhắn tin với dev" : "Cuộc trò chuyện", crumbs: chat ? crumbs : crumbs.concat([{ label: "Tin nhắn của tôi", href: "/help/messages" }]), noindex: true });
  const uid = session.user.uid; let off = null, started = false;
  const start = () => { started = true; off && off(); ctx.el.innerHTML = ""; off = mountConversation(ctx.el, { uid, tid }); };
  if (!chat) { start(); return () => off && off(); }
  /* Chat: một cuộc trò chuyện cố định; chưa có thì tin đầu tiên sẽ tạo ra nó */
  ctx.el.innerHTML = `<div class="statebox"><p>Đang tải…</p></div>`;
  const stop = H.listenThread(uid, "chat", t => {
    if (t) { if (!started) start(); return; }
    ctx.el.innerHTML = `<form class="formcard" id="cf" novalidate><span class="dsec">Nhắn tin với dev</span><p class="sub-note">Hỏi nhanh hoặc trao đổi trực tiếp với quản trị viên. Quản trị viên sẽ trả lời ngay trong trang này.</p>
      <div class="field"><label for="ct">Tin nhắn đầu tiên</label><textarea id="ct" rows="4" maxlength="2000" placeholder="Bạn cần gì?"></textarea></div><p class="form-error" id="ce" role="alert"></p>
      <div class="form-acts"><button class="btn primary" type="submit">${ICO.arrow}Bắt đầu trò chuyện</button></div></form>`;
    ctx.el.querySelector("#cf").addEventListener("submit", async e => {
      e.preventDefault(); const er = ctx.el.querySelector("#ce"); er.textContent = "";
      try { await H.createThread({ type: "chat", subject: "Nhắn tin với dev", text: ctx.el.querySelector("#ct").value, id: "chat" }); } catch (x) { const { friendly } = await import("../../lib/messages.js"); er.textContent = friendly(x); }
    });
  });
  return () => { stop(); off && off(); };
}
