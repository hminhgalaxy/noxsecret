/* Tìm nhanh (Ctrl+K hoặc /): nhảy tới trang, danh mục hoặc một mục nội dung chỉ bằng bàn phím. */
import { esc, vi } from "./util.js";
import { ICO } from "./icons.js";
import { store, items, catById, itemHref } from "./store.js";
import { session } from "./auth.js";
import { navigate } from "./router.js";
import { recent } from "./favs.js";

let root = null, prev = null;
const pages = () => [
  { label: "Trang chủ", href: "/", icon: "home", kw: "home trang chu skibidiscript" }, { label: "Tất cả danh mục", href: "/categories", icon: "grid", kw: "categories danh muc" },
  { label: "Tìm kiếm", href: "/search", icon: "search", kw: "search tim kiem" }, { label: "Yêu thích", href: "/favorites", icon: "heart", kw: "favorites yeu thich da xem gan day recent" },
  { label: "Thông báo", href: "/notifications", icon: "bell", kw: "notifications thong bao cap nhat updates" }, { label: "Cài đặt", href: "/settings", icon: "gear", kw: "settings cai dat do hoa mau am thanh" },
  { label: "Câu hỏi thường gặp", href: "/help", icon: "bulb", kw: "help faq hoi dap tro giup" }, { label: "Hỗ trợ", href: "/help/support", icon: "mail", kw: "support ho tro" }, { label: "Báo cáo", href: "/help/report", icon: "flag", kw: "report bao cao" },
  { label: "skibidiscript là gì?", href: "/skibidiscript", icon: "home", kw: "about gioi thieu skibidiscript la gi" }, { label: "Hướng dẫn sử dụng", href: "/guide", icon: "book", kw: "guide huong dan" }, { label: "Tải APK an toàn", href: "/apk-safety", icon: "shield", kw: "apk safety an toan" },
  { label: "Bảo mật & an toàn", href: "/security", icon: "shield", kw: "security bao mat" }
].concat(session.user && !session.isGuest ? [{ label: "Hồ sơ", href: "/profile", icon: "user", kw: "profile ho so tai khoan" }, { label: "Hộp thư", href: "/inbox", icon: "envelope", kw: "inbox messages hop thu tin nhan" }, { label: "Đăng nội dung", href: "/help/submit", icon: "plus", kw: "submit dang bai gui bai" }] : [{ label: "Đăng nhập", href: "/login", icon: "user", kw: "login dang nhap" }])
  .concat(session.isDev ? [{ label: "Dev Panel", href: "/dev", icon: "shield", kw: "dev quan tri" }, { label: "Duyệt bài", href: "/dev/review", icon: "check", kw: "review duyet bai" }, { label: "Dev: Danh mục", href: "/dev/categories", icon: "grid", kw: "dev categories" }] : []);

export function search(q) {
  const k = vi(q).trim(), out = [];
  const hit = s => !k || vi(s).includes(k);
  pages().filter(p => hit(p.label + " " + p.kw)).slice(0, k ? 6 : 8).forEach(p => out.push({ g: "Trang", label: p.label, href: p.href, icon: p.icon }));
  store.cats.filter(c => hit(c.label + " " + (c.sub || ""))).slice(0, 5).forEach(c => out.push({ g: "Danh mục", label: c.label, href: "/" + c.path, icon: c.icon || c.id }));
  if (k) { let n = 0; for (const c of store.cats) { for (const it of items(c.id) || []) { if (n >= 8) break; if (hit(it.name + " " + (it.desc || ""))) { out.push({ g: "Nội dung", label: it.name, sub: c.label, href: itemHref(c.id, it.key), icon: c.icon || c.id }); n++; } } } }
  else recent().slice(0, 4).forEach(r => { const c = catById(r.c), it = c && (items(c.id) || []).find(x => x.key === r.k); if (it) out.push({ g: "Xem gần đây", label: it.name, sub: c.label, href: itemHref(c.id, it.key), icon: c.icon || c.id }); });
  if (k) out.push({ g: "Tìm kiếm", label: "Tìm “" + q.trim() + "” trong toàn bộ website", href: "/search?q=" + encodeURIComponent(q.trim()), icon: "search" });
  return out;
}

export function closePalette() { if (!root) return; root.remove(); root = null; document.documentElement.classList.remove("cmdk-open"); if (prev && prev.focus) try { prev.focus({ preventScroll: true }); } catch (_) {} }
export function openPalette() {
  if (root) { root.querySelector("input").focus(); return; }
  prev = document.activeElement; root = document.createElement("div"); root.className = "cmdk";
  root.innerHTML = `<div class="cmdk-ov" data-close></div><div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Tìm nhanh">
    <div class="cmdk-in">${ICO.search}<input id="cmdkQ" type="text" role="combobox" aria-expanded="true" aria-controls="cmdkL" aria-autocomplete="list" placeholder="Tìm trang, danh mục, nội dung…" autocomplete="off" spellcheck="false" enterkeyhint="go"><kbd>Esc</kbd></div>
    <ul class="cmdk-l" id="cmdkL" role="listbox"></ul><div class="cmdk-f"><span><kbd>↑</kbd><kbd>↓</kbd> chọn</span><span><kbd>Enter</kbd> mở</span><span><kbd>Esc</kbd> đóng</span></div></div>`;
  document.body.appendChild(root); document.documentElement.classList.add("cmdk-open");
  const inp = root.querySelector("input"), list = root.querySelector("#cmdkL"); let res = [], sel = 0;
  const draw = () => {
    res = search(inp.value); sel = Math.min(sel, Math.max(0, res.length - 1)); let g = "";
    list.innerHTML = res.length ? res.map((r, i) => { const h = r.g !== g ? `<li class="cmdk-g" role="presentation">${esc(r.g)}</li>` : ""; g = r.g; return h + `<li role="option" id="cmdk-${i}" class="cmdk-o${i === sel ? " on" : ""}" data-i="${i}" aria-selected="${i === sel}">${ICO[r.icon] || ICO.box}<span class="t">${esc(r.label)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</li>`; }).join("") : `<li class="cmdk-e">Không có kết quả.</li>`;
    inp.setAttribute("aria-activedescendant", res.length ? "cmdk-" + sel : "");
  };
  const mark = () => { list.querySelectorAll(".cmdk-o").forEach(o => { const on = +o.dataset.i === sel; o.classList.toggle("on", on); o.setAttribute("aria-selected", on); if (on) o.scrollIntoView({ block: "nearest" }); }); inp.setAttribute("aria-activedescendant", "cmdk-" + sel); };
  const go = i => { const r = res[i]; if (!r) return; closePalette(); navigate(r.href); };
  inp.addEventListener("input", () => { sel = 0; draw(); });
  root.addEventListener("keydown", e => {
    if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, res.length); mark(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + res.length) % Math.max(1, res.length); mark(); }
    else if (e.key === "Enter") { e.preventDefault(); go(sel); }
    else if (e.key === "Tab") { e.preventDefault(); inp.focus(); }
  });
  list.addEventListener("click", e => { const o = e.target.closest(".cmdk-o"); if (o) go(+o.dataset.i); });
  list.addEventListener("pointermove", e => { const o = e.target.closest(".cmdk-o"); if (o && +o.dataset.i !== sel) { sel = +o.dataset.i; mark(); } });
  root.addEventListener("click", e => { if (e.target.closest("[data-close]")) closePalette(); });
  draw(); inp.focus();
}
export function initPalette() {
  document.addEventListener("keydown", e => {
    const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); root ? closePalette() : openPalette(); }
    else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !document.querySelector(".cf-root")) { e.preventDefault(); openPalette(); }
  });
  document.addEventListener("click", e => { const b = e.target.closest("[data-open-palette]"); if (b) { e.preventDefault(); openPalette(); } });
}
