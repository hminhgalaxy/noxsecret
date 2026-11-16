/* Popup riêng cho khu Cửa hàng / Ví / Dev (thay cho hộp thoại xác nhận chung):
   popConfirm — xác nhận có tiêu đề, biểu tượng theo sắc thái, bảng chi tiết (số tiền, tài khoản…)
   popForm    — biểu mẫu trong tấm popup: nhãn, gợi ý, kiểm tra từng ô, lỗi hiện ngay trong popup */
import { openPopup } from "./popup.js";
import { esc } from "./util.js";
import { ICO } from "./icons.js";

const TONE_ICO = { danger: "trash", warn: "warn", ok: "checkCircle", info: "info", neutral: "sparkles" };
const hero = (tone, icon) => `<span class="sp-hero t-${esc(tone)}" aria-hidden="true">${ICO[icon || TONE_ICO[tone] || "info"] || ICO.info}</span>`;
const details = d => (d && d.length ? `<dl class="sp-dl">${d.map(([k, v, cls]) => `<div><dt>${esc(k)}</dt><dd${cls ? ` class="${esc(cls)}"` : ""} translate="no">${esc(v)}</dd></div>`).join("")}</dl>` : "");

/* → Promise<boolean> */
export function popConfirm(o = {}) {
  return new Promise(resolve => {
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    const tone = o.tone || (o.danger ? "danger" : "neutral");
    const h = openPopup({ id: "sp" + Math.random().toString(36).slice(2, 6), variant: "sheet", title: o.title || "Xác nhận", icon: o.headIcon || "shield", tone: tone === "danger" ? "danger" : undefined, onClose: () => fin(false) });
    h.setBody(`<div class="sp">${hero(tone, o.icon)}${o.message ? `<p class="sp-msg">${esc(o.message)}</p>` : ""}${details(o.details)}
      <div class="form-acts sp-acts"><button class="btn ghost" type="button" data-no>${esc(o.cancel || "Hủy")}</button><button class="btn ${tone === "danger" ? "danger" : "primary"}" type="button" data-yes>${esc(o.ok || "Đồng ý")}</button></div></div>`);
    h.body.querySelector("[data-no]").addEventListener("click", () => h.close());
    const y = h.body.querySelector("[data-yes]"); y.addEventListener("click", () => { fin(true); h.close(true); });
    setTimeout(() => (tone === "danger" ? h.body.querySelector("[data-no]") : y).focus({ preventScroll: true }), 40);
  });
}

/* fields: { id, label, type: text|number|textarea|select|email, value, hint, max, rows, placeholder, options:[[v,l]], prefix, suffix, inputmode }
   o.check(values) → chuỗi lỗi (rỗng = hợp lệ) · o.submit(values) có thể là async và ném lỗi để hiện trong popup → Promise<values|false> */
export function popForm(o = {}) {
  return new Promise(resolve => {
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    const tone = o.tone || "neutral";
    const h = openPopup({ id: "sf" + Math.random().toString(36).slice(2, 6), variant: "sheet", wide: !!o.wide, title: o.title || "Biểu mẫu", icon: o.headIcon || "pencil", onClose: () => fin(false) });
    const fld = f => {
      const id = "spf_" + f.id, hint = f.hint ? `<small class="field-hint">${esc(f.hint)}</small>` : "", lab = `<label for="${id}">${esc(f.label)}${f.required ? ' <b class="req" aria-hidden="true">*</b>' : ""}</label>`;
      let ctl;
      if (f.type === "textarea") ctl = `<textarea id="${id}" data-f="${esc(f.id)}" rows="${f.rows || 3}" maxlength="${f.max || 500}" placeholder="${esc(f.placeholder || "")}">${esc(f.value || "")}</textarea>`;
      else if (f.options) ctl = `<select id="${id}" data-f="${esc(f.id)}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(f.value ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
      else ctl = `<span class="sp-in">${f.prefix ? `<i>${esc(f.prefix)}</i>` : ""}<input id="${id}" data-f="${esc(f.id)}" type="${f.type === "email" ? "email" : "text"}"${f.inputmode ? ` inputmode="${esc(f.inputmode)}"` : ""} autocomplete="off" maxlength="${f.max || 200}" value="${esc(f.value ?? "")}" placeholder="${esc(f.placeholder || "")}">${f.suffix ? `<i>${esc(f.suffix)}</i>` : ""}</span>`;
      return `<div class="field">${lab}${ctl}${hint}</div>`;
    };
    h.setBody(`<form class="sp sp-form" novalidate>${o.message ? `<div class="sp-top">${hero(tone, o.icon)}<p class="sp-msg">${esc(o.message)}</p></div>` : ""}
      ${o.pair ? `<div class="pf-2">${(o.fields || []).map(fld).join("")}</div>` : (o.fields || []).map(fld).join("")}
      <p class="form-error" role="alert" data-err></p>
      <div class="form-acts sp-acts"><button class="btn ghost" type="button" data-no>${esc(o.cancel || "Hủy")}</button><button class="btn primary" type="submit">${o.okIcon ? ICO[o.okIcon] || "" : ""}${esc(o.ok || "Lưu")}</button></div></form>`);
    const f = h.body.querySelector("form"); if (o.onMount) o.onMount(f);
    const er = f.querySelector("[data-err]"), sb = f.querySelector("[type=submit]");
    f.querySelector("[data-no]").addEventListener("click", () => h.close());
    f.addEventListener("submit", async e => {
      e.preventDefault(); er.textContent = "";
      const v = {}; f.querySelectorAll("[data-f]").forEach(x => { v[x.dataset.f] = x.value; });
      const bad = o.check ? o.check(v) : ""; if (bad) { er.textContent = bad; return; }
      sb.disabled = true; sb.classList.add("busy");
      try { if (o.submit) await o.submit(v); fin(v); h.close(true); }
      catch (x) { sb.disabled = false; sb.classList.remove("busy"); er.textContent = (x && x.message) || "Chưa thực hiện được. Hãy thử lại."; }
    });
    setTimeout(() => { const first = f.querySelector("input,textarea,select"); if (first) first.focus({ preventScroll: true }); }, 40);
  });
}
