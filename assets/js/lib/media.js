/* Nền tùy chỉnh + nhạc nền (dữ liệu từ nox_theme, chỉ các khóa công khai) */
import { $, esc, toast } from "./util.js";
import { store } from "./store.js";
import { isMuted, setMuted } from "./prefs.js";

const bgm = () => $("#bgm");
let armed = false;
export const hasMusic = () => !!(store.theme && store.theme.audioData);
export function renderSound() {
  const a = bgm(); if (!a) return;
  const playing = !isMuted() && hasMusic() && !a.paused;
  document.body.classList.toggle("snd-on", playing);
  const s = $("#sndState"); if (s) s.textContent = isMuted() ? "Tắt" : (hasMusic() ? "Bật" : "—");
  document.dispatchEvent(new CustomEvent("sound-state"));
}
function arm() {
  if (armed) return; armed = true;
  const h = () => { armed = false; document.removeEventListener("pointerdown", h, true); document.removeEventListener("keydown", h, true); tryPlay(); };
  document.addEventListener("pointerdown", h, true); document.addEventListener("keydown", h, true);
}
function tryPlay() {
  const a = bgm(); if (!a) return;
  if (isMuted() || !hasMusic()) { a.pause(); renderSound(); return; }
  const p = a.play(); if (p && p.catch) p.catch(() => { arm(); renderSound(); });
}
export function toggleSound() {
  const m = isMuted(); setMuted(!m);
  if (m) { tryPlay(); if (hasMusic()) toast("Đã bật nhạc nền."); else toast("Hiện chưa có nhạc nền."); }
  else { bgm().pause(); toast("Đã tắt nhạc nền."); }
  renderSound();
}
export function applyMedia() {
  const t = store.theme || {}, layer = $("#themeLayer"), a = bgm();
  const hasBg = !!(t.bgData && t.bgType && t.bgType !== "none");
  document.body.classList.toggle("has-bg", hasBg);
  if (hasBg) {
    const sig = t.bgType + "|" + String(t.bgData).length + "|" + String(t.bgData).slice(-40);
    if (layer.dataset.sig !== sig) {
      layer.dataset.sig = sig;
      layer.innerHTML = t.bgType === "video" ? `<video src="${esc(t.bgData)}" autoplay muted loop playsinline></video>` : `<img src="${esc(t.bgData)}" alt="">`;
    }
    layer.classList.add("on");
  } else { layer.classList.remove("on"); setTimeout(() => { if (!layer.classList.contains("on")) { layer.innerHTML = ""; layer.dataset.sig = ""; } }, 800); }
  if (t.audioData) { if (a.dataset.src !== t.audioData) { a.src = t.audioData; a.dataset.src = t.audioData; a.load(); } tryPlay(); }
  else { a.pause(); if (a.dataset.src) { a.removeAttribute("src"); a.dataset.src = ""; } }
  renderSound();
}
export function initMedia() { const a = bgm(); a.volume = 0.55; a.addEventListener("play", renderSound); a.addEventListener("pause", renderSound); }
