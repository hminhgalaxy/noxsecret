/* Danh mục tùy chỉnh: thêm mới và xóa. Danh mục mặc định không thể xóa. */
import { esc, toast } from "../../lib/util.js";
import { ICO, PICK_ICONS } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { icoOf, armDelete } from "../../lib/ui.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Danh mục", crumbs: devCrumb, sub: "Danh mục mặc định không thể xóa. Xóa danh mục tùy chỉnh sẽ không xóa nội dung bên trong.", noindex: true });
  let icon = PICK_ICONS[0];
  ctx.el.innerHTML = `<form class="formcard" id="f" novalidate>
    <div class="field"><label for="name">Tên danh mục <b class="req" aria-hidden="true">*</b></label><input id="name" name="name" placeholder="Ví dụ: Mod, Tool…" autocomplete="off" maxlength="40"><p class="field-error" data-err="name" role="alert"></p></div>
    <div class="field"><label for="sub">Mô tả ngắn</label><input id="sub" name="sub" autocomplete="off" maxlength="120" placeholder="Danh mục này chứa gì?"></div>
    <div class="field"><span class="label">Biểu tượng</span><div class="icons-pick" id="icons" role="radiogroup" aria-label="Biểu tượng"></div></div>
    <p class="form-error" id="err" role="alert"></p>
    <div class="form-acts"><button class="btn primary" type="submit">${ICO.plus}Thêm danh mục</button></div></form>
    <span class="dsec" style="margin-top:26px">Tất cả danh mục</span><div class="dlist" id="list"></div>`;
  const list = ctx.el.querySelector("#list"), f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err"), icons = ctx.el.querySelector("#icons");
  const drawIcons = () => { icons.innerHTML = PICK_ICONS.map(k => `<button type="button" role="radio" aria-checked="${k === icon}" data-ic="${k}" class="${k === icon ? "on" : ""}" aria-label="Biểu tượng ${k}">${ICO[k]}</button>`).join(""); };
  icons.addEventListener("click", e => { const b = e.target.closest("[data-ic]"); if (b) { icon = b.dataset.ic; drawIcons(); } }); drawIcons();
  const drawList = () => { list.innerHTML = S.store.cats.map(c => `<div class="drow"><span class="ci">${icoOf(c)}</span><span class="nm">${esc(c.label)} ${c.base ? '<span class="badge">Mặc định</span>' : ""}</span>
    <a class="ib" href="${S.catHref(c)}" aria-label="Mở ${esc(c.label)}">${ICO.eye}</a>${c.base ? "" : `<button class="ib del" type="button" data-cat="${esc(c.id)}" aria-label="Xóa danh mục ${esc(c.label)}">${ICO.trash}</button>`}</div>`).join(""); };
  list.addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (b) armDelete(b, () => S.deleteCategory(b.dataset.cat).then(() => toast("Đã xóa danh mục.")).catch(x => toast(friendly(x), "err")), { title: "Xóa danh mục này?", message: "Nội dung bên trong danh mục sẽ không bị xóa." }); });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; const en = ctx.el.querySelector('[data-err="name"]'); en.textContent = "";
    const name = f.name.value.trim(); if (!name) { en.textContent = "Vui lòng nhập tên danh mục."; f.name.focus(); return; }
    const btn = f.querySelector("button[type=submit]"); btn.classList.add("busy");
    try { await S.addCategory({ name, sub: f.sub.value.trim(), icon, color: "#a3a3a3" }); toast("Đã thêm danh mục " + name + "."); f.reset(); icon = PICK_ICONS[0]; drawIcons(); }
    catch (x) { err.textContent = friendly(x); } btn.classList.remove("busy");
  });
  drawList(); return S.subscribe(t => { if (t === "cats") drawList(); });
}
