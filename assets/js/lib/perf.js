/* Bảo vệ độ mượt: đo tốc độ vẽ khung hình; nếu máy giật liên tục thì tự bật "chế độ nhẹ" (tắt hiệu ứng nặng).
   Cũng tạm dừng video nền khi tab bị ẩn để đỡ tốn máy. Không chạy khi trình duyệt tự động hóa (kiểm thử). */
const KEY = "ssw_lite";
const root = document.documentElement;
const get = () => { try { return sessionStorage.getItem(KEY) === "1"; } catch (_) { return false; } };
const setLite = on => { root.classList.toggle("lite", on); try { on ? sessionStorage.setItem(KEY, "1") : sessionStorage.removeItem(KEY); } catch (_) {} };
export function initPerf() {
  if (get()) root.classList.add("lite");
  document.addEventListener("visibilitychange", () => {
    document.querySelectorAll("video").forEach(v => {
      if (document.hidden) { if (!v.paused) { v.dataset.hp = "1"; v.pause(); } }
      else if (v.dataset.hp) { delete v.dataset.hp; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    });
  });
  if (navigator.webdriver || typeof requestAnimationFrame !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches || get()) return;
  let bad = 0, n = 0, last = 0, sum = 0, windows = 0, stop = false;
  const tick = t => {
    if (stop || document.hidden) { last = 0; if (!stop) requestAnimationFrame(tick); return; }
    if (last) { const d = t - last; if (d < 250) { sum += d; n++; } }
    last = t;
    if (n >= 90) { const avg = sum / n; bad = avg > 36 ? bad + 1 : 0; sum = 0; n = 0; windows++;
      if (bad >= 2) { setLite(true); stop = true; return; } if (windows >= 8) { stop = true; return; } }
    requestAnimationFrame(tick);
  };
  setTimeout(() => requestAnimationFrame(tick), 2500);
}
