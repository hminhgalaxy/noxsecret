/* Nhạc nền riêng cho Skliquid (do dev tải lên ở Dev › Skliquid). Khi bật Skliquid và có bài riêng thì phát danh sách này; nếu chưa có thì nhạc nền chung vẫn chạy như cũ. */
import { store, subscribe, loadTrackData } from "../store.js";
import { isMuted, setMuted, getVolume } from "../prefs.js";
import { esc } from "../util.js";
let box = null, au = null, un = null, cur = "", token = 0, armed = false, offPrefs = null, failed = 0;
const list = () => (store.tracks || []).filter(t => t.lq);
const SVG = {
  eq: '<span class="lqm-eq" aria-hidden="true"><i></i><i></i><i></i></span>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.2" height="14" rx="1.6"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6.2v11.6a.9.9 0 0 0 1.4.75l8.2-5.8a.9.9 0 0 0 0-1.5L7.4 5.45A.9.9 0 0 0 6 6.2ZM17 5.5h1.8v13H17z"/></svg>'
};
const playing = () => au && !au.paused && !isMuted();
function ui() {
  if (!box) return; const l = list(), c = l.find(x => x.id === cur);
  box.classList.toggle("has", l.length > 0); box.classList.toggle("play", !!playing());
  box.querySelector(".lqm-name").textContent = c ? c.name : (l[0] ? l[0].name : ""); box.querySelector('[data-a="play"]').innerHTML = playing() ? SVG.pause : SVG.play;
  window.__lqMusic = l.length > 0; document.dispatchEvent(new CustomEvent("lq-music-state"));
}
function arm() { if (armed) return; armed = true; const h = () => { armed = false; document.removeEventListener("pointerdown", h, true); document.removeEventListener("keydown", h, true); tryPlay(); }; document.addEventListener("pointerdown", h, true); document.addEventListener("keydown", h, true); }
function tryPlay() {
  if (!au) return; const l = list();
  if (!l.length || isMuted()) { au.pause(); ui(); return; }
  if (!cur) { load(l[0].id); return; } if (!au.src) return;
  const p = au.play(); if (p && p.catch) p.catch(() => { arm(); ui(); });
}
async function load(id) {
  const my = ++token; cur = id; au.loop = list().length === 1; let d = ""; try { d = await loadTrackData(id); } catch (_) {}
  if (my !== token) return; if (!/^data:audio\//.test(d || "")) { failed++; if (failed < list().length) return next(true); au.pause(); ui(); return; }
  failed = 0; au.src = d; au.dataset.src = id; try { au.load(); } catch (_) {} tryPlay(); ui();
}
function next(auto) { const l = list(); if (!l.length) return; const i = l.findIndex(x => x.id === cur), n = l[(i + 1) % l.length]; if (n.id === cur && !auto) { au.currentTime = 0; tryPlay(); return; } load(n.id); }
async function sync() {
  const l = list(); ui(); const m = await import("../media.js"); m.applyMedia();
  if (!l.length) { token++; cur = ""; if (au) { au.pause(); au.removeAttribute("src"); } return; }
  if (cur && !l.some(x => x.id === cur)) { cur = ""; token++; au.pause(); } tryPlay();
}
export function initMusic() {
  if (box) return; au = document.createElement("audio"); au.id = "lqAudio"; au.preload = "none"; au.volume = getVolume() / 100; document.body.appendChild(au);
  box = document.createElement("div"); box.id = "lqMusic"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Nhạc Skliquid");
  box.innerHTML = `<button type="button" data-a="open" aria-label="Trình nhạc" title="Trình nhạc">${SVG.eq}</button><span class="lqm-name" translate="no"></span><button class="lqm-x" type="button" data-a="play" aria-label="Phát / tạm dừng"></button><button class="lqm-x" type="button" data-a="next" aria-label="Bài tiếp theo">${SVG.next}</button>`;
  document.body.appendChild(box);
  box.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a;
    if (a === "open") box.classList.toggle("open"); else if (a === "next") next(); else if (a === "play") { if (isMuted()) { setMuted(false); document.dispatchEvent(new CustomEvent("prefs-change")); } else if (!au.paused) { au.pause(); } else tryPlay(); ui(); } });
  au.addEventListener("play", ui); au.addEventListener("pause", ui); au.addEventListener("ended", () => { if (list().length > 1) next(true); });
  un = subscribe(t => { if (t === "tracks") sync(); });
  offPrefs = () => { au.volume = getVolume() / 100; if (isMuted()) au.pause(); else tryPlay(); ui(); }; document.addEventListener("prefs-change", offPrefs);
  sync();
}
export function stopMusic() {
  if (un) un(); un = null; if (offPrefs) document.removeEventListener("prefs-change", offPrefs); offPrefs = null; token++;
  if (au) { au.pause(); au.remove(); } if (box) box.remove(); au = box = null; cur = ""; window.__lqMusic = false; import("../media.js").then(m => m.applyMedia());
}
