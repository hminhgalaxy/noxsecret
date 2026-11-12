/* Hộp thoại của chính web (thay cho cửa sổ "website cho biết" của trình duyệt). Mỗi phần có kiểu riêng (kind):
   delete · warn · ban · mute · role · security · code · password · email · approve · reject · category · maint · media · music · signout · reset · high · info
   const ok = await confirmDialog({ kind: "delete", title, message, ok: "Xóa" });  → true nếu đồng ý
   const v  = await formDialog({ kind: "ban", title, fields: [...] });             → { id: giá trị } hoặc false nếu hủy
   fields: { id, label, type: "text"|"password"|"textarea", options: [[giá trị, nhãn]], otp, max, value, placeholder, hint } */
import { ICO } from "./icons.js";

const KINDS = {
  info: { icon: "info", eyebrow: "Thông tin" }, ask: { icon: "bulb", eyebrow: "Xác nhận" },
  delete: { icon: "trash", eyebrow: "Xóa", tone: "danger" }, warn: { icon: "warn", eyebrow: "Cảnh báo", tone: "warn" },
  ban: { icon: "lock", eyebrow: "Quản trị · Ban", tone: "danger" }, mute: { icon: "mic", eyebrow: "Quản trị · Mute", tone: "warn" },
  role: { icon: "crown", eyebrow: "Quyền hạn", tone: "accent" }, security: { icon: "shield", eyebrow: "Bảo mật", tone: "accent" },
  code: { icon: "key", eyebrow: "Nhập mã xác nhận", tone: "accent" }, password: { icon: "key", eyebrow: "Mật khẩu", tone: "accent" },
  email: { icon: "envelope", eyebrow: "Email", tone: "accent" }, approve: { icon: "checkCircle", eyebrow: "Duyệt bài", tone: "ok" },
  reject: { icon: "x", eyebrow: "Từ chối", tone: "danger" }, category: { icon: "grid", eyebrow: "Danh mục", tone: "accent" },
  maint: { icon: "wrench", eyebrow: "Bảo trì", tone: "warn" }, media: { icon: "image", eyebrow: "Hình ảnh", tone: "accent" },
  music: { icon: "music", eyebrow: "Nhạc nền", tone: "accent" }, signout: { icon: "out", eyebrow: "Tài khoản" },
  reset: { icon: "sparkles", eyebrow: "Đặt lại", tone: "warn" }, high: { icon: "bolt", eyebrow: "Đồ họa cao", tone: "warn" },
  ok: { icon: "checkCircle", eyebrow: "Hoàn tất", tone: "ok" }
};
let open = null, queue = Promise.resolve();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eyeOn = ICO.eye || "", eyeOff = ICO.eyeOff || "";

function fieldHTML(f) {
  const lab = `<span class="cf-lab">${esc(f.label)}</span>`, hint = f.hint ? `<small class="cf-hint">${esc(f.hint)}</small>` : "";
  if (f.options) {
    const cur = String(f.value ?? f.options[0][0]);
    if (f.options.length <= 8) return `<div class="cf-f"><span class="cf-lab" id="lb_${esc(f.id)}">${esc(f.label)}</span><div class="cf-chips" role="radiogroup" aria-labelledby="lb_${esc(f.id)}">${f.options.map(([v, l]) => `<button type="button" role="radio" class="cf-chip${String(v) === cur ? " on" : ""}" aria-checked="${String(v) === cur}" data-v="${esc(v)}">${esc(l)}</button>`).join("")}</div><input type="hidden" data-f="${esc(f.id)}" value="${esc(cur)}">${hint}</div>`;
    return `<label class="cf-f">${lab}<select class="cf-sel" data-f="${esc(f.id)}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === cur ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>${hint}</label>`;
  }
  if (f.type === "textarea") return `<label class="cf-f">${lab}<textarea class="cf-ta" data-f="${esc(f.id)}" rows="${f.rows || 3}" maxlength="${f.max || 500}" placeholder="${esc(f.placeholder || "")}">${esc(f.value || "")}</textarea>${hint}</label>`;
  if (f.type === "password") return `<label class="cf-f">${lab}<span class="cf-pw"><input data-f="${esc(f.id)}" type="password" autocomplete="${f.new ? "new-password" : "current-password"}" maxlength="${f.max || 200}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}"><button type="button" class="cf-eye" aria-label="Hiện mật khẩu" aria-pressed="false" tabindex="-1">${eyeOn}</button></span>${hint}</label>`;
  return `<label class="cf-f">${lab}<input class="${f.otp ? "cf-otp" : ""}" data-f="${esc(f.id)}" type="text" autocomplete="${f.otp ? "one-time-code" : "off"}"${f.otp ? ' inputmode="numeric" pattern="[0-9]*"' : ""} maxlength="${f.max || 200}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}">${hint}</label>`;
}

export function confirmDialog(o = {}) {
  const run = () => new Promise(resolve => {
    const prev = document.activeElement, id = "cf" + Math.random().toString(36).slice(2, 7);
    const kind = o.kind && KINDS[o.kind] ? o.kind : (o.danger ? "delete" : (o.fields && o.fields.length ? "ask" : "ask")), K = KINDS[kind], danger = o.danger || K.tone === "danger";
    const root = document.createElement("div"); root.className = "cf-root"; root.dataset.kind = kind; root.dataset.tone = K.tone || "neutral";
    root.innerHTML = `<div class="cf-ov"></div>
      <div class="cf cf-${kind}" role="alertdialog" aria-modal="true" aria-labelledby="${id}t" aria-describedby="${id}d">
        <div class="cf-grab" aria-hidden="true"></div>
        <div class="cf-hero"><div class="cf-ico${danger ? " danger" : ""}" aria-hidden="true">${ICO[o.icon || K.icon] || ICO.info}</div><span class="cf-eyebrow">${esc(o.eyebrow || K.eyebrow)}</span></div>
        <h4 id="${id}t">${esc(o.title || "Bạn chắc chắn chứ?")}</h4>
        <p id="${id}d">${esc(o.message || "")}</p>
        ${o.fields && o.fields.length ? `<div class="cf-fields">${o.fields.map(fieldHTML).join("")}</div>` : ""}
        <div class="cf-acts">
          ${o.cancel === false ? "" : `<button type="button" class="btn ghost" data-cf="no">${esc(o.cancel || "Hủy")}</button>`}
          <button type="button" class="btn ${danger ? "danger" : "primary"}" data-cf="yes">${esc(o.ok || "Đồng ý")}</button>
        </div></div>`;
    document.body.appendChild(root);
    const yes = root.querySelector('[data-cf="yes"]'), no = root.querySelector('[data-cf="no"]') || yes;
    let done = false;
    const close = v => {
      if (done) return; done = true; document.removeEventListener("keydown", key, true);
      root.classList.remove("on"); open = null;
      setTimeout(() => root.remove(), 240);
      try { prev && prev.focus && prev.focus(); } catch (_) {}
      resolve(v);
    };
    const submit = () => { if (o.fields && o.fields.length) { const v = {}; root.querySelectorAll("[data-f]").forEach(e => { v[e.dataset.f] = e.value; }); close(v); } else close(true); };
    const key = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
      else if (e.key === "Enter" && e.target.matches && e.target.matches("input:not([type=hidden])") && !e.isComposing) { e.preventDefault(); submit(); }
      else if (e.key === "Tab") { const f = [...root.querySelectorAll("input:not([type=hidden]),select,textarea,button:not([tabindex='-1'])")].filter(x => x.offsetParent !== null); if (!f.length) return; const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
    };
    document.addEventListener("keydown", key, true);
    root.addEventListener("click", e => {
      const chip = e.target.closest(".cf-chip"); if (chip) { const g = chip.parentElement; g.querySelectorAll(".cf-chip").forEach(c => { const on = c === chip; c.classList.toggle("on", on); c.setAttribute("aria-checked", String(on)); }); g.parentElement.querySelector("input[type=hidden]").value = chip.dataset.v; return; }
      const eye = e.target.closest(".cf-eye"); if (eye) { const inp = eye.parentElement.querySelector("input"), show = inp.type === "password"; inp.type = show ? "text" : "password"; eye.innerHTML = show ? eyeOff : eyeOn; eye.setAttribute("aria-pressed", String(show)); eye.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu"); inp.focus(); }
    });
    yes.addEventListener("click", submit); if (no !== yes) no.addEventListener("click", () => close(false));
    root.querySelector(".cf-ov").addEventListener("click", () => close(false));
    open = { close };
    requestAnimationFrame(() => { root.classList.add("on"); const first = root.querySelector("input:not([type=hidden]),textarea,select,.cf-chip.on"); (first || (danger ? no : yes)).focus({ preventScroll: true }); });
  });
  queue = queue.then(run, run); return queue;
}
export const closeConfirm = () => { if (open) open.close(false); };

/* Hộp thoại có ô nhập: trả về { id: giá trị } hoặc false nếu hủy */
export const formDialog = o => confirmDialog(o);
/* Hộp thoại chỉ có nút Đóng */
export const alertDialog = o => confirmDialog({ ...o, cancel: false });
