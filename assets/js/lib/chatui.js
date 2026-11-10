/* Khung hội thoại dùng chung cho người dùng (/help/messages/…) và DEV (/dev/inbox). Nội dung luôn được escape, không bao giờ chèn HTML. */
import { esc, fmtTime, toast } from "./util.js";
import { ICO } from "./icons.js";
import * as H from "./help.js";
import { friendly } from "./messages.js";

export const unreadFor = (t, asDev) => !!(asDev ? t.unreadDev : t.unreadUser);
export const badgeFor = t => `<span class="badge${t.type === "report" ? " strong" : ""}">${esc(H.TYPE_LABEL[t.type] || "")}</span>${t.status === "closed" ? ' <span class="badge">Đã đóng</span>' : ""}`;

/* box: phần tử chứa. opts: { uid, tid, asDev, extra(thread) → html, onExtra(box, thread) } → hàm dọn dẹp */
export function mountConversation(box, { uid, tid, asDev = false, extra, onExtra }) {
  let thread = null, msgs = [], stick = true, sending = false;
  box.innerHTML = `<div class="chat"><div class="chat-head" id="chHead"></div><div class="chat-log" id="chLog" role="log" aria-live="polite" aria-label="Tin nhắn"></div><form class="chat-form" id="chForm" novalidate><label class="sr" for="chText">Nội dung tin nhắn</label><textarea id="chText" rows="1" maxlength="2000" placeholder="Nhập tin nhắn…" autocomplete="off"></textarea><button class="btn primary" type="submit" aria-label="Gửi">${ICO.arrow}<span>Gửi</span></button></form><p class="form-error" id="chErr" role="alert"></p></div>`;
  const $ = s => box.querySelector(s), log = $("#chLog"), head = $("#chHead"), form = $("#chForm"), ta = $("#chText"), er = $("#chErr");
  const drawHead = () => {
    if (!thread) { head.innerHTML = `<b>Đang tải…</b>`; return; }
    head.innerHTML = `<div class="chat-title"><b translate="no">${esc(thread.subject || H.TYPE_LABEL[thread.type] || "")}</b><span>${badgeFor(thread)}${thread.ref ? ` <span class="badge" translate="no">${esc(H.REPORT_REASONS[thread.ref.reason] || "")}</span>` : ""}</span></div>${extra ? extra(thread) : ""}`;
    if (onExtra) onExtra(head, thread);
    const closed = thread.status === "closed"; form.hidden = closed && !asDev; if (closed && !asDev) er.textContent = "Cuộc trò chuyện này đã được đóng.";
  };
  const drawLog = () => {
    log.innerHTML = msgs.length ? msgs.map(m => `<div class="msg ${m.from === (asDev ? "dev" : "user") ? "me" : "them"}"><div class="bub" translate="no">${esc(m.text)}</div><time>${m.from === "dev" ? "Dev · " : ""}${esc(fmtTime(m.ts))}</time></div>`).join("") : `<div class="statebox"><p>Chưa có tin nhắn.</p></div>`;
    if (stick) log.scrollTop = log.scrollHeight;
  };
  log.addEventListener("scroll", () => { stick = log.scrollHeight - log.scrollTop - log.clientHeight < 60; });
  const offs = [H.listenThread(uid, tid, t => { thread = t; drawHead(); if (t && unreadFor(t, asDev)) H.markRead(uid, tid, asDev); }), H.listenMsgs(uid, tid, m => { msgs = m; drawLog(); })];
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; });
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", async e => {
    e.preventDefault(); if (sending) return; er.textContent = ""; const v = ta.value.trim(); if (!v) { ta.focus(); return; }
    sending = true; form.classList.add("busy"); stick = true;
    try { await H.sendMsg(uid, tid, v, asDev); ta.value = ""; ta.style.height = "auto"; } catch (x) { er.textContent = friendly(x); }
    sending = false; form.classList.remove("busy"); ta.focus();
  });
  drawHead(); drawLog();
  return () => offs.forEach(f => f());
}
