/* Phần dùng chung của đăng nhập / đăng ký / quên mật khẩu. */
import { esc, safeNext } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { renderGoogleButton } from "../../lib/auth.js";
import { mountCaptcha, verifyCaptcha } from "../../lib/turnstile.js";
import { authMessage } from "../../lib/messages.js";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const nextOf = ctx => safeNext(ctx.query.get("next"));
export const withNext = (p, ctx) => { const n = nextOf(ctx); return n ? p + "?next=" + encodeURIComponent(n) : p; };
export const shell = (title, sub, body, wide = false) => `<div class="auth"><div class="auth-card${wide ? " wide" : ""}"><svg class="auth-logo" aria-hidden="true"><use href="#logo"/></svg><h1>${esc(title)}</h1><p class="auth-sub">${esc(sub)}</p>${body}</div></div>`;
export const field = (id, label, { type = "text", ac = "off", ph = "", hint = "" } = {}) => `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" name="${id}" type="${type}" autocomplete="${ac}" placeholder="${esc(ph)}" ${type === "email" ? 'inputmode="email" autocapitalize="off" spellcheck="false"' : ""} required>${hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}<p class="field-error" data-err="${id}" role="alert"></p></div>`;
export const pwField = (id, label, ac) => `<div class="field"><label for="${id}">${esc(label)}</label><div class="pw"><input id="${id}" name="${id}" type="password" autocomplete="${ac}" required><button class="eye" type="button" data-eye="${id}" aria-label="Hiện hoặc ẩn mật khẩu">${ICO.eye}</button></div><p class="field-error" data-err="${id}" role="alert"></p></div>`;
export function wireEyes(root) { root.querySelectorAll("[data-eye]").forEach(b => b.addEventListener("click", () => { const i = root.querySelector("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; })); }
export function setErr(form, errs) {
  form.querySelectorAll(".field-error").forEach(e => { e.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
  Object.keys(errs).forEach(k => { const e = form.querySelector(`[data-err="${k}"]`); if (e) e.textContent = errs[k]; if (form.elements[k]) form.elements[k].setAttribute("aria-invalid", "true"); });
  const f = Object.keys(errs)[0]; if (f && form.elements[f]) form.elements[f].focus();
}
export const busy = (btn, on) => { btn.classList.toggle("busy", on); btn.disabled = on; };

/* Khối captcha + nút Google: dùng chung cho đăng nhập và đăng ký */
export const captchaHTML = `<div class="captcha" id="captcha" aria-label="Xác minh bạn không phải người máy"></div>`;
export const googleHTML = `<div class="divider">HOẶC</div><div class="gbtn" id="gbtn">${ICO.google}<span>Tiếp tục với Google</span><div class="g-real" id="g"></div></div>`;
export function setupSecurity(ctx, errEl, { onGoogleDone }) {
  let human = false, failed = false;
  const gbtn = ctx.el.querySelector("#gbtn");
  gbtn.classList.add("locked");
  const cap = mountCaptcha(ctx.el.querySelector("#captcha"), { onChange: ok => { human = ok; gbtn.classList.toggle("locked", !ok && !failed); } });
  cap.ready.then(() => { if (!window.turnstile) { failed = true; gbtn.classList.remove("locked"); } });
  const check = async () => {
    const t = cap.token();
    if (!t && !failed) { errEl.textContent = authMessage({ code: "app/captcha-missing" }); return false; }
    if (t) { const r = await verifyCaptcha(t); if (!r.ok) { errEl.textContent = authMessage({ code: "app/captcha" }); cap.reset(); return false; } }
    return true;
  };
  renderGoogleButton(ctx.el.querySelector("#g"), { onDone: onGoogleDone, onError: m => { errEl.textContent = m; }, guard: async () => { errEl.textContent = ""; const ok = await check(); if (!ok) cap.reset(); return ok; } });
  gbtn.addEventListener("click", () => { if (gbtn.classList.contains("locked")) errEl.textContent = authMessage({ code: "app/captcha-missing" }); });
  ctx.cleanup(() => cap.destroy());
  return { check, cap };
}
