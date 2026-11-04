/* Cài đặt người dùng (lưu trình duyệt): giao diện sáng/tối, âm thanh */
const K_THEME = "ssw_theme", K_MUTE = "ssw_muted";
const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };
/* Mặc định "dark" (giữ nguyên diện mạo site gốc); "system" là lựa chọn của người dùng */
export const getThemePref = () => { const v = get(K_THEME); return v === "light" || v === "system" ? v : "dark"; };
export const resolveTheme = (pref = getThemePref()) => pref === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : pref;
export function applyThemePref() {
  const r = resolveTheme(); document.documentElement.dataset.theme = r;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = r === "light" ? "#eef1f7" : "#0a0e16";
  return r;
}
export function setThemePref(p) { set(K_THEME, p); applyThemePref(); }
if (typeof matchMedia === "function") matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (getThemePref() === "system") applyThemePref(); });
export const isMuted = () => get(K_MUTE) === "1";
export const setMuted = m => set(K_MUTE, m ? "1" : null);
