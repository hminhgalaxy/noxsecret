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
      <div class="field"><label for="uG">Loại</label><select id="uG" name="tag"><option value="">Không phân loại</option>${Object.keys(S.UPD_TAGS).map(k => `<option value="${k}">${S.UPD_TAGS[k]}</option>`).join("")}</select></div>
      <div class="field"><label for="uB">Nội dung</label><textarea id="uB" name="body" rows="4" maxlength="2000" placeholder="Có gì mới trong lần cập nhật này? Bắt đầu dòng bằng dấu - để tạo danh sách."></textarea><p class="field-error" data-err="body" role="alert"></p></div>
      <p class="form-error" id="uE" role="alert"></p>
      <div class="form-acts"><button class="btn primary" id="uBtn" type="submit">${ICO.bell}<span id="uBtnT">Đăng cập nhật</span></button><button class="btn ghost" id="uCancel" type="button" hidden>Hủy sửa</button></div></form>
    <span class="dsec">Các bài đã đăng</span><div class="dlist" id="ul"></div>`;
  const f = ctx.el.querySelector("#uf"), list = ctx.el.querySelector("#ul"), btn = f.querySelector("#uBtn"), err = f.querySelector("#uE");
  const draw = () => {
    const a = S.store.updates;
    list.innerHTML = a.length ? a.map(u => `<div class="upd-row"><span class="nm"><b>${esc(u.title)}</b>${u.tag ? ` <small class="badge tag-${esc(u.tag)}">${esc(S.UPD_TAGS[u.tag])}</small>` : ""}<small>${esc(fmtTime(u.ts))}</small>${u.body ? `<p>${esc(u.body)}</p>` : ""}</span>
      <button class="ib" type="button" data-edit="${esc(u.key)}" aria-label="Sửa bài này">${ICO.pencil}</button><button class="ib del" type="button" data-del="${esc(u.key)}" aria-label="Xóa bài này">${ICO.trash || ICO.out}</button></div>`).join("") : `<div class="statebox"><p>Chưa có bài nào. Các ghi chú có sẵn của website vẫn hiện ở trang chủ.</p></div>`;
  };
  let editing = null;
  const setEdit = u => { editing = u ? u.key : null; f.title.value = u ? u.title : ""; f.body.value = u ? u.body : ""; f.tag.value = u ? u.tag || "" : ""; ctx.el.querySelector("#uBtnT").textContent = u ? "Lưu thay đổi" : "Đăng cập nhật"; f.querySelector("#uCancel").hidden = !u; f.querySelector(".dsec").textContent = u ? "Sửa bài" : "Bài mới"; if (u) { f.scrollIntoView({ block: "start", behavior: "smooth" }); f.title.focus(); } };
  f.querySelector("#uCancel").addEventListener("click", () => setEdit(null));
  list.addEventListener("click", e => {
    const ed = e.target.closest("[data-edit]"); if (ed) { const u = S.store.updates.find(x => x.key === ed.dataset.edit); if (u) setEdit(u); return; }
    const b = e.target.closest("[data-del]"); if (!b) return;
    armDelete(b, () => S.deleteUpdate(b.dataset.del).then(() => toast("Đã xóa bài.")).catch(x => toast(friendly(x), "err")), { title: "Xóa bài cập nhật này?", message: "Bài sẽ biến mất khỏi trang chủ và trang Thông báo của mọi người." });
  });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; f.querySelectorAll(".field-error").forEach(x => { x.textContent = ""; });
    const title = f.title.value.trim(), body = f.body.value.trim();
    if (!title) { f.querySelector('[data-err="title"]').textContent = "Vui lòng nhập tiêu đề."; f.title.focus(); return; }
    btn.classList.add("busy"); btn.disabled = true;
    try { if (editing) { await S.updateUpdate(editing, { title, body, tag: f.tag.value }); setEdit(null); toast("Đã lưu thay đổi."); } else { await S.addUpdate({ title, body, tag: f.tag.value }); f.reset(); toast("Đã đăng cập nhật."); } } catch (x) { err.textContent = friendly(x); }
    btn.classList.remove("busy"); btn.disabled = false;
  });
  draw(); return S.subscribe(t => { if (t === "updates") draw(); });
}
