/* Skib OS: màn cập nhật kiểu hệ điều hành (chỉ dùng khi bật Skliquid Glass). Phiên bản đã cài lưu trong cookie của trình duyệt này. */
import { kvGet, kvSet } from "../lib/cookie.js";
import { isLiquid } from "../lib/prefs.js";
import { toast, esc } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
export const OS_VERSION = "1.00.1", OS_BASE = "1.00.0", OS_KEY = "ssw_os_ver";
const CHANGES = [
  ["✨", "Skliquid Glass", "Giao diện kính lỏng mới: nút, công tắc và thanh trượt dẻo như chất lỏng, viền kính khúc xạ ánh sáng."],
  ["🧩", "Tùy chỉnh bố cục", "Kéo thanh trắng ở mép mỗi phần để kéo dài hoặc thu ngắn — trang nhớ lại cho bạn."],
  ["🗂️", "Danh mục nổi", "Danh mục thành một cửa sổ kính: kéo đi đâu cũng được, ẩn, gập hoặc thu nhỏ thành chấm."],
  ["🫧", "Skias mới", "Kéo thả Skias, thu nhỏ thành chấm, khung chat tách ba viên kính và nút phóng to."],
  ["🎵", "Nhạc & nền riêng", "Nhà phát triển có thể thêm nhạc và hình nền riêng cho Skliquid Glass."]
];
const ver = () => kvGet(OS_KEY) || OS_BASE;
export function mount(ctx) {
  ctx.setPage({ title: "Skib OS", sub: "Cập nhật hệ thống giao diện.", noindex: true });
  let timer = 0, running = false;
  const draw = async () => {
    if (!isLiquid()) { ctx.el.innerHTML = `<div class="os"><div class="os-off lq-card" style="background:var(--surface);border:1px solid var(--line);border-radius:28px;padding:34px 22px"><h2>Skib OS cần Skliquid Glass</h2><p class="muted">Skib OS là màn cập nhật chỉ có trong giao diện kính lỏng. Bật Skliquid Glass để xem.</p><button class="btn primary" type="button" data-lq="on">Bật Skliquid Glass</button></div></div>`; return; }
    const { drawOsArt } = await import("../lib/liquid/os-art.js"), cur = ver(), latest = cur === OS_VERSION;
    ctx.el.innerHTML = `<div class="os">
      <section class="os-hero lq-card"><img class="os-art" alt="" src="${drawOsArt()}" width="960" height="600"><h2>Skib OS</h2>
        <div class="os-ver">Phiên bản: <b>${OS_VERSION}</b></div>
        <div class="os-state${latest ? "" : " new"}"><i></i><span>${latest ? "Máy của bạn đã dùng bản mới nhất" : "Đang dùng " + esc(cur) + " · có bản cập nhật mới"}</span></div></section>
      <section class="lq-card"><button class="os-what" type="button" aria-expanded="false" aria-controls="osWhat"><span>Cập nhật này có gì?</span>${ICO.chevD}</button>
        <div class="os-whatbox" id="osWhat"><div><ul>${CHANGES.map(c => `<li><i aria-hidden="true">${c[0]}</i><span><b>${c[1]}</b>${c[2]}</span></li>`).join("")}</ul></div></div></section>
      <section class="os-desc lq-card"><h4>Mô tả:</h4><p>Skib OS ${OS_VERSION} đưa giao diện Skliquid Glass đến toàn bộ Skibidi Web: mọi khung đều bo tròn và trong như kính, ánh sáng đổi theo con trỏ, các nút nhún dẻo khi chạm. Bản này cũng thêm chế độ tùy chỉnh bố cục, Danh mục dạng cửa sổ nổi và Skias được thiết kế lại.</p></section>
      <button class="btn primary lg os-go" type="button" ${latest ? "disabled" : ""}>${latest ? "Đã cập nhật" : "Cập nhật ngay"}</button>
      <section class="os-prog lq-card" aria-live="polite"><b>Đang chuẩn bị…</b><div class="os-bar"><i></i></div><small>Vui lòng giữ trang mở. Quá trình chỉ mất vài giây.</small></section></div>`;
    const w = ctx.el.querySelector(".os-what"), box = ctx.el.querySelector(".os-whatbox");
    w.addEventListener("click", () => { const o = w.getAttribute("aria-expanded") !== "true"; w.setAttribute("aria-expanded", String(o)); box.classList.toggle("open", o); });
    ctx.el.querySelector(".os-go").addEventListener("click", e => run(e.currentTarget));
  };
  const run = btn => {
    if (running) return; running = true; btn.disabled = true; btn.textContent = "Đang cập nhật…";
    const prog = ctx.el.querySelector(".os-prog"), bar = prog.querySelector(".os-bar i"), t = prog.querySelector("b"); prog.classList.add("on");
    const steps = [[0, "Đang tải xuống…"], [48, "Đang xác minh…"], [68, "Đang cài đặt…"], [92, "Đang khởi động lại giao diện…"]]; let p = 0;
    timer = setInterval(() => {
      p = Math.min(100, p + (p < 48 ? 3.2 : p < 68 ? 2 : 1.6)); bar.style.width = p + "%"; const s = steps.filter(x => p >= x[0]).pop(); t.textContent = s ? s[1] : "";
      if (p >= 100) { clearInterval(timer); timer = 0; running = false; kvSet(OS_KEY, OS_VERSION); t.textContent = "Hoàn tất!"; toast("Skib OS đã cập nhật lên " + OS_VERSION + ".", "ok"); setTimeout(draw, 700); }
    }, 90);
  };
  draw(); const redraw = () => { if (!running) draw(); }; document.addEventListener("lq-ready", redraw); document.addEventListener("lq-stop", redraw);
  return () => { clearInterval(timer); document.removeEventListener("lq-ready", redraw); document.removeEventListener("lq-stop", redraw); };
}
