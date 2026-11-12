/* Nút trên mỗi bài viết: Thích (đếm công khai, cần tài khoản thật), menu 3 chấm (Lưu, Chia sẻ, Sao chép liên kết, Mở tab mới, Báo cáo, Sửa/Xóa cho nhân sự) và Lưu bài viết. */
import { toast, copyText, esc } from "./util.js";
import { ICO } from "./icons.js";
import * as S from "./store.js";
import { session } from "./auth.js";
import { openPopup } from "./popup.js";
import { isFav, toggleFav } from "./favs.js";
import { navigate } from "./router.js";
import { armDelete } from "./ui.js";
import { friendly } from "./messages.js";

const attrs = (c, k) => `data-cat="${esc(c)}" data-key="${esc(k)}"`;
export const likeBtnHTML = (c, k, cls = "") => { const i = S.likeInfo(c, k);
  return `<button class="like-btn${i.mine ? " on" : ""} ${cls}" type="button" data-act="like" ${attrs(c, k)} data-stop aria-pressed="${i.mine}" aria-label="Thích"><span class="lk-ico">${i.mine ? ICO.heartFill : ICO.heart}</span><b class="lk-n">${i.n || ""}</b></button>`; };
export const moreBtnHTML = (c, k) => `<button class="dots-btn" type="button" data-act="itemmenu" ${attrs(c, k)} data-stop aria-haspopup="menu" aria-label="Thêm tùy chọn">${ICO.dots}</button>`;
export const saveBtnHTML = (c, k, cls = "btn ghost") => { const on = isFav(c, k);
  return `<button class="${cls} save-btn${on ? " on" : ""}" type="button" data-act="save" ${attrs(c, k)} aria-pressed="${on}">${on ? ICO.bookmarkFill : ICO.bookmark}<span>${on ? "Đã lưu" : "Lưu bài viết"}</span></button>`; };

/* Cập nhật mọi nút Thích / Lưu đang hiện trên trang (không dựng lại danh sách) */
export function refreshButtons(root = document) {
  root.querySelectorAll('[data-act="like"]').forEach(b => { const i = S.likeInfo(b.dataset.cat, b.dataset.key); b.classList.toggle("on", i.mine); b.setAttribute("aria-pressed", String(i.mine));
    const ic = b.querySelector(".lk-ico"); if (ic) ic.innerHTML = i.mine ? ICO.heartFill : ICO.heart; const n = b.querySelector(".lk-n"); if (n && n.textContent !== String(i.n || "")) n.textContent = i.n || ""; });
  root.querySelectorAll('[data-act="save"]').forEach(b => { const on = isFav(b.dataset.cat, b.dataset.key); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    const sp = b.querySelector("span"); if (sp) sp.textContent = on ? "Đã lưu" : "Lưu bài viết"; const svg = b.querySelector("svg"); if (svg) svg.outerHTML = on ? ICO.bookmarkFill : ICO.bookmark; });
}
export async function doLike(btn) {
  const c = btn.dataset.cat, k = btn.dataset.key; btn.classList.add("pop");
  setTimeout(() => btn.classList.remove("pop"), 400);
  try { const on = await S.toggleLike(c, k); if (on) toast("Đã thích bài viết.", "ok"); }
  catch (e) { if (e && e.code === "app/login") { toast("Hãy đăng nhập để thích bài viết.", "err"); navigate("/login?next=" + encodeURIComponent(location.pathname + location.search)); } else toast(friendly(e), "err"); }
  refreshButtons();
}
export function doSave(c, k) { const on = toggleFav(c, k); toast(on ? "Đã lưu bài viết." : "Đã bỏ lưu bài viết.", "ok"); refreshButtons(); return on; }
export async function shareItem(c, k) {
  const it = S.item(c, k); if (!it) return;
  const url = location.origin + S.itemHref(c, k), data = { title: it.name + " · SKIBIDI SCRIPT WEB", text: it.desc ? String(it.desc).slice(0, 120) : it.name, url };
  try { if (navigator.share && matchMedia("(pointer:coarse)").matches) { await navigator.share(data); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  copyText(url).then(() => toast("Đã sao chép liên kết để chia sẻ.", "ok")).catch(() => toast("Không sao chép được liên kết.", "err"));
}
export function openItemMenu(anchor, c, k) {
  const it = S.item(c, k), cat = S.catById(c); if (!it || !cat) return;
  const staff = session.isDev || session.isEditor, href = S.itemHref(c, k), saved = isFav(c, k), mine = S.likeInfo(c, k).mine;
  const row = (id, ico, label, cls = "") => `<button class="pm-item ${cls}" type="button" role="menuitem" data-m="${id}"><span class="pm-ico">${ico}</span><span>${label}</span></button>`;
  const h = openPopup({ id: "itemmenu", variant: "menu", anchor, title: "Tùy chọn bài viết",
    html: `<div class="pm">${row("like", mine ? ICO.heartFill : ICO.heart, mine ? "Bỏ thích" : "Thích")}${row("save", saved ? ICO.bookmarkFill : ICO.bookmark, saved ? "Bỏ lưu bài viết" : "Lưu bài viết")}
      <hr>${row("share", ICO.share, "Chia sẻ…")}${row("copy", ICO.copy, "Sao chép liên kết")}${row("tab", ICO.newtab, "Mở trong tab mới")}${it.code ? row("code", ICO.script || ICO.copy, "Sao chép code") : ""}
      <hr>${row("report", ICO.flag, "Báo cáo bài viết")}${staff ? `<hr>${row("edit", ICO.pencil, "Sửa bài viết")}${row("del", ICO.trash, "Xóa bài viết", "danger")}` : ""}</div>` });
  h.el.addEventListener("click", async e => {
    const b = e.target.closest("[data-m]"); if (!b) return; const m = b.dataset.m;
    if (m === "like") { const fake = document.createElement("button"); fake.dataset.cat = c; fake.dataset.key = k; doLike(fake); }
    else if (m === "save") doSave(c, k);
    else if (m === "share") shareItem(c, k);
    else if (m === "copy") copyText(location.origin + href).then(() => toast("Đã sao chép liên kết.", "ok")).catch(() => toast("Không sao chép được liên kết.", "err"));
    else if (m === "tab") window.open(href, "_blank", "noopener");
    else if (m === "code") copyText(it.code).then(() => { toast("Đã sao chép code."); S.incCopies(c, it); }).catch(() => toast("Không sao chép được.", "err"));
    else if (m === "report") { if (!session.user || session.isGuest) { toast("Hãy đăng nhập để báo cáo bài viết.", "err"); navigate("/login?next=" + encodeURIComponent("/help/report?cat=" + c + "&key=" + k)); } else navigate("/help/report?cat=" + encodeURIComponent(c) + "&key=" + encodeURIComponent(k)); }
    else if (m === "edit") navigate(href + "/edit");
    else if (m === "del") armDelete(b, () => S.deleteItem(c, k).then(() => toast("Đã xóa.")).catch(x => toast(friendly(x), "err")), { title: "Xóa bài viết này?", message: "Bài sẽ bị xóa khỏi website. Hành động này không thể hoàn tác.", kind: "delete" });
  });
}
