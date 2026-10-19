/* ===== Bảng chọn hiện ngay trong web =====
   Thay mọi ô <select> bằng một nút; bấm vào sẽ mở cửa sổ riêng của web (không dùng bảng chọn của điện thoại). */
(function () {
  "use strict";
  const CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const titleOf = sel => {
    for (let n = sel, k = 0; n && k < 3; n = n.parentElement, k++) {
      for (let p = n.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName === "LABEL") return p.textContent.replace(/\s*\*$/, "");
    }
    return "";
  };
  const label = sel => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ""; };

  function enhance(sel) {
    if (sel._pk) return; sel._pk = true;
    const b = document.createElement("button");
    b.type = "button"; b.className = "pick"; b.innerHTML = '<span class="pk-t"></span>' + CHEV;
    sel.style.display = "none"; sel.after(b);
    const paint = () => { b.querySelector(".pk-t").textContent = label(sel) || "—"; b.disabled = sel.disabled; };
    new MutationObserver(paint).observe(sel, { childList: true, subtree: true, attributes: true });
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(sel, "value", { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); paint(); } });
    sel.addEventListener("change", paint);
    b.addEventListener("click", () => open(sel, paint));
    paint();
  }

  function open(sel, paint) {
    const list = $("pkList"), opts = [...sel.options];
    $("pkTitle").textContent = titleOf(sel);
    list.innerHTML = opts.length
      ? opts.map((o, i) => `<button type="button" class="pk-o${i === sel.selectedIndex ? " on" : ""}" data-i="${i}"><span>${esc(o.textContent)}</span><b>${i === sel.selectedIndex ? "✓" : ""}</b></button>`).join("")
      : `<p class="mu">${esc(t("pk.empty"))}</p>`;
    list.onclick = e => {
      const x = e.target.closest(".pk-o"); if (!x) return;
      sel.selectedIndex = +x.dataset.i; sel.dispatchEvent(new Event("change", { bubbles: true })); paint(); closeM($("mPick"));
    };
    openM($("mPick"));
    const cur = list.querySelector(".on"); if (cur) cur.scrollIntoView({ block: "center" });
  }

  window.enhanceSelects = () => document.querySelectorAll("select").forEach(enhance);
})();
;(window.__ok = window.__ok || []).push("app-picker.js");
