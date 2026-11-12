/* Hộp thư (cho mọi tài khoản thật): người dùng thấy các cuộc trò chuyện của mình với dev; DEV thấy tất cả và trả lời.
   Bố cục kiểu ứng dụng nhắn tin: danh sách bên trái, khung trò chuyện bên phải (điện thoại: từng màn hình một). */
import { esc, fmtTime, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import * as H from "../lib/help.js";
import { session } from "../lib/auth.js";
import { friendly } from "../lib/messages.js";
import { mountConversation, avatarChip, unreadFor } from "../lib/chatui.js";
import { armDelete } from "../lib/ui.js";
import { openPopup } from "../lib/popup.js";

const FILTERS_U = [["all", "Tất cả"], ["unread", "Chưa đọc"], ["support", "Hỗ trợ"], ["report", "Báo cáo"], ["chat", "Nhắn tin"]];
const FILTERS_D = [["all", "Tất cả"], ["unread", "Chưa trả lời"], ["support", "Hỗ trợ"], ["report", "Báo cáo"], ["chat", "Nhắn tin"], ["post", "Xin quyền đăng"]];
const ago = ts => { const s = Math.max(0, (Date.now() - (ts || 0)) / 1000); if (s < 60) return "Vừa xong"; if (s < 3600) return Math.floor(s / 60) + " phút"; if (s < 86400) return Math.floor(s / 3600) + " giờ"; if (s < 7 * 86400) return Math.floor(s / 86400) + " ngày"; return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }); };
const TYPE_ICO = { report: "flag", chat: "chat", support: "mail" };

export function mount(ctx) {
  const dev = session.isDev, me = session.user.uid;
  ctx.setPage({ title: "Hộp thư", sub: dev ? "Tin nhắn, báo cáo và yêu cầu hỗ trợ từ người dùng." : "Trao đổi với quản trị viên: hỗ trợ, báo cáo và nhắn tin.", crumbs: [], noindex: true });
  let all = [], perms = {}, filter = "all", q = "", sel = null, offConv = null, loaded = false;
  const FIL = dev ? FILTERS_D : FILTERS_U;
  ctx.el.innerHTML = `<div class="mbx" id="mbx"><aside class="mbx-side" aria-label="Danh sách cuộc trò chuyện">
      <div class="mbx-top"><h2>Hộp thư</h2>${dev ? "" : `<button class="btn primary sm" id="mbNew" type="button">${ICO.plus}Tin mới</button>`}</div>
      <div class="mbx-search"><span aria-hidden="true">${ICO.search}</span><input id="mbQ" type="search" placeholder="Tìm cuộc trò chuyện" aria-label="Tìm cuộc trò chuyện" autocomplete="off"></div>
      <div class="chips" id="chips" role="tablist">${FIL.map(([v, l]) => `<button type="button" role="tab" data-f="${v}" class="${v === "all" ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="mbx-list" id="tl"><div class="statebox sm"><p>Đang tải…</p></div></div></aside>
    <section class="mbx-main" id="cv" aria-live="polite"></section></div>`;
  const root = ctx.el.querySelector("#mbx"), tl = ctx.el.querySelector("#tl"), cv = ctx.el.querySelector("#cv");
  const who = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return u ? (u.name || u.email || uid) : "Người dùng"; };
  const emailOf = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return (u && u.email) || ""; };
  const keyOf = t => dev ? t.uid + "." + t.tid : t.key;
  const pass = t => {
    if (q) { const hay = ((t.subject || "") + " " + (t.preview || "") + " " + (dev ? who(t.uid) + " " + emailOf(t.uid) : "")).toLowerCase(); if (!hay.includes(q)) return false; }
    return filter === "all" || (filter === "unread" ? (dev ? t.last === "user" && t.status !== "closed" : !!t.unreadUser) : filter === "post" ? !!t.wantPost : t.type === filter);
  };
  const placeholder = () => { cv.innerHTML = `<div class="mbx-empty"><span class="mbx-art">${ICO.envelope}</span><h3>Hộp thư của bạn</h3><p>${dev ? "Chọn một cuộc trò chuyện ở bên trái để trả lời." : "Chọn một cuộc trò chuyện hoặc bấm “Tin mới” để liên hệ quản trị viên."}</p></div>`; };
  const drawList = () => {
    const l = all.filter(pass);
    tl.innerHTML = l.length ? l.map(t => {
      const name = dev ? who(t.uid) : (t.subject || H.TYPE_LABEL[t.type]), un = unreadFor(t, dev), on = sel === keyOf(t);
      return `<button type="button" class="thread drow mbx-row${un ? " unread" : ""}${on ? " on" : ""}${t.status === "closed" ? " closed" : ""}" data-k="${esc(keyOf(t))}">
        ${dev ? avatarChip(name) : `<span class="cv-av t-${esc(t.type)}">${ICO[TYPE_ICO[t.type]] || ICO.mail}</span>`}
        <span class="mbx-meta"><span class="mbx-l1"><b class="nm" translate="no">${esc(dev ? name : (t.subject || H.TYPE_LABEL[t.type]))}</b><time>${esc(ago(t.updatedAt))}</time></span>
        <span class="mbx-l2"><span class="mbx-pv" translate="no">${dev ? `<em>${esc(t.subject || H.TYPE_LABEL[t.type])}</em> · ` : (t.last === "dev" ? "Dev: " : "Bạn: ")}${esc(t.preview || "")}</span>${un ? `<i class="mbx-dot" aria-label="Chưa đọc"></i>` : ""}</span>
        <span class="mbx-l3"><span class="badge${t.type === "report" ? " strong" : ""}">${esc(H.TYPE_LABEL[t.type])}</span>${t.wantPost ? `<span class="badge">Xin quyền đăng</span>` : ""}${t.status === "closed" ? `<span class="badge">Đã đóng</span>` : ""}</span></span></button>`;
    }).join("") : `<div class="statebox sm">${ICO.chat}<p>${loaded ? (all.length ? "Không có cuộc trò chuyện nào khớp." : (dev ? "Chưa có tin nhắn nào." : "Bạn chưa có tin nhắn nào. Bấm “Tin mới” để bắt đầu.")) : "Đang tải…"}</p></div>`;
  };
  const extra = t => !dev ? "" : `<div class="chat-tools cv-tools"><button class="btn ghost sm" type="button" data-x="perm">${perms[t.uid] && perms[t.uid].post ? "Thu hồi quyền đăng" : "Cấp quyền đăng"}</button>
    <button class="btn ghost sm" type="button" data-x="close">${t.status === "closed" ? "Mở lại" : "Đóng"}</button>
    ${t.ref && t.ref.catId && t.ref.key && S.catById(t.ref.catId) ? `<a class="btn ghost sm" href="${S.itemHref(t.ref.catId, t.ref.key)}">Xem mục</a>` : ""}
    <button class="ib del" type="button" data-x="del" aria-label="Xóa cuộc trò chuyện">${ICO.trash}</button></div><small class="cv-mail" translate="no">${esc(emailOf(t.uid))}</small>`;
  const onExtra = (head, t) => { const bar = head.querySelector(".chat-tools"); if (!bar) return; bar.addEventListener("click", async e => {
    const b = e.target.closest("[data-x]"); if (!b) return; const x = b.dataset.x;
    try {
      if (x === "perm") { const on = !(perms[t.uid] && perms[t.uid].post); await H.grantPost(t.uid, on); toast(on ? "Đã cấp quyền đăng bài." : "Đã thu hồi quyền đăng bài."); }
      else if (x === "close") await H.setThreadStatus(t.uid, t.key, t.status === "closed" ? "open" : "closed");
      else if (x === "del") armDelete(b, () => H.deleteThread(t.uid, t.key).then(() => { toast("Đã xóa."); select(null); }).catch(z => toast(friendly(z), "err")), { title: "Xóa cuộc trò chuyện?", message: "Toàn bộ tin nhắn của cuộc trò chuyện này sẽ bị xóa.", kind: "delete" });
    } catch (z) { toast(friendly(z), "err"); }
  }); };
  const setUrl = k => { const u = "/inbox" + (k ? "/" + encodeURIComponent(k) : ""); if (location.pathname !== u) { try { history.pushState(history.state, "", u); } catch (_) {} } };
  const startChatForm = () => {
    cv.innerHTML = `<form class="mbx-start" id="cf" novalidate><span class="mbx-art sm">${ICO.chat}</span><h3>Nhắn tin với dev</h3><p>Hỏi nhanh hoặc trao đổi trực tiếp với quản trị viên. Câu trả lời sẽ hiện ngay tại đây.</p>
      <div class="field"><label class="sr" for="ct">Tin nhắn đầu tiên</label><textarea id="ct" rows="4" maxlength="2000" placeholder="Bạn cần gì?"></textarea></div><p class="form-error" id="ce" role="alert"></p>
      <div class="form-acts"><button class="btn primary" type="submit">${ICO.send}Bắt đầu trò chuyện</button></div></form>`;
    root.classList.add("has-sel");
    cv.querySelector("#cf").addEventListener("submit", async e => {
      e.preventDefault(); const er = cv.querySelector("#ce"); er.textContent = "";
      try { await H.createThread({ type: "chat", subject: "Nhắn tin với dev", text: cv.querySelector("#ct").value, id: "chat" }); select("chat", true); } catch (x) { er.textContent = friendly(x); }
    });
  };
  function select(k, push) {
    if (offConv) { offConv(); offConv = null; }
    sel = k || null; root.classList.toggle("has-sel", !!sel);
    if (!sel) { placeholder(); setUrl(null); drawList(); return; }
    if (push !== false) setUrl(sel);
    let uid = me, tid = sel; if (dev) { const i = sel.indexOf("."); uid = sel.slice(0, i); tid = sel.slice(i + 1); }
    if (!dev && sel === "chat" && loaded && !all.some(t => t.key === "chat")) { startChatForm(); drawList(); return; }
    cv.innerHTML = ""; offConv = mountConversation(cv, { uid, tid, asDev: dev, peer: { name: dev ? who(uid) : "" }, extra, onExtra, onBack: () => select(null) });
    drawList();
  }
  const composeSheet = () => {
    const h = openPopup({ id: "compose", variant: "sheet", title: "Tin nhắn mới", icon: "envelope", tone: "mail",
      html: `<div class="pk"><button class="pk-opt" type="button" data-k="chat"><span class="pk-ico c1">${ICO.chat}</span><span><b>Nhắn tin với dev</b><small>Hỏi nhanh, dev trả lời ngay trong hộp thư.</small></span></button>
        <button class="pk-opt" type="button" data-k="support"><span class="pk-ico c2">${ICO.mail}</span><span><b>Gửi yêu cầu hỗ trợ</b><small>Gặp lỗi, cần giúp đỡ hoặc xin quyền đăng bài.</small></span></button>
        <a class="pk-opt" href="/help/report" data-k="report"><span class="pk-ico c3">${ICO.flag}</span><span><b>Báo cáo nội dung</b><small>Mã độc, lừa đảo, link hỏng, vi phạm bản quyền…</small></span></a></div>` });
    h.el.addEventListener("click", e => {
      const b = e.target.closest("[data-k]"); if (!b || b.tagName === "A") return;
      if (b.dataset.k === "chat") { h.close(); select("chat"); }
      else if (b.dataset.k === "support") {
        h.setBody(`<form class="pk-form" id="sf" novalidate><div class="field"><label for="ss">Chủ đề</label><input id="ss" maxlength="120" autocomplete="off" placeholder="Ví dụ: Không vào được tài khoản"></div>
          <div class="field"><label for="sm">Nội dung</label><textarea id="sm" rows="5" maxlength="2000" placeholder="Mô tả vấn đề của bạn…"></textarea></div>
          <label class="check"><input type="checkbox" id="sp"><span>Mình muốn xin quyền đăng bài</span></label><p class="form-error" id="se" role="alert"></p>
          <div class="form-acts"><button class="btn ghost" type="button" id="sx">Quay lại</button><button class="btn primary" type="submit">${ICO.send}Gửi</button></div></form>`);
        const f = h.el.querySelector("#sf"); f.querySelector("#ss").focus();
        f.querySelector("#sx").addEventListener("click", () => { h.close(true); composeSheet(); });
        f.addEventListener("submit", async ev => { ev.preventDefault(); const er = f.querySelector("#se"); er.textContent = ""; if (!f.querySelector("#ss").value.trim()) { er.textContent = "Hãy nhập chủ đề."; return; }
          try { const tid = await H.createThread({ type: "support", subject: f.querySelector("#ss").value, text: f.querySelector("#sm").value, wantPost: f.querySelector("#sp").checked }); toast("Đã gửi yêu cầu. Quản trị viên sẽ trả lời trong hộp thư."); h.close(true); select(tid); } catch (x) { er.textContent = friendly(x); } });
      }
    });
  };
  const nb = ctx.el.querySelector("#mbNew"); if (nb) nb.addEventListener("click", composeSheet);
  ctx.el.querySelector("#chips").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; ctx.el.querySelectorAll("#chips button").forEach(x => x.classList.toggle("on", x === b)); drawList(); });
  ctx.el.querySelector("#mbQ").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); drawList(); });
  tl.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) select(b.dataset.k); });
  const route = () => { const k = ctx.params.tid ? (ctx.params.tid) : ""; if (k) select(k, false); else placeholder(); };
  const first = () => { if (!loaded) { loaded = true; drawList(); route(); } else drawList(); };
  const offs = dev ? [H.listenAllThreads(v => { all = v; first(); }), H.listenPerms(v => { perms = v; }), S.subscribe(t => { if (t === "users") drawList(); })]
    : [H.listenMyThreads(v => { all = v.map(t => ({ ...t, uid: me, tid: t.key })); first(); })];
  return () => { offs.forEach(f => f()); if (offConv) offConv(); };
}
