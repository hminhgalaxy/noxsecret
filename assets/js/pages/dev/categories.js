/* Quản lý danh mục: thêm, sửa, xóa — kể cả Script / APK / iOS / Link (không còn cố định). Mỗi danh mục có phân loại rủi ro và kiểu nội dung. */
import { esc, toast } from "../../lib/util.js";
import { ICO, PICK_ICONS } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { icoOf, armDelete } from "../../lib/ui.js";
import { formDialog } from "../../lib/confirm.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Danh mục", crumbs: devCrumb, sub: "Thêm, sửa hoặc xóa mọi danh mục. Xóa danh mục không xóa nội dung bên trong. Danh mục có phân loại rủi ro sẽ hiện cảnh báo cho người xem.", noindex: true });
  let icon = PICK_ICONS[0];
  ctx.el.innerHTML = `<form class="formcard" id="f" novalidate>
    <div class="field"><label for="name">Tên danh mục <b class="req" aria-hidden="true">*</b></label><input id="name" name="name" placeholder="Ví dụ: Mod, Tool…" autocomplete="off" maxlength="40"><p class="field-error" data-err="name" role="alert"></p></div>
    <div class="field"><label for="sub">Mô tả ngắn</label><input id="sub" name="sub" autocomplete="off" maxlength="120" placeholder="Danh mục này chứa gì?"></div>
    <div class="field"><label for="risk">Phân loại</label><select id="risk" name="risk">${Object.entries(S.RISKS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select><p class="sub-note">Phần mềm bên thứ ba, hack hoặc mod sẽ bắt người xem đọc cảnh báo 20 giây trước khi vào.</p></div>
    <div class="field"><label for="need">Mục trong danh mục cần có</label><select id="need" name="need">${Object.entries(S.NEEDS).map(([v, l]) => `<option value="${v}"${v === "any" ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><span class="label">Biểu tượng</span><div class="icons-pick" id="icons" role="radiogroup" aria-label="Biểu tượng"></div></div>
    <p class="form-error" id="err" role="alert"></p>
    <div class="form-acts"><button class="btn primary" type="submit">${ICO.plus}Thêm danh mục</button></div></form>
    <span class="dsec" style="margin-top:26px">Tất cả danh mục</span><div class="dlist" id="list"></div>`;
  const list = ctx.el.querySelector("#list"), f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), icons = ctx.el.querySelector("#icons");
  const drawIcons = () => { icons.innerHTML = PICK_ICONS.map(k => `<button type="button" role="radio" aria-checked="${k === icon}" data-ic="${k}" class="${k === icon ? "on" : ""}" aria-label="Biểu tượng ${k}">${ICO[k]}</button>`).join(""); };
  icons.addEventListener("click", e => { const b = e.target.closest("[data-ic]"); if (b) { icon = b.dataset.ic; drawIcons(); } }); drawIcons();
  const drawList = () => {
    const rm = S.store.removedBase || [];
    list.innerHTML = S.store.cats.map(c => `<div class="drow"><span class="ci">${icoOf(c)}</span><span class="nm">${esc(c.label)}${S.riskOf(c) ? ` <span class="badge strong">${esc(S.RISKS[c.risk])}</span>` : ""}<small>${esc(S.NEEDS[c.need] || "")}</small></span>
      <a class="ib" href="${S.catHref(c)}" aria-label="Mở ${esc(c.label)}">${ICO.eye}</a><button class="ib" type="button" data-edit="${esc(c.id)}" aria-label="Sửa danh mục ${esc(c.label)}">${ICO.pencil}</button><button class="ib del" type="button" data-cat="${esc(c.id)}" aria-label="Xóa danh mục ${esc(c.label)}">${ICO.trash}</button></div>`).join("")
      + (rm.length ? `<p class="sub-note" style="margin-top:14px">Danh mục đã xóa (nội dung vẫn còn): ${rm.map(b => `<button class="btn ghost sm" type="button" data-restore="${esc(b.id)}">Khôi phục ${esc(b.label)}</button>`).join(" ")}</p>` : "");
  };
  list.addEventListener("click", async e => {
    const ed = e.target.closest("[data-edit]"), rs = e.target.closest("[data-restore]");
    if (rs) { S.restoreCategory(rs.dataset.restore).then(() => toast("Đã khôi phục danh mục.")).catch(x => toast(friendly(x), "err")); return; }
    if (ed) {
      const c = S.catById(ed.dataset.edit); if (!c) return;
      const v = await formDialog({ title: "Sửa danh mục", message: "", ok: "Lưu", fields: [
        { id: "name", label: "Tên danh mục", value: c.label, max: 60 }, { id: "sub", label: "Mô tả ngắn", value: c.sub, max: 120 },
        { id: "icon", label: "Biểu tượng", value: c.icon || "box", options: PICK_ICONS.map(k => [k, k]) },
        { id: "risk", label: "Phân loại", value: c.risk || "", options: Object.entries(S.RISKS) }, { id: "need", label: "Mục cần có", value: c.need || "any", options: Object.entries(S.NEEDS) }] });
      if (!v) return; if (!String(v.name).trim()) { toast("Vui lòng nhập tên danh mục.", "err"); return; }
      S.updateCategory(c.id, { name: v.name.trim(), sub: v.sub.trim(), icon: v.icon, risk: v.risk, need: v.need, color: c.color }).then(() => toast("Đã lưu danh mục.")).catch(x => toast(friendly(x), "err")); return;
    }
    const b = e.target.closest("[data-cat]"); if (b) armDelete(b, () => S.deleteCategory(b.dataset.cat).then(() => toast("Đã xóa danh mục.")).catch(x => toast(friendly(x), "err")), { title: "Xóa danh mục này?", message: "Nội dung bên trong danh mục sẽ không bị xóa." });
  });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; const en = ctx.el.querySelector('[data-err="name"]'); en.textContent = "";
    const name = f.name.value.trim(); if (!name) { en.textContent = "Vui lòng nhập tên danh mục."; f.name.focus(); return; }
    const btn = f.querySelector("button[type=submit]"); btn.classList.add("busy");
    try { await S.addCategory({ name, sub: f.sub.value.trim(), icon, color: "#a3a3a3", risk: f.risk.value, need: f.need.value }); toast("Đã thêm danh mục " + name + "."); f.reset(); icon = PICK_ICONS[0]; drawIcons(); }
    catch (x) { err.textContent = friendly(x); } btn.classList.remove("busy");
  });
  drawList(); return S.subscribe(t => { if (t === "cats") drawList(); });
}
