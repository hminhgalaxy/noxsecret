/* Thêm mới / chỉnh sửa nội dung (chỉ quản trị viên): /scripts/create, /scripts/:id/edit ... */
import { esc, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { session } from "../../lib/auth.js";
import { skeletonHTML, lockedHTML, fieldErrors } from "../../lib/ui.js";
import { friendly } from "../../lib/messages.js";
import { fileToItemImage } from "../../lib/avatar.js";
import { resolveCat, notFound, crumbsFor, settled, missingHTML, fieldsFor } from "./shared.js";

export async function mount(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  const base = S.catHref(cat), edit = ctx.def.mode === "edit", key = ctx.params.id;
  const crumbs = crumbsFor(cat).concat([{ label: cat.label, href: base }]);
  if (!session.isDev && !session.isEditor) { ctx.setPage({ title: "Không có quyền", crumbs, noindex: true }); ctx.el.innerHTML = lockedHTML("Chỉ quản trị viên mới được thêm hoặc sửa nội dung."); return; }
  ctx.setPage({ title: edit ? "Chỉnh sửa" : "Thêm vào " + cat.label, crumbs, noindex: true });
  const fields = fieldsFor(cat);
  const render = it => {
    if (edit) ctx.setPage({ title: "Chỉnh sửa: " + it.name, crumbs, noindex: true });
    const val = k => it ? (k === "name" && it.name === "(không tên)" ? "" : (it[k] ?? "")) : "";
    ctx.el.innerHTML = `<form class="formcard" id="itemForm" novalidate>
      ${fields.map(f => f.image
        ? `<div class="field imgf"><label for="imgPick">${esc(f.label)}</label><input type="hidden" name="${f.k}" value="${esc(val(f.k))}">
          <div class="imgf-prev" id="imgPrev" ${val(f.k) ? "" : "hidden"}>${val(f.k) ? `<img src="${esc(val(f.k))}" alt="">` : ""}</div>
          <div class="acts"><label class="btn ghost upbtn">${ICO.eye}Chọn ảnh từ máy<input type="file" id="imgPick" accept="image/jpeg,image/png,image/webp" hidden></label><button class="btn ghost" type="button" id="imgDel" ${val(f.k) ? "" : "hidden"}>${ICO.trash}Xóa ảnh</button></div>
          <p class="field-error" data-err="${f.k}" role="alert"></p></div>`
        : f.check
        ? `<div class="switch-row"><span>${esc(f.label)}</span><label class="sw"><input type="checkbox" name="${f.k}" aria-label="${esc(f.label)}" ${it && it[f.k] ? "checked" : ""}><i></i></label></div>`
        : `<div class="field"><label for="f_${f.k}">${esc(f.label)}${f.req ? ' <b class="req" aria-hidden="true">*</b>' : ""}</label>
          ${f.area ? `<textarea id="f_${f.k}" name="${f.k}" rows="${f.rows || 4}" spellcheck="false" class="${f.mono ? "mono" : ""}">${esc(val(f.k))}</textarea>`
            : `<input id="f_${f.k}" name="${f.k}" type="${f.type || "text"}" value="${esc(val(f.k))}" placeholder="${esc(f.ph || "")}" autocomplete="off" ${f.type === "url" ? 'inputmode="url"' : ""}>`}
          <p class="field-error" data-err="${f.k}" role="alert"></p></div>`).join("")}
      <p class="form-error" id="formErr" role="alert" aria-live="polite"></p>
      <div class="form-acts"><button class="btn primary" type="submit" id="saveBtn">${edit ? "Lưu chỉnh sửa" : "Lưu"}</button><a class="btn ghost" href="${base}${edit ? "/" + encodeURIComponent(key) : ""}">Hủy</a></div></form>`;
    const fm = ctx.el.querySelector("#itemForm"), btn = fm.querySelector("#saveBtn"), err = fm.querySelector("#formErr");
    const hid = fm.elements.img;
    if (hid) {
      const prev = fm.querySelector("#imgPrev"), del = fm.querySelector("#imgDel"), pick = fm.querySelector("#imgPick"), ie = fm.querySelector('[data-err="img"]');
      const show = d => { hid.value = d || ""; prev.hidden = del.hidden = !d; prev.innerHTML = d ? `<img src="${d}" alt="">` : ""; };
      pick.addEventListener("change", async () => {
        const f = pick.files && pick.files[0]; pick.value = ""; if (!f) return; ie.textContent = "";
        try { show(await fileToItemImage(f)); } catch (ex) { ie.textContent = (ex && ex.message) || "Không đọc được ảnh này."; }
      });
      del.addEventListener("click", () => { ie.textContent = ""; show(""); });
    }
    fm.addEventListener("submit", async e => {
      e.preventDefault(); err.textContent = "";
      const v = {}; fields.forEach(f => { const el = fm.elements[f.k]; v[f.k] = f.check ? el.checked : (f.k === "code" ? el.value : el.value.trim()); });
      const full = { name: "", desc: "", url: "", code: "", img: "", ...v };
      const errs = S.validateItem(cat, full); fieldErrors(fm, errs); if (Object.keys(errs).length) return;
      if (!session.isDev && !session.isEditor) { err.textContent = "Bạn không có quyền thực hiện thao tác này."; return; }
      btn.classList.add("busy");
      try { await S.saveItem(cat.id, edit ? key : null, v); toast(edit ? "Đã lưu chỉnh sửa." : "Đã thêm nội dung mới."); ctx.navigate(base); }
      catch (ex) { err.textContent = friendly(ex); btn.classList.remove("busy"); }
    });
    setTimeout(() => { const n = fm.elements.name; n && n.focus({ preventScroll: true }); }, 150);
  };
  if (!edit) { render(null); return; }
  ctx.el.innerHTML = `<div class="grid one">${skeletonHTML(1)}</div>`;
  let done = false;
  const tryRender = () => {
    const it = S.item(cat.id, key); if (done || (!it && !settled(cat))) return; done = true;
    if (!it) { ctx.setPage({ title: "Không tìm thấy mục", crumbs, noindex: true }); ctx.el.innerHTML = missingHTML(base, cat.label); return; }
    render(it);
  };
  tryRender(); const u = S.subscribe(t => { if (t === "data") tryRender(); });
  return u;
}
