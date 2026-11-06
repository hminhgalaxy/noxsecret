/* Các thao tác bấm dùng chung (sao chép, thử lại, đăng xuất, mở thẻ) — gắn một lần cho cả trang. */
import { $, toast, copyText, copyFx } from "./util.js";
import { navigate } from "./router.js";
import { signOut } from "./auth.js";
import * as S from "./store.js";
import { toggleSound } from "./media.js";
import { closeDrawer } from "./nav.js";

export function initActions() {
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]");
    if (!t) {
      if (e.target.closest("[data-stop]") || e.target.closest("a,button,input,select,textarea,label")) return;
      const card = e.target.closest(".card[data-href]"); if (card) navigate(card.dataset.href); return;
    }
    const act = t.dataset.act;
    if (act === "copycode") {
      const it = S.item(t.dataset.cat, t.dataset.key);
      if (!it || !it.code) return toast("Không có code để sao chép.", "err");
      copyText(it.code).then(() => { toast("Đã sao chép code."); copyFx(t); S.incCopies(t.dataset.cat, it); }).catch(() => toast("Không sao chép được.", "err"));
    } else if (act === "copyurl") copyText(t.dataset.url).then(() => { toast("Đã sao chép link."); copyFx(t); }).catch(() => toast("Không sao chép được.", "err"));
    else if (act === "retry") { S.retryCat(t.dataset.cat); toast("Đang tải lại…"); }
    else if (act === "sound") toggleSound();
    else if (act === "signout") { closeDrawer(); signOut().then(() => toast("Đã đăng xuất.")).catch(() => toast("Đăng xuất chưa được. Vui lòng thử lại.", "err")); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("card") && document.activeElement.dataset.href) navigate(document.activeElement.dataset.href);
    if (e.key === "Escape") closeDrawer();
  });
}
