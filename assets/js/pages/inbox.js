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
import { db } from "../lib/firebase.js";
import { shop, subscribeShop, startShop } from "../lib/shop.js";
import { buildActivity, activityHTML, FILTERS as ACT_F } from "../lib/activity.js";

const FILTERS_U = [["all", "Tất cả"], ["unread", "Chưa đọc"], ["old", "Cũ"]];
const FILTERS_D = [["all", "Tất cả"], ["unread", "Chưa trả lời"], ["chat", "Nhắn tin"], ["post", "Xin quyền đăng"], ["old", "Cũ"]];
const ago = ts => { const s = Math.max(0, (Date.now() - (ts || 0)) / 1000); if (s < 60) return "Vừa xong"; if (s < 3600) return Math.floor(s / 60) + " phút"; if (s < 86400) return Math.floor(s / 3600) + " giờ"; if (s < 7 * 86400) return Math.floor(s / 86400) + " ngày"; return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }); };
const TYPE_ICO = { report: "flag", chat: "chat", support: "mail" };
const ACT_TABS = [["msg", "Tin nhắn"], ["act", "Hoạt động"]];

export function mount(ctx) {
  const dev = session.isDev, me = session.user.uid;
  ctx.setPage({ title: "Hộp thư", sub: dev ? "Tin nhắn của người dùng và việc cần xử lý." : "Tin nhắn với quản trị viên và hoạt động tài khoản của bạn.", crumbs: [], noindex: true });
  let all = [], perms = {}, filter = "all", q = "", sel = null, offConv = null, loaded = false;
  const FIL = dev ? FILTERS_D : FILTERS_U;
  const startTab = ctx.query.get("tab") === "activity" ? "act" : "msg";
  ctx.el.innerHTML = `<div class="mbx-tabs" id="mbT" role="tablist">${ACT_TABS.map(([v, l]) => `<button type="button" role="tab" data-v="${v}" aria-selected="${v === startTab}" class="${v === startTab ? "on" : ""}">${l}</button>`).join("")}</div><div class="mbx-wrap" id="mbMsg"${startTab === "act" ? " hidden" : ""}><div class="mbx" id="mbx"><aside class="mbx-side" aria-label="Danh sách cuộc trò chuyện">
      <div class="mbx-top"><h2>Hộp thư</h2>${dev ? "" : `<button class="btn primary sm" id="mbNew" type="button">${ICO.chat}Nhắn với dev</button>`}</div>
      <div class="mbx-search"><span aria-hidden="true">${ICO.search}</span><input id="mbQ" type="search" placeholder="Tìm cuộc trò chuyện" aria-label="Tìm cuộc trò chuyện" autocomplete="off"></div>
      <div class="chips" id="chips" role="tablist">${FIL.map(([v, l]) => `<button type="button" role="tab" data-f="${v}" class="${v === "all" ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="mbx-list" id="tl"><div class="statebox sm"><p>Đang tải…</p></div></div></aside>
    <section class="mbx-main" id="cv" aria-live="polite"></section></div></div><div class="act-wrap" id="mbAct"${startTab === "act" ? "" : " hidden"}></div>`;
  const root = ctx.el.querySelector("#mbx"), tl = ctx.el.querySelector("#tl"), cv = ctx.el.querySelector("#cv");
  const who = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return u ? (u.name || u.email || uid) : "Người dùng"; };
  const emailOf = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return (u && u.email) || ""; };
  const keyOf = t => dev ? t.uid + "." + t.tid : t.key;
  const pass = t => {
    if (q) { const hay = ((t.subject || "") + " " + (t.preview || "") + " " + (dev ? who(t.uid) + " " + emailOf(t.uid) : "")).toLowerCase(); if (!hay.includes(q)) return false; }
    return filter === "all" || (filter === "unread" ? (dev ? t.last === "user" && t.status !== "closed" : !!t.unreadUser) : filter === "post" ? !!t.wantPost : filter === "old" ? (t.type === "support" || t.type === "report") : t.type === filter);
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
    }).join("") : `<div class="statebox sm">${ICO.chat}<p>${loaded ? (all.length ? "Không có cuộc trò chuyện nào khớp." : (dev ? "Chưa có tin nhắn nào." : "Bạn chưa có tin nhắn nào. Bấm “Nhắn với dev” để bắt đầu.")) : "Đang tải…"}</p></div>`;
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
  /* ───── Tab "Hoạt động": đơn hàng, hóa đơn nạp, hoàn tiền; dev thêm "việc cần xử lý" ───── */
  const actBox = ctx.el.querySelector("#mbAct"), msgBox = ctx.el.querySelector("#mbMsg"); let actF = "all", todo = { manual: 0, unmatched: 0, pending: 0 };
  const drawAct = () => {
    const L = buildActivity().filter(a => actF === "all" || a.k === actF);
    actBox.innerHTML = `${dev ? `<div class="act-todo" aria-label="Việc cần xử lý"><a href="/dev/shop" class="todo${todo.manual ? " hot" : ""}"><b>${todo.manual}</b><span>Đơn cần giao tay</span></a><a href="/dev/shop" class="todo${todo.unmatched ? " hot" : ""}"><b>${todo.unmatched}</b><span>Giao dịch ngân hàng chưa khớp</span></a><a href="/dev/review" class="todo${todo.pending ? " hot" : ""}"><b>${todo.pending}</b><span>Bài chờ duyệt</span></a></div>` : ""}
      <div class="chips" id="actChips" role="tablist">${ACT_F.map(([v, l]) => `<button type="button" role="tab" data-f="${v}" class="${v === actF ? "on" : ""}">${l}</button>`).join("")}</div>
      ${shop.orders === null && shop.topups === null ? '<div class="statebox sm"><p>Đang tải…</p></div>' : activityHTML(L, "Chưa có hoạt động nào. Hãy nạp tiền hoặc mua hàng để bắt đầu.")}`;
    actBox.querySelectorAll("#actChips [data-f]").forEach(b => b.addEventListener("click", () => { actF = b.dataset.f; drawAct(); }));
  };
  const showTab = v => { const a = v === "act"; msgBox.hidden = a; actBox.hidden = !a; ctx.el.querySelectorAll("#mbT [data-v]").forEach(b => { const on = b.dataset.v === v; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }); if (a) drawAct(); };
  ctx.el.querySelector("#mbT").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) { showTab(b.dataset.v); const u = new URL(location.href); b.dataset.v === "act" ? u.searchParams.set("tab", "activity") : u.searchParams.delete("tab"); try { history.replaceState(history.state, "", u.pathname + u.search); } catch (_) {} } });
  startShop(); if (startTab === "act") drawAct();
  const nb = ctx.el.querySelector("#mbNew"); if (nb) nb.addEventListener("click", () => select("chat"));
  ctx.el.querySelector("#chips").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; ctx.el.querySelectorAll("#chips button").forEach(x => x.classList.toggle("on", x === b)); drawList(); });
  ctx.el.querySelector("#mbQ").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); drawList(); });
  tl.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) select(b.dataset.k); });
  const route = () => { const k = ctx.params.tid ? (ctx.params.tid) : ""; if (k) select(k, false); else placeholder(); };
  const first = () => { if (!loaded) { loaded = true; drawList(); route(); } else drawList(); };
  const offs = [subscribeShop(t => { if (!actBox.hidden && (t === "orders" || t === "topups" || t === "txs")) drawAct(); })].concat(dev ? [H.listenAllPending(v => { todo.pending = (v || []).filter(p => p.status === "pending").length; if (!actBox.hidden) drawAct(); }), (() => { const r1 = db.ref("nox_orders"), h1 = r1.on("value", sn => { const v = sn.val() || {}; todo.manual = Object.values(v).reduce((n, o) => n + Object.values(o || {}).filter(x => x.status === "paid" && x.manual && !x.delivered).length, 0); if (!actBox.hidden) drawAct(); }, () => {}); return () => r1.off("value", h1); })(), (() => { const r2 = db.ref("nox_bankhook"), h2 = r2.on("value", sn => { todo.unmatched = Object.values(sn.val() || {}).filter(x => x.status === "unmatched").length; if (!actBox.hidden) drawAct(); }, () => {}); return () => r2.off("value", h2); })()] : []).concat(dev ? [H.listenAllThreads(v => { all = v; first(); }), H.listenPerms(v => { perms = v; }), S.subscribe(t => { if (t === "users") drawList(); })]
    : [H.listenMyThreads(v => { all = v.map(t => ({ ...t, uid: me, tid: t.key })); first(); })]);
  return () => { offs.forEach(f => f()); if (offConv) offConv(); };
}
