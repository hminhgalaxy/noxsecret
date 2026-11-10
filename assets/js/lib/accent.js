/* Màu nhấn: đổi màu nút chính, viền focus, công tắc. Lưu trên trình duyệt này; "Mặc định" trả về giao diện đen/trắng. */
const KEY = "ssw_accent";
export const ACCENTS = [
  { id: "", label: "Mặc định", hex: "" }, { id: "blue", label: "Xanh dương", hex: "#3b82f6" }, { id: "violet", label: "Tím", hex: "#8b5cf6" },
  { id: "green", label: "Xanh lá", hex: "#16a34a" }, { id: "orange", label: "Cam", hex: "#ea580c" }, { id: "pink", label: "Hồng", hex: "#db2777" }, { id: "red", label: "Đỏ", hex: "#dc2626" }
];
export const getAccent = () => { try { const v = localStorage.getItem(KEY) || ""; return ACCENTS.some(a => a.id === v) ? v : ""; } catch (_) { return ""; } };
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * r + .7152 * g + .0722 * b; };
const shade = (h, f) => "#" + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))).toString(16).padStart(2, "0")).join("");
export function applyAccent() {
  const a = ACCENTS.find(x => x.id === getAccent()), s = document.documentElement.style, V = ["--strong", "--strong-hover", "--on-strong", "--ring", "--accent"];
  if (!a || !a.hex) { V.forEach(v => s.removeProperty(v)); document.documentElement.removeAttribute("data-accent"); return; }
  s.setProperty("--strong", a.hex); s.setProperty("--strong-hover", shade(a.hex, .88)); s.setProperty("--on-strong", lum(a.hex) > .42 ? "#0a0a0a" : "#ffffff");
  s.setProperty("--ring", a.hex + "66"); s.setProperty("--accent", a.hex); document.documentElement.setAttribute("data-accent", a.id);
}
export function setAccent(id) { try { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY); } catch (_) {} applyAccent(); document.dispatchEvent(new CustomEvent("prefs-change")); }
