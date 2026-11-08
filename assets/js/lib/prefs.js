/* Cài đặt người dùng (lưu trình duyệt): giao diện sáng/tối, kính mờ, âm thanh */
const K_THEME = "ssw_theme", K_MUTE = "ssw_muted", K_GLASS = "ssw_glass";
const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };
/* Mặc định "dark" (giữ nguyên diện mạo site gốc); "system" là lựa chọn của người dùng */
export const getThemePref = () => { const v = get(K_THEME); return v === "light" || v === "system" ? v : "dark"; };
export const resolveTheme = (pref = getThemePref()) => pref === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : pref;
export function applyThemePref() {
  const r = resolveTheme(); document.documentElement.dataset.theme = r; if (isGlass()) applyGlass();
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = r === "light" ? "#fafafa" : "#0a0a0a";
  return r;
}
export function setThemePref(p) { set(K_THEME, p); applyThemePref(); emit(); }
if (typeof matchMedia === "function") matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (getThemePref() === "system") applyThemePref(); });
export const isMuted = () => get(K_MUTE) === "1";
export const setMuted = m => set(K_MUTE, m ? "1" : null);
/* ── Số đo lưu trình duyệt ── */
const num = (k, d, lo, hi) => { const v = parseFloat(get(k)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const emit = () => document.dispatchEvent(new CustomEvent("prefs-change"));
export const K_ALL = ["ssw_gfx", "ssw_theme", "ssw_muted", "ssw_glass", "ssw_gl_blur", "ssw_gl_clear", "ssw_bg", "ssw_bg_bright", "ssw_vol", "ssw_rm", "ssw_hc", "ssw_dens", "ssw_nosplash", "ssw_side"];

/* Kính mờ: tắt (mặc định) = khung đặc theo giao diện; bật = khung trong suốt, chỉ còn viền.
   Hai thanh chỉnh: Độ mờ (làm mờ phần phía sau khung) và Độ trong (khung trong tới mức nào). */
export const GLASS_DEF = { blur: 14, clear: 85 };
export const isGlass = () => get(K_GLASS) === "1";
export const getGlassBlur = () => num("ssw_gl_blur", GLASS_DEF.blur, 0, 40);
export const getGlassClear = () => num("ssw_gl_clear", GLASS_DEF.clear, 0, 100);
export function setGlass(on) { set(K_GLASS, on ? "1" : null); applyGlass(); }
export function setGlassBlur(v) { set("ssw_gl_blur", Math.round(v)); applyGlass(); }
export function setGlassClear(v) { set("ssw_gl_clear", Math.round(v)); applyGlass(); }
export function applyGlass() {
  const d = document.documentElement, st = d.style;
  if (!isGlass()) { delete d.dataset.glass; ["--surface", "--surface-2", "--surface-3", "--gl-blur", "--text-2", "--text-3"].forEach(p => st.removeProperty(p)); return; }
  d.dataset.glass = "on";
  const c = getGlassClear() / 100, light = d.dataset.theme === "light", f = x => x.toFixed(3);
  /* c = 0 → khung gần như đặc; c = 1 → khung gần như trong hoàn toàn */
  const a = light ? 0.92 - 0.86 * c : 0.5 - 0.485 * c;
  const rgb = light ? "255,255,255" : "255,255,255";
  st.setProperty("--surface", `rgba(${rgb},${f(a)})`);
  st.setProperty("--surface-2", `rgba(${rgb},${f(Math.min(light ? 0.95 : 0.6, a + (light ? 0.2 : 0.05 + 0.1 * (1 - c))))})`);
  st.setProperty("--surface-3", light ? `rgba(0,0,0,${f(0.05 + 0.05 * (1 - c))})` : `rgba(255,255,255,${f(Math.min(0.1, a * 1.1 + 0.02))})`);
  st.setProperty("--gl-blur", getGlassBlur() + "px");
  /* Trên kính trong suốt chữ phụ sáng hơn một chút để vẫn rõ khi nền phía sau thay đổi */
  if (!light) { st.setProperty("--text-2", "#c4c4c4"); st.setProperty("--text-3", "#a8a8a8"); } else { st.removeProperty("--text-2"); st.removeProperty("--text-3"); }
}
/* ── Mức đồ họa: low (Tối ưu, mặc định) · mid (Trung bình) · high (Cao) ──
   low: bố cục gọn, không animation, nền ô vuông đứng yên, có âm thanh.
   mid: animation hiện tại + nền ô vuông chuyển động nhẹ, có âm thanh, KHÔNG hiện nền website.
   high: hiện nền website + âm thanh + animation nâng cao. */
export const GFX = ["low", "mid", "high"];
export const getGfx = () => { const v = get("ssw_gfx"); return v === "mid" || v === "high" ? v : "low"; };
export function setGfx(v) { set("ssw_gfx", v === "mid" || v === "high" ? v : null); applyBgPrefs(); applyComfort(); emit(); }
/* Nền website: ẩn hẳn, hoặc chỉnh độ sáng (30%–150%). Chỉ hiện ở mức đồ họa Cao. */
export const isBgHidden = () => get("ssw_bg") === "0";
export const getBgBright = () => num("ssw_bg_bright", 100, 30, 150);
export function setBgHidden(h) { set("ssw_bg", h ? "0" : null); applyBgPrefs(); emit(); }
export function setBgBright(v) { set("ssw_bg_bright", Math.round(v) === 100 ? null : Math.round(v)); applyBgPrefs(); }
export function applyBgPrefs() { const d = document.documentElement; d.style.setProperty("--bg-bright", String(getBgBright() / 100)); (isBgHidden() || getGfx() !== "high") ? d.dataset.bg = "off" : delete d.dataset.bg; }
/* Âm lượng nhạc nền */
export const getVolume = () => num("ssw_vol", 55, 0, 100);
export function setVolume(v) { set("ssw_vol", Math.round(v)); emit(); }
/* Thoải mái khi dùng: giảm chuyển động, tương phản cao, bố cục gọn, màn mở đầu */
const flag = k => get(k) === "1";
export const isReduceMotion = () => flag("ssw_rm"), isHighContrast = () => flag("ssw_hc"), isCompact = () => get("ssw_dens") === "compact", isIntroOff = () => flag("ssw_nosplash");
export function setFlag(name, on) {
  if (name === "motion") set("ssw_rm", on ? "1" : null); else if (name === "contrast") set("ssw_hc", on ? "1" : null);
  else if (name === "compact") set("ssw_dens", on ? "compact" : null); else if (name === "intro") set("ssw_nosplash", on ? null : "1");
  applyComfort();
}
export function applyComfort() {
  const d = document.documentElement;
  d.dataset.gfx = getGfx();
  isReduceMotion() ? d.dataset.motion = "reduced" : delete d.dataset.motion;
  isHighContrast() ? d.dataset.contrast = "high" : delete d.dataset.contrast;
  isCompact() ? d.dataset.density = "compact" : delete d.dataset.density;
}
/* Đưa mọi tuỳ chỉnh hiển thị về mặc định (không đổi ngôn ngữ) */
export function resetPrefs() { K_ALL.forEach(k => set(k, null)); applyThemePref(); applyGlass(); applyBgPrefs(); applyComfort(); emit(); }
export function applyAllPrefs() { applyGlass(); applyBgPrefs(); applyComfort(); }
