/* Khúc xạ kính thật bằng SVG (feDisplacementMap + tách màu nhẹ ở viền) và hiệu ứng "gooey".
   Chỉ dùng cho vài khung nổi (thanh trên, thanh tab, popup, cửa sổ Danh mục, trình nhạc) để máy vẫn mượt.
   backdrop-filter: url(#…) chỉ chạy trên trình duyệt nhân Chromium; nơi khác tự rơi về làm mờ + tăng sắc độ (CSS đã có sẵn). */
const NS = "http://www.w3.org/2000/svg";
let host = null, n = 0;
const live = new Map(); /* phần tử → { id, w, h, ro } */

export const supportsRefract = () => {
  try {
    const ua = navigator.userAgent || "";
    if (!/Chrome|Chromium|CriOS|Edg\//.test(ua) || /Firefox|FxiOS/.test(ua)) return false;
    return !!(window.CSS && CSS.supports && CSS.supports("backdrop-filter", "url(#a) blur(1px)"));
  } catch (_) { return false; }
};
function ensureHost() {
  if (host) return host;
  host = document.createElementNS(NS, "svg"); host.setAttribute("width", "0"); host.setAttribute("height", "0"); host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
  host.innerHTML = `<defs><filter id="lq-goo" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/>
    <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter></defs>`;
  document.body.appendChild(host); return host;
}
/* Bản đồ độ lệch: R = lệch ngang, G = lệch dọc (128 = không lệch). Viền bo của khung được đẩy ra ngoài → như thấu kính lồi. */
function mapFor(w, h, radius, bezel) {
  const cw = Math.max(8, Math.min(320, Math.round(w))), ch = Math.max(8, Math.min(320, Math.round(h))), sx = w / cw, sy = h / ch;
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d"), img = g.createImageData(cw, ch), d = img.data, r = Math.min(radius, w / 2, h / 2), hw = w / 2, hh = h / 2;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const px = (x + .5) * sx - hw, py = (y + .5) * sy - hh;
    const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), out = Math.hypot(ox, oy), sd = out + Math.min(Math.max(qx, qy), 0) - r; /* <0 trong khung */
    const depth = -sd; let dx = 0, dy = 0;
    if (depth >= 0 && depth < bezel) {
      const t = 1 - depth / bezel, mag = t * t * (3 - 2 * t); /* mượt dần về 0 phía trong */
      let nx, ny;
      if (out > 0) { nx = ox / out * Math.sign(px || 1); ny = oy / out * Math.sign(py || 1); } else if (qx > qy) { nx = Math.sign(px || 1); ny = 0; } else { nx = 0; ny = Math.sign(py || 1); }
      dx = nx * mag; dy = ny * mag;
    }
    const i = (y * cw + x) * 4; d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c.toDataURL("image/png");
}
function build(id, w, h, radius) {
  const bezel = Math.max(6, Math.min(26, Math.min(w, h) * .34)), url = mapFor(w, h, radius, bezel), s = bezel * 1.7;
  const ch = (mat, sc, res) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${sc.toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="d${res}"/><feColorMatrix in="d${res}" type="matrix" values="${mat}" result="${res}"/>`;
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB">
    <feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
    ${ch("1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", s * .92, "r")}${ch("0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", s, "g")}${ch("0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0", s * 1.08, "b")}
    <feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>`;
}
const radiusOf = el => { const v = parseFloat(getComputedStyle(el).borderTopLeftRadius); return isFinite(v) ? v : 24; };
function paint(el) {
  const rec = live.get(el); if (!rec) return;
  const r = el.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
  if (w < 16 || h < 16 || (rec.w === w && rec.h === h && rec.r === radiusOf(el))) return;
  rec.w = w; rec.h = h; rec.r = radiusOf(el);
  let f = host.querySelector("#" + rec.id); if (f) f.remove();
  host.querySelector("defs").insertAdjacentHTML("beforeend", build(rec.id, w, h, rec.r));
  const ex = el.dataset.lqBf || "blur(3px) saturate(1.7) brightness(1.08)", v = `url(#${rec.id}) ${ex}`;
  el.style.webkitBackdropFilter = v; el.style.backdropFilter = v;
}
export function refract(el) {
  if (!el || live.has(el) || !document.documentElement.classList.contains("lq-refract")) return;
  ensureHost(); const rec = { id: "lq-r" + (++n), w: 0, h: 0, r: 0, ro: null };
  rec.ro = new ResizeObserver(() => paint(el)); rec.ro.observe(el); live.set(el, rec); paint(el);
}
export function unrefract(el) {
  const rec = live.get(el); if (!rec) return; rec.ro.disconnect(); live.delete(el);
  const f = host && host.querySelector("#" + rec.id); if (f) f.remove(); el.style.webkitBackdropFilter = ""; el.style.backdropFilter = "";
}
export function prune() { [...live.keys()].forEach(el => { if (!el.isConnected) unrefract(el); }); }
export function clearAll() { [...live.keys()].forEach(unrefract); }
export function initFilters() { ensureHost(); if (supportsRefract()) document.documentElement.classList.add("lq-refract"); }
export function stopFilters() { clearAll(); document.documentElement.classList.remove("lq-refract"); }
