/* Khung "Nhắn với dev" nổi ở góc dưới bên phải (pop-up chat nhỏ). Dùng lại khung trò chuyện của Hộp thư nên có đủ
   ảnh / video / tệp đính kèm. Kèm số dư ví. Dev dùng Hộp thư nên không hiện với dev. */
import { session, onAuth } from "./auth.js";
import * as H from "./help.js";
import { mountConversation } from "./chatui.js";
import { ICO } from "./icons.js";
import { subscribeShop, balance, money, shop } from "./shop.js";
import { navigate } from "./router.js";
import { toast, esc } from "./util.js";
import { friendly } from "./messages.js";

const HIDE = /^\/(login|register|forgot-password|two-step|auth|inbox|dev)(\/|$)/;
let root, fab, panel, bodyEl, balEl, isOpen = false, offConv = () => {}, offThreads = () => {}, hasChat = null, unread = false, wired = false;
const real = () => !!(session.user && !session.isGuest);

function visible() { return !session.isDev && !HIDE.test(location.pathname); }
function paintFab() {
  if (!root) return;
  const v = visible(); root.hidden = !v; document.body.classList.toggle("has-cw", v);
  if (!v && isOpen) close();
  fab.classList.toggle("has-dot", unread && !isOpen);
  fab.setAttribute("aria-expanded", String(isOpen));
}
function paintBal() { if (balEl) { balEl.hidden = !real(); balEl.querySelector("b").textContent = shop.wallet ? money(balance()) : "…"; } }

function startForm() {
  offConv(); offConv = () => {};
  bodyEl.innerHTML = `<form class="cw-start" novalidate><span class="mbx-art sm">${ICO.chat}</span><h3>Nhắn tin với dev</h3><p>Hỏi nhanh hoặc nhờ hỗ trợ trực tiếp. Bạn có thể gửi cả ảnh, video và tệp.</p>
    <div class="field"><label class="sr" for="cwT">Tin nhắn đầu tiên</label><textarea id="cwT" rows="3" maxlength="2000" placeholder="Bạn cần gì?"></textarea></div><p class="form-error" id="cwE" role="alert"></p>
    <button class="btn primary block" type="submit">${ICO.send}Bắt đầu trò chuyện</button></form>`;
  const f = bodyEl.querySelector("form"), er = bodyEl.querySelector("#cwE"), b = f.querySelector("button");
  f.addEventListener("submit", async e => {
    e.preventDefault(); er.textContent = ""; b.disabled = true;
    try { await H.createThread({ type: "chat", subject: "Nhắn tin với dev", text: f.querySelector("#cwT").value, id: "chat" }); hasChat = true; showConv(); }
    catch (x) { er.textContent = friendly(x); b.disabled = false; }
  });
  setTimeout(() => { const t = f.querySelector("textarea"); if (t && isOpen) t.focus(); }, 60);
}
function showConv() {
  offConv(); bodyEl.innerHTML = "";
  offConv = mountConversation(bodyEl, { uid: session.user.uid, tid: "chat", asDev: false, peer: { name: "Dev" } });
}
function render() {
  if (!isOpen) return;
  if (!real()) { bodyEl.innerHTML = `<div class="statebox sm">${ICO.chat}<p>Hãy đăng nhập bằng tài khoản thật để nhắn tin với dev.</p><a class="btn primary" href="/login?next=${encodeURIComponent(location.pathname)}" data-cwlogin>Đăng nhập</a></div>`; const a = bodyEl.querySelector("[data-cwlogin]"); a.addEventListener("click", () => close()); return; }
  if (hasChat === null) { bodyEl.innerHTML = `<div class="statebox sm"><p>Đang tải…</p></div>`; return; }
  hasChat ? showConv() : startForm();
}
function watch() {
  offThreads(); offThreads = () => {}; hasChat = null; unread = false;
  if (!real() || session.isDev) { paintFab(); return; }
  offThreads = H.listenMyThreads(L => {
    const t = L.find(x => x.key === "chat"), had = hasChat; hasChat = !!t; unread = !!(t && t.unreadUser);
    paintFab(); if (isOpen && (had === null || had !== hasChat)) render();
  });
}

export function openChat() {
  if (!root) return;
  if (!real()) { toast("Hãy đăng nhập để nhắn tin với dev.", "err"); navigate("/login?next=" + encodeURIComponent(location.pathname)); return; }
  if (isOpen) { const t = panel.querySelector("textarea"); if (t) t.focus(); return; }
  isOpen = true; panel.hidden = false; requestAnimationFrame(() => panel.classList.add("on")); document.body.classList.add("cw-open"); paintFab(); paintBal(); render();
}
export function close() {
  if (!isOpen) return; isOpen = false; panel.classList.remove("on"); document.body.classList.remove("cw-open");
  offConv(); offConv = () => {}; bodyEl.innerHTML = ""; setTimeout(() => { if (!isOpen) panel.hidden = true; }, 220); paintFab(); fab.focus({ preventScroll: true });
}

export function initChatWidget() {
  if (wired) return; wired = true;
  root = document.createElement("div"); root.id = "cw"; root.hidden = true;
  root.innerHTML = `<section class="cw-panel" id="cwPanel" role="dialog" aria-label="Nhắn tin với dev" hidden>
      <header class="cw-head"><span class="cv-av dev" aria-hidden="true">D</span><div class="cw-who"><b>Nhắn với dev</b><small>skibidiscript</small></div>
        <a class="cw-bal" id="cwBal" href="/wallet" hidden title="Số dư ví">${ICO.wallet}<b>…</b></a>
        <button class="cw-x" type="button" aria-label="Thu nhỏ khung trò chuyện">${ICO.x}</button></header>
      <div class="cw-body" id="cwBody"></div></section>
    <button class="cw-fab" id="cwFab" type="button" aria-label="Nhắn tin với dev" aria-haspopup="dialog" aria-expanded="false">${ICO.chat}<i class="cw-dot" aria-hidden="true"></i></button>`;
  document.body.appendChild(root);
  fab = root.querySelector("#cwFab"); panel = root.querySelector("#cwPanel"); bodyEl = root.querySelector("#cwBody"); balEl = root.querySelector("#cwBal");
  fab.addEventListener("click", () => (isOpen ? close() : openChat()));
  root.querySelector(".cw-x").addEventListener("click", close);
  balEl.addEventListener("click", () => { if (matchMedia("(max-width:640px)").matches) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && isOpen && !document.querySelector(".pop-root .pop")) close(); });
  /* liên kết "Nhắn tin với dev" ở mọi nơi → mở khung nổi thay vì chuyển trang */
  document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest && e.target.closest('a[href="/help/chat"],a[href="/inbox/chat"],[data-open-chat]');
    if (!a || session.isDev) return; e.preventDefault(); e.stopPropagation(); openChat();
  }, true);
  addEventListener("ssw:route", () => { paintFab(); });
  subscribeShop(t => { if (t === "wallet") paintBal(); });
  onAuth(() => { watch(); paintBal(); paintFab(); if (isOpen) render(); });
  watch(); paintFab(); paintBal();
}
