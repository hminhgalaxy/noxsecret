/* Hộp thoại hỏi "Có / Không" của chính web (thay cho cửa sổ "website cho biết" của trình duyệt).
   const ok = await confirmDialog({ title, message, ok: "Xóa", cancel: "Hủy", danger: true });  → true nếu bấm đồng ý. */
let open = null, queue = Promise.resolve();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function confirmDialog(o = {}) {
  const run = () => new Promise(resolve => {
    const prev = document.activeElement, id = "cf" + Math.random().toString(36).slice(2, 7);
    const root = document.createElement("div"); root.className = "cf-root";
    root.innerHTML = `<div class="cf-ov"></div>
      <div class="cf" role="alertdialog" aria-modal="true" aria-labelledby="${id}t" aria-describedby="${id}d">
        <div class="cf-ico${o.danger ? " danger" : ""}" aria-hidden="true">${o.danger
          ? '<svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>'
          : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17v.01"/></svg>'}</div>
        <h4 id="${id}t">${esc(o.title || "Bạn chắc chắn chứ?")}</h4>
        <p id="${id}d">${esc(o.message || "")}</p>
        ${o.fields && o.fields.length ? `<div class="cf-fields">${o.fields.map((f, i) => `<label class="cf-f"><span>${esc(f.label)}</span>${f.options
          ? `<select data-f="${esc(f.id)}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(f.value) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`
          : `<input data-f="${esc(f.id)}" type="text" maxlength="${f.max || 200}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}">`}</label>`).join("")}</div>` : ""}
        <div class="cf-acts">
          ${o.cancel === false ? "" : `<button type="button" class="btn ghost" data-cf="no">${esc(o.cancel || "Hủy")}</button>`}
          <button type="button" class="btn ${o.danger ? "danger" : "primary"}" data-cf="yes">${esc(o.ok || "Đồng ý")}</button>
        </div></div>`;
    document.body.appendChild(root);
    const dlg = root.querySelector(".cf"), yes = root.querySelector('[data-cf="yes"]'), no = root.querySelector('[data-cf="no"]') || yes;
    let done = false;
    const close = v => {
      if (done) return; done = true; document.removeEventListener("keydown", key, true);
      root.classList.remove("on"); open = null;
      setTimeout(() => root.remove(), 220);
      try { prev && prev.focus && prev.focus(); } catch (_) {}
      resolve(v);
    };
    const key = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
      else if (e.key === "Tab") { const f = [...root.querySelectorAll("input,select,button")]; const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
    };
    document.addEventListener("keydown", key, true);
    yes.addEventListener("click", () => { if (o.fields && o.fields.length) { const v = {}; root.querySelectorAll("[data-f]").forEach(e => { v[e.dataset.f] = e.value; }); close(v); } else close(true); }); if (no !== yes) no.addEventListener("click", () => close(false));
    root.querySelector(".cf-ov").addEventListener("click", () => close(false));
    open = { close };
    requestAnimationFrame(() => { root.classList.add("on"); const first = root.querySelector("[data-f]"); (first || (o.danger ? no : yes)).focus(); });
  });
  queue = queue.then(run, run); return queue;
}
export const closeConfirm = () => { if (open) open.close(false); };

/* Hộp thoại có ô nhập: trả về { id: giá trị } hoặc false nếu hủy */
export const formDialog = o => confirmDialog(o);
/* Hộp thoại chỉ có nút Đóng */
export const alertDialog = o => confirmDialog({ ...o, cancel: false });
