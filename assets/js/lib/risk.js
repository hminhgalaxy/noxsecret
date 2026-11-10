/* Cảnh báo trước khi vào danh mục DEV đã phân loại là phần mềm bên thứ ba / hack / mod / can thiệp trò chơi.
   Phải đọc cảnh báo và chờ đếm ngược 20 giây mới được vào; có ô "Không hỏi lại" (nhớ theo từng danh mục trên trình duyệt này). */
import { esc } from "./util.js";
import { ICO } from "./icons.js";
import { RISKS, riskOf } from "./store.js";

const KEY = "ssw_rkok", SECONDS = 20;
const safe = fn => { try { return fn(); } catch (_) { return null; } };
const skipped = id => !!safe(() => (JSON.parse(localStorage.getItem(KEY) || "{}") || {})[id]) || !!safe(() => sessionStorage.getItem("ssw_rk_" + id));
const remember = (id, forever) => { safe(() => sessionStorage.setItem("ssw_rk_" + id, "1")); if (forever) safe(() => { const o = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; o[id] = 1; localStorage.setItem(KEY, JSON.stringify(o)); }); };
export const clearRiskMemory = () => safe(() => localStorage.removeItem(KEY));
export const riskSeconds = () => Math.max(0, Math.min(60, Number(window.__rkSeconds ?? SECONDS)));

/* → Promise<boolean>: true = được vào */
export function riskGate(cat) {
  const r = riskOf(cat); if (!r || skipped(cat.id)) return Promise.resolve(true);
  return new Promise(resolve => {
    const total = riskSeconds(), prev = document.activeElement, root = document.createElement("div"); root.className = "rk-root";
    root.innerHTML = `<div class="rk" role="alertdialog" aria-modal="true" aria-labelledby="rkT" aria-describedby="rkD">
      <span class="rk-risk">${ICO.warn}${esc(RISKS[r])}</span><h4 id="rkT" translate="no">${esc(cat.label)}</h4>
      <p id="rkD">Danh mục này được quản trị viên phân loại là <b>${esc(RISKS[r])}</b>. Hãy đọc kỹ trước khi tiếp tục:</p>
      <ul><li>Nội dung do bên thứ ba tạo ra, website không kiểm chứng được hoàn toàn và không chịu trách nhiệm về việc bạn sử dụng.</li><li>Có thể vi phạm điều khoản của ứng dụng hoặc trò chơi, dẫn tới khóa tài khoản, và có thể chứa mã độc.</li><li>SKIBIDI SCRIPT WEB không cổ xúy hack hay can thiệp trò chơi. Chỉ tiếp tục nếu bạn hiểu và tự chịu rủi ro.</li></ul>
      <div class="bar" aria-hidden="true"><i id="rkBar"></i></div>
      <label class="check"><input type="checkbox" id="rkNo"> <span>Không hỏi lại với danh mục này</span></label>
      <div class="acts"><button type="button" class="btn ghost" id="rkBack">Quay lại</button><button type="button" class="btn primary" id="rkGo" disabled>Tôi đã đọc, tiếp tục</button></div></div>`;
    document.body.appendChild(root);
    const go = root.querySelector("#rkGo"), bar = root.querySelector("#rkBar"), no = root.querySelector("#rkNo"), back = root.querySelector("#rkBack"), end = Date.now() + total * 1000;
    let done = false, timer = null;
    const finish = v => { if (done) return; done = true; clearInterval(timer); document.removeEventListener("keydown", key, true); root.remove(); try { prev && prev.focus && prev.focus(); } catch (_) {} if (v) remember(cat.id, no.checked); resolve(v); };
    const tick = () => { const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); bar.style.transform = "scaleX(" + (total ? Math.max(0, (end - Date.now()) / (total * 1000)) : 0) + ")"; if (left > 0) { go.disabled = true; go.textContent = "Tôi đã đọc, tiếp tục (" + left + ")"; } else { go.disabled = false; go.textContent = "Tôi đã đọc, tiếp tục"; clearInterval(timer); } };
    const key = e => { if (e.key === "Escape") { e.preventDefault(); finish(false); } else if (e.key === "Tab") { const f = [...root.querySelectorAll("input,button:not([disabled])")], i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); } };
    document.addEventListener("keydown", key, true);
    back.addEventListener("click", () => finish(false)); go.addEventListener("click", () => { if (!go.disabled) finish(true); });
    tick(); timer = setInterval(tick, 250); back.focus();
  });
}
