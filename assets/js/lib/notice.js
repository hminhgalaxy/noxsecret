/* Hộp thông báo khi vào web: mỗi tab chỉ hiện một lần cho mỗi nội dung; có thể ẩn trong 2 giờ. */
import { $, $$, toast } from "./util.js";
import { store } from "./store.js";
import { closeDrawer } from "./nav.js";

let shown = false, allowed = false, lastFocus = null;
export function maybeNotice() {
  if (!allowed || shown) return;
  const n = store.notice; if (!n || n.enabled === false) return;
  if (!(n.body || "").trim() && !(n.title || "").trim()) return;
  if ($("#maint").classList.contains("on") || /^\/(notifications|login|register|forgot-password)(\/|$)/.test(location.pathname)) return;
  const ver = String(n.updatedAt || n.ts || ""); let rec = null;
  try { rec = JSON.parse(localStorage.getItem("ssw_notice") || "null"); } catch (_) {}
  if (rec && rec.until > Date.now() && rec.ver === ver) return;
  try { if (sessionStorage.getItem("ssw_notice_seen") === ver) return; sessionStorage.setItem("ssw_notice_seen", ver); } catch (_) {}
  shown = true; $("#ntTitle").textContent = (n.title || "").trim() || "Thông báo"; $("#ntBody").textContent = (n.body || "").trim();
  open();
}
export const allowNotice = () => { allowed = true; maybeNotice(); };
export const isNoticeOpen = () => $("#mdNotice").classList.contains("on");
function open() { lastFocus = document.activeElement; closeDrawer(); $("#mdNotice").classList.add("on"); $("#ov").classList.add("on"); document.body.classList.add("locked"); setTimeout(() => $("#ntClose").focus(), 140); }
export function closeNotice() {
  $("#mdNotice").classList.remove("on"); $("#ov").classList.remove("on");
  if (!$("#maint").classList.contains("on")) document.body.classList.remove("locked");
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) {} lastFocus = null;
}
export function initNotice() {
  $("#ntClose").addEventListener("click", closeNotice); $("#ov").addEventListener("click", closeNotice);
  $("#nt2h").addEventListener("click", () => {
    const n = store.notice || {};
    try { localStorage.setItem("ssw_notice", JSON.stringify({ until: Date.now() + 7200000, ver: String(n.updatedAt || n.ts || "") })); } catch (_) {}
    closeNotice(); toast("Đã ẩn thông báo trong 2 giờ.");
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && isNoticeOpen()) closeNotice();
    if (e.key === "Tab" && isNoticeOpen()) {
      const fs = $$("button", $("#mdNotice")); if (!fs.length) return; const a = fs[0], z = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
}
