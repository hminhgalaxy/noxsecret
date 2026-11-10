/* Nền tùy chỉnh + nhạc nền nối tiếp (danh sách phát). Dữ liệu nhạc chỉ được tải khi tới lượt phát. */
import { $, esc, toast } from "./util.js";
import { store, loadTrackData } from "./store.js";
import { isMuted, setMuted, isBgHidden, getVolume, getGfx } from "./prefs.js";

const bgm = () => $("#bgm");
let armed = false, curId = "", token = 0, failed = 0;
/* Danh sách phát = nhạc cũ (nếu có) + các bài DEV đã thêm, theo thứ tự thêm. */
export const playlist = () => {
  const l = [], t = store.theme || {};
  if (t.audioName) l.push({ id: "legacy", name: String(t.audioName) });
  return l.concat((store.tracks || []).map(x => ({ id: x.id, name: x.name })));
};
export const hasMusic = () => playlist().length > 0;
export const currentTrack = () => playlist().find(x => x.id === curId) || null;
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
  if (!curId) { loadTrack(playlist()[0].id); return; }
  if (!a.src) return;
  const p = a.play(); if (p && p.catch) p.catch(() => { arm(); renderSound(); });
}
/* Tải dữ liệu bài tới lượt phát, rồi phát. Bài lỗi thì bỏ qua sang bài kế (dừng nếu mọi bài đều lỗi). */
async function loadTrack(id) {
  const a = bgm(), my = ++token; curId = id; a.loop = playlist().length === 1;
  document.dispatchEvent(new CustomEvent("track-change"));
  let data = "";
  try { data = await loadTrackData(id); } catch (e) { data = ""; }
  if (my !== token) return;
  if (!/^data:audio\//.test(data || "")) { failed++; if (failed < playlist().length) return nextTrack(true); a.pause(); renderSound(); return; }
  failed = 0; a.src = data; a.dataset.src = id; try { a.load(); } catch (e) {}
  tryPlay();
}
export function nextTrack(auto) {
  const l = playlist(); if (!l.length) return;
  const i = l.findIndex(x => x.id === curId), n = l[(i + 1) % l.length];
  if (n.id === curId && !auto) { const a = bgm(); a.currentTime = 0; tryPlay(); return; }
  loadTrack(n.id);
}
export function toggleSound() {
  const m = isMuted(); setMuted(!m);
  if (m) { tryPlay(); if (hasMusic()) toast("Đã bật nhạc nền."); else toast("Hiện chưa có nhạc nền."); }
  else { bgm().pause(); toast("Đã tắt nhạc nền."); }
  renderSound();
}
export function applyMedia() {
  const t = store.theme || {}, layer = $("#themeLayer"), a = bgm();
  const hasBg = !!(t.bgData && t.bgType && t.bgType !== "none") && !isBgHidden() && getGfx() === "high";
  document.body.classList.toggle("has-bg", hasBg);
  if (hasBg) {
    const sig = t.bgType + "|" + String(t.bgData).length + "|" + String(t.bgData).slice(-40);
    if (layer.dataset.sig !== sig) {
      layer.dataset.sig = sig;
      layer.innerHTML = t.bgType === "video" ? `<video src="${esc(t.bgData)}" autoplay muted loop playsinline></video>` : `<img src="${esc(t.bgData)}" alt="">`;
    }
    layer.classList.add("on");
  } else { layer.classList.remove("on"); setTimeout(() => { if (!layer.classList.contains("on")) { layer.innerHTML = ""; layer.dataset.sig = ""; } }, 800); }
  const l = playlist();
  if (!l.length) { token++; curId = ""; a.pause(); if (a.dataset.src) { a.removeAttribute("src"); a.dataset.src = ""; } }
  else if (curId && !l.some(x => x.id === curId)) { curId = ""; token++; a.pause(); tryPlay(); }
  else { a.loop = l.length === 1; tryPlay(); }
  renderSound();
}
export function initMedia() {
  const a = bgm(); a.volume = getVolume() / 100; a.removeAttribute("loop");
  document.addEventListener("prefs-change", () => { a.volume = getVolume() / 100; applyMedia(); });
  a.addEventListener("play", renderSound); a.addEventListener("pause", renderSound);
  a.addEventListener("ended", () => { if (playlist().length > 1) nextTrack(true); });
}
