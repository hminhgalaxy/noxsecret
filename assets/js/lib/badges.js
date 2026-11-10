/* Huy hiệu số: tin nhắn chưa đọc (người dùng), hộp thư và bài chờ duyệt (dev). Chấm nhỏ trên ảnh đại diện khi có việc cần xem. */
import { session, onAuth } from "./auth.js";
import { listenMyThreads, listenAllThreads, listenAllPending } from "./help.js";

const counts = {}; let offs = [];
export function applyBadges() {
  const nav = document.getElementById("sideNav");
  if (nav) {
    nav.querySelectorAll("a.nav-link[href]").forEach(a => {
      const n = counts[a.getAttribute("href")] || 0; let b = a.querySelector(":scope > .nav-badge");
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("span"); b.className = "nav-badge"; a.appendChild(b); }
      b.textContent = n > 99 ? "99+" : String(n); b.setAttribute("aria-label", n + " mục cần xem");
    });
    nav.querySelectorAll(".disc").forEach(d => {
      const btn = d.querySelector(":scope > .nav-btn"); if (!btn) return;
      const n = [...d.querySelectorAll("a.nav-link[href]")].reduce((s, a) => s + (counts[a.getAttribute("href")] || 0), 0); let b = btn.querySelector(".nav-badge");
      if (!n) { if (b) b.remove(); return; } if (!b) { b = document.createElement("span"); b.className = "nav-badge grp"; btn.appendChild(b); }
      b.textContent = n > 99 ? "99+" : String(n);
    });
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  document.querySelectorAll("#hdrAcc .avatar, #tabMe").forEach(a => a.classList.toggle("has-badge", total > 0));
  document.documentElement.dataset.unread = String(total);
}
function restart() {
  offs.forEach(f => { try { f(); } catch (_) {} }); offs = []; Object.keys(counts).forEach(k => delete counts[k]);
  if (session.user && !session.isGuest) {
    offs.push(listenMyThreads(l => { counts["/help/messages"] = l.filter(t => t.unreadUser === true).length; applyBadges(); }));
    if (session.isDev) {
      offs.push(listenAllThreads(l => { counts["/dev/inbox"] = l.filter(t => t.unreadDev === true && t.status !== "closed").length; applyBadges(); }));
      offs.push(listenAllPending(l => { counts["/dev/review"] = l.filter(p => p.status === "pending").length; applyBadges(); }));
    }
  }
  applyBadges();
}
export const initBadges = () => onAuth(restart);
