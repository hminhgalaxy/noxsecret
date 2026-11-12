/* Khung trò chuyện kiểu ứng dụng nhắn tin — dùng chung cho người dùng và DEV (Hộp thư).
   Nội dung tin luôn được escape; chỉ đường dẫn https:// được biến thành liên kết (rel="noopener noreferrer"). */
import { esc, fmtTime } from "./util.js";
import { ICO } from "./icons.js";
import * as H from "./help.js";
import { friendly } from "./messages.js";

export const unreadFor = (t, asDev) => !!(asDev ? t.unreadDev : t.unreadUser);
export const badgeFor = t => `<span class="badge${t.type === "report" ? " strong" : ""}">${esc(H.TYPE_LABEL[t.type] || "")}</span>${t.status === "closed" ? ' <span class="badge">Đã đóng</span>' : ""}`;
/* Màu ảnh đại diện ổn định theo tên */
export const hue = s => { let h = 0; for (const c of String(s || "?")) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
export const avatarChip = (name, cls = "") => `<span class="cv-av ${cls}" style="--h:${hue(name)}" aria-hidden="true">${esc(String(name || "?").trim().charAt(0).toUpperCase() || "?")}</span>`;
const linkify = t => esc(t).replace(/(https:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer" data-external>${u}</a>`);
const dayKey = ts => { const d = new Date(ts || Date.now()); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
const dayLabel = ts => { const d = new Date(ts || Date.now()), t = new Date(), y = new Date(Date.now() - 864e5); const k = dayKey(d); return k === dayKey(t) ? "Hôm nay" : k === dayKey(y) ? "Hôm qua" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); };
const clock = ts => { const d = new Date(ts || Date.now()); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export const QUICK = ["Cảm ơn bạn đã báo, mình đang kiểm tra ngay.", "Mình đã xử lý xong, bạn thử lại giúp mình nhé.", "Bạn có thể gửi thêm chi tiết hoặc tên mục bị lỗi không?", "Mình đã cấp quyền đăng bài cho bạn."];

/* box: phần tử chứa. opts: { uid, tid, asDev, peer:{name}, extra(thread) → html, onExtra(head, thread), onBack } → hàm dọn dẹp */
export function mountConversation(box, { uid, tid, asDev = false, peer, extra, onExtra, onBack }) {
  let thread = null, msgs = [], stick = true, sending = false, fresh = 0;
  const peerName = () => asDev ? ((peer && peer.name) || "Người dùng") : "Dev · skibidiscript";
  box.innerHTML = `<div class="chat cv"><header class="cv-head" id="chHead"></header>
    <div class="cv-logwrap"><div class="chat-log cv-log" id="chLog" role="log" aria-live="polite" aria-label="Tin nhắn"></div><button class="cv-down" id="chDown" type="button" aria-label="Xuống tin mới nhất" hidden>${ICO.chevD}<i id="chNew" hidden></i></button></div>
    ${asDev ? `<div class="cv-quick" id="chQuick" aria-label="Trả lời nhanh">${QUICK.map(q => `<button type="button" translate="no">${esc(q)}</button>`).join("")}</div>` : ""}
    <form class="chat-form cv-form" id="chForm" novalidate><label class="sr" for="chText">Nội dung tin nhắn</label>
      <div class="cv-input"><textarea id="chText" rows="1" maxlength="2000" placeholder="Nhập tin nhắn…" enterkeyhint="send"></textarea></div>
      <button class="cv-send" type="submit" aria-label="Gửi">${ICO.send}</button></form>
    <p class="form-error cv-err" id="chErr" role="alert"></p></div>`;
  const $ = s => box.querySelector(s), log = $("#chLog"), head = $("#chHead"), form = $("#chForm"), ta = $("#chText"), er = $("#chErr"), down = $("#chDown");
  const drawHead = () => {
    if (!thread) { head.innerHTML = `<span class="cv-skel"></span>`; return; }
    const name = peerName(), closed = thread.status === "closed";
    head.innerHTML = `${onBack ? `<button class="cv-back" type="button" data-x="back" aria-label="Quay lại danh sách">${ICO.back}</button>` : ""}
      ${avatarChip(asDev ? name : "D", asDev ? "" : "dev")}
      <div class="chat-title cv-who"><b translate="no">${esc(thread.subject || H.TYPE_LABEL[thread.type] || "")}</b><small><span translate="no">${esc(name)}</span> · <span>${esc(H.TYPE_LABEL[thread.type] || "")}</span>${thread.ref ? ` · <span translate="no">${esc(H.REPORT_REASONS[thread.ref.reason] || "")}</span>` : ""}${closed ? ` · <span>Đã đóng</span>` : ` · <i class="cv-live"></i><span>Đang mở</span>`}</small></div>
      ${extra ? extra(thread) : ""}`;
    if (onBack) head.querySelector('[data-x="back"]').addEventListener("click", onBack);
    if (onExtra) onExtra(head, thread);
    form.hidden = closed && !asDev; const q = $("#chQuick"); if (q) q.hidden = closed;
    er.textContent = closed && !asDev ? "Cuộc trò chuyện này đã được đóng." : "";
  };
  const drawLog = () => {
    if (!msgs.length) { log.innerHTML = `<div class="statebox sm">${ICO.chat}<p>Chưa có tin nhắn.</p></div>`; return; }
    const mine = asDev ? "dev" : "user", out = []; let lastDay = "", prev = null;
    msgs.forEach((m, i) => {
      const dk = dayKey(m.ts); if (dk !== lastDay) { lastDay = dk; out.push(`<div class="cv-day"><span>${esc(dayLabel(m.ts))}</span></div>`); prev = null; }
      const nx = msgs[i + 1], first = !prev || prev.from !== m.from || m.ts - prev.ts > 5 * 6e4, lastInGroup = !nx || nx.from !== m.from || nx.ts - m.ts > 5 * 6e4 || dayKey(nx.ts) !== dk;
      const me = m.from === mine;
      const seen = me && i === msgs.length - 1 && thread && (asDev ? thread.unreadUser === false : thread.unreadDev === false) && thread.last === mine;
      out.push(`<div class="msg ${me ? "me" : "them"}${first ? " first" : ""}${lastInGroup ? " last" : ""}${fresh && i >= msgs.length - fresh ? " pop" : ""}">${!me && first ? avatarChip(m.from === "dev" ? "D" : peerName(), m.from === "dev" ? "dev sm" : "sm") : !me ? `<span class="cv-av sm ghost"></span>` : ""}
        <div class="msg-col">${!me && first && m.from === "dev" ? `<small class="who">Dev</small>` : ""}<div class="bub" translate="no">${linkify(m.text)}</div>${lastInGroup ? `<time datetime="${new Date(m.ts || Date.now()).toISOString()}">${esc(clock(m.ts))}${seen ? ` · <span class="seen">${ICO.check}Đã xem</span>` : ""}</time>` : ""}</div></div>`);
      prev = m;
    });
    log.innerHTML = out.join(""); fresh = 0;
    if (stick) log.scrollTop = log.scrollHeight;
  };
  const toBottom = () => { log.scrollTo({ top: log.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  log.addEventListener("scroll", () => { stick = log.scrollHeight - log.scrollTop - log.clientHeight < 70; down.hidden = stick; if (stick) $("#chNew").hidden = true; }, { passive: true });
  down.addEventListener("click", () => { stick = true; toBottom(); });
  const offs = [H.listenThread(uid, tid, t => { thread = t; drawHead(); drawLog(); if (t && unreadFor(t, asDev)) H.markRead(uid, tid, asDev); }), H.listenMsgs(uid, tid, m => {
    const grew = m.length - msgs.length; if (msgs.length && grew > 0) { fresh = grew; if (!stick) { const n = $("#chNew"); n.hidden = false; n.textContent = String((parseInt(n.textContent, 10) || 0) + grew); down.hidden = false; } }
    msgs = m; drawLog();
  })];
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; form.classList.toggle("has", !!ta.value.trim()); });
  const fine = matchMedia("(pointer:fine)").matches;
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey || (fine && !e.shiftKey && !e.isComposing))) { e.preventDefault(); form.requestSubmit(); } });
  const q = $("#chQuick"); if (q) q.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; ta.value = b.textContent; ta.dispatchEvent(new Event("input")); ta.focus(); });
  form.addEventListener("submit", async e => {
    e.preventDefault(); if (sending) return; er.textContent = ""; const v = ta.value.trim(); if (!v) { ta.focus(); return; }
    sending = true; form.classList.add("busy"); stick = true;
    try { await H.sendMsg(uid, tid, v, asDev); ta.value = ""; ta.style.height = "auto"; form.classList.remove("has"); } catch (x) { er.textContent = friendly(x); }
    sending = false; form.classList.remove("busy"); ta.focus();
  });
  drawHead(); drawLog();
  return () => offs.forEach(f => f());
}
