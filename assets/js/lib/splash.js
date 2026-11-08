/* Màn hình mở đầu: chỉ hiện ở lần đầu của mỗi tab và tắt ngay khi trang đầu tiên đã sẵn sàng. */
import { $, RM } from "./util.js";

export function initSplash(firstPage) {
  const el = $("#splash");
  let seen = false; try { seen = sessionStorage.getItem("ssw_splash") === "1" || localStorage.getItem("ssw_nosplash") === "1" || !/^(mid|high)$/.test(localStorage.getItem("ssw_gfx") || ""); } catch (_) {}
  if (!el || seen) { if (el) el.style.display = "none"; return Promise.resolve(); }
  return new Promise(done => {
    const t0 = performance.now(); let fin = false;
    const finish = () => {
      if (fin) return; fin = true;
      try { sessionStorage.setItem("ssw_splash", "1"); } catch (_) {}
      el.classList.add("out"); setTimeout(() => { el.style.display = "none"; done(); }, RM() ? 0 : 560);
    };
    const wait = () => { const left = (RM() ? 0 : 650) - (performance.now() - t0); left > 0 ? setTimeout(finish, left) : finish(); };
    Promise.resolve(firstPage).then(wait, wait);
    setTimeout(finish, 3500);
  });
}
