/* ===== Tự phát hiện file bị thiếu: nếu trang thiếu file, báo rõ tên file thay vì quay mãi ===== */
(function () {
  "use strict";
  function banner(list) {
    if (document.getElementById("miss")) return;
    const b = document.createElement("div"); b.id = "miss";
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;background:#d92d20;color:#fff;padding:12px 14px;border-radius:14px;font:500 13px/1.5 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)";
    b.textContent = (document.documentElement.lang === "vi" ? "Web đang thiếu file: " : "Missing files: ") + list.join(", ") + (document.documentElement.lang === "vi" ? ". Hãy tải lên đủ file rồi tải lại trang." : ". Upload them and reload.");
    document.body.appendChild(b);
    try { hideBoot(); } catch (e) {}
  }
  async function run() {
    const F = window.SKIBIDI_FILES; if (!F) return banner(["app-files.js"]);
    const need = F.js.filter(f => /^app-/.test(f) && f !== "app-guard.js");
    const ok = window.__ok || [], miss = need.filter(f => !ok.includes(f));
    for (const f of F.css.filter(x => x !== "auth.css")) {
      try { const r = await fetch(f, { method: "HEAD" }); if (!r.ok) miss.push(f); } catch (e) {}
    }
    if (miss.length) banner(miss);
  }
  window.addEventListener("load", () => setTimeout(run, 2500));
})();
;(window.__ok = window.__ok || []).push("app-guard.js");
