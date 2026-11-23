/* Quản lý dữ liệu: chọn danh mục cần quản lý + dọn dữ liệu Script/APK/iOS/Link cũ (đã bị xóa khỏi web). */
import * as S from "../../lib/store.js";
import { db } from "../../lib/firebase.js";
import { DATA_ROOT } from "../../lib/config.js";
import { tileHTML, countOf } from "../../lib/ui.js";
import { confirmDialog } from "../../lib/confirm.js";
import { toast } from "../../lib/util.js";
import { locked, devCrumb, dataHref } from "./shared.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Quản lý dữ liệu", crumbs: devCrumb, sub: "Chọn một danh mục để xem, thêm, sửa hoặc xóa nội dung.", noindex: true });
  let old = null; /* số mục cũ còn trong cơ sở dữ liệu (null = chưa biết) */
  const draw = () => {
    ctx.el.innerHTML = `<div class="tiles">${S.store.cats.map((c, i) => tileHTML(c, i, dataHref(c), countOf(c.id))).join("")}</div>`
      + (old ? `<section class="card" id="legacyBox" style="margin-top:18px"><h2 style="font-size:1.05rem">Dữ liệu cũ (Script, APK, iOS, Link)</h2><p class="sub-note">Các mục này đã bị xóa khỏi web nên không còn ai thấy, nhưng ${old} mục vẫn nằm trong cơ sở dữ liệu. Bấm xóa để dọn sạch hoàn toàn.</p><button class="btn danger" id="legacyDel" type="button">Xóa ${old} mục cũ vĩnh viễn</button></section>` : "");
    const b = ctx.el.querySelector("#legacyDel");
    if (b) b.addEventListener("click", async () => {
      if (!(await confirmDialog({ kind: "delete", title: "Xóa vĩnh viễn dữ liệu cũ?", message: "Toàn bộ " + old + " mục Script, APK, iOS và Link cũ sẽ bị xóa khỏi cơ sở dữ liệu và không khôi phục được.", ok: "Xóa vĩnh viễn" }))) return;
      b.disabled = true;
      try { await Promise.all(S.LEGACY_NODES.map(n => db.ref(DATA_ROOT + "/" + n).remove())); old = 0; toast("Đã dọn sạch dữ liệu cũ.", "ok"); draw(); }
      catch (e) { b.disabled = false; toast("Chưa xóa được. Vui lòng thử lại.", "err"); }
    });
  };
  draw();
  if (db) Promise.all(S.LEGACY_NODES.map(n => db.ref(DATA_ROOT + "/" + n).once("value").then(s => (s.val() ? Object.keys(s.val()).length : 0)).catch(() => 0))).then(a => { old = a.reduce((x, y) => x + y, 0); draw(); });
  return S.subscribe(t => { if (t === "data" || t === "cats") draw(); });
}
