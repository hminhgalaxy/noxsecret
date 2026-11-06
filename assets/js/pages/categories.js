/* Trang "Danh mục": tất cả danh mục dưới dạng ô lớn. */
import * as S from "../lib/store.js";
import { tileHTML, countUp, countOf, fresh } from "../lib/ui.js";

export function mount(ctx) {
  ctx.setPage({ title: "Danh mục", sub: "Chọn một danh mục để xem nội dung bên trong.", desc: "Tất cả danh mục Script, APK, iOS và liên kết hữu ích trên SKIBIDI SCRIPT WEB." });
  ctx.el.innerHTML = `<div class="tiles" id="tiles"></div>`;
  const box = ctx.el.querySelector("#tiles"); let key = "", first = true;
  const draw = () => {
    const k = S.store.cats.map(c => c.id).join();
    if (k !== key) { key = k; box.innerHTML = S.store.cats.map((c, i) => tileHTML(c, i)).join(""); if (first) { first = false; fresh(box); } }
    else S.store.cats.forEach(c => { const el = box.querySelector(`[data-tilenum="${CSS.escape(c.id)}"]`); if (el) countUp(el, countOf(c.id)); });
    ctx.setPage({ count: S.store.cats.length + " danh mục" });
  };
  draw(); return S.subscribe(t => { if (t === "cats" || t === "data") draw(); });
}
