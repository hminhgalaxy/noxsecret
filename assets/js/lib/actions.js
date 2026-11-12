/* Các thao tác bấm dùng chung (sao chép, thử lại, đăng xuất, mở thẻ) — gắn một lần cho cả trang. */
import { $, toast, copyText, copyFx } from "./util.js";
import { navigate } from "./router.js";
import { signOut, signOutBlocked } from "./auth.js";
import { confirmDialog } from "./confirm.js";
import * as S from "./store.js";
import { toggleSound } from "./media.js";
import { closeDrawer } from "./nav.js";
import { doLike, doSave, openItemMenu, refreshButtons } from "./itemactions.js";
import { onFavs } from "./favs.js";

export function initActions() {
  S.subscribe(t => { if (t === "likes") refreshButtons(); }); onFavs(() => refreshButtons());
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]");
    if (!t) {
      if (e.target.closest("[data-stop]") || e.target.closest("a,button,input,select,textarea,label")) return;
      const card = e.target.closest(".card[data-href]"); if (card) navigate(card.dataset.href); return;
    }
    const act = t.dataset.act;
    if (act === "like") { e.preventDefault(); doLike(t); return; }
    if (act === "save") { e.preventDefault(); doSave(t.dataset.cat, t.dataset.key); return; }
    if (act === "itemmenu") { e.preventDefault(); openItemMenu(t, t.dataset.cat, t.dataset.key); return; }
    if (act === "copycode") {
      const it = S.item(t.dataset.cat, t.dataset.key);
      if (!it || !it.code) return toast("Không có code để sao chép.", "err");
      copyText(it.code).then(() => { toast("Đã sao chép code."); copyFx(t); S.incCopies(t.dataset.cat, it); }).catch(() => toast("Không sao chép được.", "err"));
    } else if (act === "copyurl") copyText(t.dataset.url).then(() => { toast("Đã sao chép link."); copyFx(t); }).catch(() => toast("Không sao chép được.", "err"));
    else if (act === "retry") { S.retryCat(t.dataset.cat); toast("Đang tải lại…"); }
    else if (act === "sound") toggleSound();
    else if (act === "signout") { closeDrawer(); if (signOutBlocked()) { toast("Website đang bảo trì: tài khoản quản trị không thể đăng xuất lúc này.", "err"); return; } confirmDialog({ kind: "signout", title: "Đăng xuất?", message: "Bạn sẽ cần đăng nhập lại để dùng hồ sơ của mình.", ok: "Đăng xuất", cancel: "Ở lại" }).then(yes => yes && signOut().then(() => toast("Đã đăng xuất.")).catch(() => toast("Đăng xuất chưa được. Vui lòng thử lại.", "err"))); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("card") && document.activeElement.dataset.href) navigate(document.activeElement.dataset.href);
    if (e.key === "Escape") closeDrawer();
  });
}
