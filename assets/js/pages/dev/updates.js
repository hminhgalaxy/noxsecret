/* Dev Panel → Cập nhật: đăng bài "Cập nhật này có gì?". Đăng xong, chuông thông báo của mọi người sẽ sáng lên. */
import { esc, toast, fmtTime } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { armDelete } from "../../lib/ui.js";
import { locked, devCrumb } from "./shared.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Cập nhật", crumbs: devCrumb, sub: "Đăng tin cập nhật. Mọi người sẽ thấy chuông thông báo sáng lên.", noindex: true });
  ctx.el.innerHTML = `<form class="formcard" id="uf" novalidate><span class="dsec">Bài mới</span>
      <div class="field"><label for="uT">Tiêu đề</label><input id="uT" name="title" maxlength="120" autocomplete="off" placeholder="Ví dụ: Thêm mục APK mới"><p class="field-error" data-err="title" role="alert"></p></div>
      <div class="field"><label for="uB">Nội dung</label><textarea id="uB" name="body" rows="4" maxlength="2000" placeholder="Có gì mới trong lần cập nhật này?"></textarea><p class="field-error" data-err="body" role="alert"></p></div>
      <p class="form-error" id="uE" role="alert"></p>
      <div class="form-acts"><button class="btn primary" id="uBtn" type="submit">${ICO.bell}Đăng cập nhật</button></div></form>
    <span class="dsec">Các bài đã đăng</span><div class="dlist" id="ul"></div>`;
  const f = ctx.el.querySelector("#uf"), list = ctx.el.querySelector("#ul"), btn = f.querySelector("#uBtn"), err = f.querySelector("#uE");
  const draw = () => {
    const a = S.store.updates;
    list.innerHTML = a.length ? a.map(u => `<div class="upd-row"><span class="nm"><b>${esc(u.title)}</b><small>${esc(fmtTime(u.ts))}</small>${u.body ? `<p>${esc(u.body)}</p>` : ""}</span>
      <button class="ib del" type="button" data-del="${esc(u.key)}" aria-label="Xóa bài này">${ICO.trash || ICO.out}</button></div>`).join("") : `<div class="statebox"><p>Chưa có bài nào. Các ghi chú có sẵn của website vẫn hiện ở trang chủ.</p></div>`;
  };
  list.addEventListener("click", e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    armDelete(b, () => S.deleteUpdate(b.dataset.del).then(() => toast("Đã xóa bài.")).catch(x => toast(friendly(x), "err")), { title: "Xóa bài cập nhật này?", message: "Bài sẽ biến mất khỏi trang chủ và trang Thông báo của mọi người." });
  });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; f.querySelectorAll(".field-error").forEach(x => { x.textContent = ""; });
    const title = f.title.value.trim(), body = f.body.value.trim();
    if (!title) { f.querySelector('[data-err="title"]').textContent = "Vui lòng nhập tiêu đề."; f.title.focus(); return; }
    btn.classList.add("busy"); btn.disabled = true;
    try { await S.addUpdate({ title, body }); f.reset(); toast("Đã đăng cập nhật."); } catch (x) { err.textContent = friendly(x); }
    btn.classList.remove("busy"); btn.disabled = false;
  });
  draw(); return S.subscribe(t => { if (t === "updates") draw(); });
}
