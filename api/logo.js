/* Logo Skibidi Web được VẼ BẰNG CODE — không có tệp ảnh nào nằm trong dự án.
   /logo.svg, /favicon.ico, /icons/<tên>.png đều đi qua hàm này (xem rewrites trong vercel.json).
   PNG/ICO được tô bằng bộ vẽ riêng (khoảng cách tới đường cong, làm mịn viền), nén bằng zlib có sẵn của Node.
   Kết quả được nhớ trong bộ nhớ và cache dài trên CDN nên chỉ tốn công vẽ một lần. */
const zlib = require("zlib");

/* ── Hình gốc (hệ toạ độ 100×100): ô bo góc + chữ S nét tròn ── */
const TILE = { x: 4, y: 4, w: 92, h: 92, r: 27 };
const S_PATH = "M67 34c-2-8-9-12-18-12-10 0-17 5-17 13 0 8 6 11 18 14 12 3 18 7 18 16 0 8-8 13-18 13-9 0-16-4-18-12";
const STROKE = 9, LIGHT = [250, 250, 250], DARK = [10, 10, 10];

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Skibidi Web">'
  + `<rect x="${TILE.x}" y="${TILE.y}" width="${TILE.w}" height="${TILE.h}" rx="${TILE.r}" fill="#fafafa"/>`
  + `<path d="${S_PATH}" fill="none" stroke="#0a0a0a" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* Đọc đường cong tương đối "M…c…" thành các điểm nhỏ để đo khoảng cách. */
function polyline(d, steps = 28) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number); let i = 2, cx = nums[0], cy = nums[1]; const pts = [[cx, cy]];
  while (i + 5 < nums.length) {
    const [a, b, c, e, f, g] = nums.slice(i, i + 6), p0 = [cx, cy], p1 = [cx + a, cy + b], p2 = [cx + c, cy + e], p3 = [cx + f, cy + g];
    for (let s = 1; s <= steps; s++) { const t = s / steps, u = 1 - t; pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    cx += f; cy += g; i += 6;
  }
  return pts;
}
const PTS = polyline(S_PATH), SEG = PTS.slice(1).map((p, k) => [PTS[k][0], PTS[k][1], p[0], p[1]]);
const BBOX = PTS.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [1e9, 1e9, -1e9, -1e9]);

function distSeg(px, py, s) {
  const dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy; let t = l2 ? ((px - s[0]) * dx + (py - s[1]) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = s[0] + t * dx - px, y = s[1] + t * dy - py; return x * x + y * y;
}
function distS(px, py) { let m = 1e18; for (const s of SEG) { const d = distSeg(px, py, s); if (d < m) m = d; } return Math.sqrt(m); }
function distTile(px, py) { /* khoảng cách có dấu tới ô bo góc (âm = bên trong) */
  const cx = TILE.x + TILE.w / 2, cy = TILE.y + TILE.h / 2, qx = Math.abs(px - cx) - (TILE.w / 2 - TILE.r), qy = Math.abs(py - cy) - (TILE.h / 2 - TILE.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - TILE.r;
}
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const mix = (a, b, t) => a + (b - a) * t;

/* Tô một ảnh w×h. layout: { sc: số điểm ảnh cho mỗi đơn vị logo, ox, oy, bleed: tô kín nền, bg: nền tuỳ chọn (hàm x,y→[r,g,b]) } */
function raster(w, h, L) {
  const px = Buffer.alloc(w * h * 4), sc = L.sc, pad = (STROKE / 2 + 1.5) * sc;
  const x0 = BBOX[0] * sc + L.ox - pad, x1 = BBOX[2] * sc + L.ox + pad, y0 = BBOX[1] * sc + L.oy - pad, y1 = BBOX[3] * sc + L.oy + pad;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ux = (x + 0.5 - L.ox) / sc, uy = (y + 0.5 - L.oy) / sc;
    let r = 0, g = 0, b = 0, a = 0;
    if (L.bg) { const c = L.bg(x, y); r = c[0]; g = c[1]; b = c[2]; a = 1; }
    /* ô sáng */
    const ta = L.bleed ? 1 : clamp(0.5 - distTile(ux, uy) * sc);
    if (ta > 0) { const oa = ta + a * (1 - ta); r = (LIGHT[0] * ta + r * a * (1 - ta)) / oa; g = (LIGHT[1] * ta + g * a * (1 - ta)) / oa; b = (LIGHT[2] * ta + b * a * (1 - ta)) / oa; a = oa; }
    /* chữ S */
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
      const sa = clamp(0.5 - (distS(ux, uy) - STROKE / 2) * sc);
      if (sa > 0) { const oa = sa + a * (1 - sa); r = (DARK[0] * sa + r * a * (1 - sa)) / oa; g = (DARK[1] * sa + g * a * (1 - sa)) / oa; b = (DARK[2] * sa + b * a * (1 - sa)) / oa; a = oa; }
    }
    const o = (y * w + x) * 4; px[o] = Math.round(r); px[o + 1] = Math.round(g); px[o + 2] = Math.round(b); px[o + 3] = Math.round(a * 255);
  }
  return px;
}

/* ── PNG / ICO ── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type, "ascii"), data]); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; /* RGBA 8 bit */
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function ico(sizes) {
  const imgs = sizes.map(n => png(n, n, raster(n, n, tileLayout(n)))), head = Buffer.alloc(6 + 16 * imgs.length); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let off = head.length; imgs.forEach((im, i) => { const o = 6 + 16 * i, n = sizes[i]; head[o] = n >= 256 ? 0 : n; head[o + 1] = head[o]; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(im.length, o + 8); head.writeUInt32LE(off, o + 12); off += im.length; });
  return Buffer.concat([head, ...imgs]);
}

/* ── Các kiểu ảnh ── */
const tileLayout = n => ({ sc: n / 100, ox: 0, oy: 0 });
const KINDS = {
  "icon-48.png": () => png(48, 48, raster(48, 48, tileLayout(48))),
  "icon-96.png": () => png(96, 96, raster(96, 96, tileLayout(96))),
  "icon-192.png": () => png(192, 192, raster(192, 192, tileLayout(192))),
  "icon-512.png": () => png(512, 512, raster(512, 512, tileLayout(512))),
  /* maskable: nền kín, chữ S nằm gọn trong vùng an toàn 80% để hệ điều hành cắt tròn/bo góc thoải mái */
  "icon-maskable-512.png": () => png(512, 512, raster(512, 512, { sc: 5.2, ox: 256 - 50 * 5.2, oy: 256 - 50 * 5.2, bleed: true })),
  "apple-touch-icon.png": () => png(180, 180, raster(180, 180, { sc: 1.8, ox: 0, oy: 0, bleed: true })),
  /* ảnh chia sẻ 1200×630: nền tối có ánh sáng nhẹ, logo ở giữa */
  "og.png": () => png(1200, 630, raster(1200, 630, { sc: 3.6, ox: 600 - 50 * 3.6, oy: 315 - 50 * 3.6, bg: (x, y) => { const d = Math.hypot((x - 600) / 700, (y - 315) / 420), k = clamp(1 - d); return [mix(10, 46, k * k), mix(10, 46, k * k), mix(10, 52, k * k)]; } })),
  "favicon.ico": () => ico([16, 32, 48]),
  "logo.svg": () => Buffer.from(SVG)
};
const TYPE = { png: "image/png", ico: "image/x-icon", svg: "image/svg+xml; charset=utf-8" }, cache = new Map();

function render(name) { if (!Object.prototype.hasOwnProperty.call(KINDS, name)) return null; if (!cache.has(name)) cache.set(name, KINDS[name]()); return cache.get(name); }

module.exports = (req, res) => {
  let n = ""; try { n = String((req.query && req.query.n) || new URL(req.url, "http://x").searchParams.get("n") || ""); } catch { n = ""; }
  n = n.replace(/^.*\//, "");
  const buf = /^[a-z0-9.-]{1,40}$/.test(n) ? render(n) : null;
  if (!buf) { res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.setHeader("Cache-Control", "public, s-maxage=300"); return res.end("Not found"); }
  res.statusCode = 200; res.setHeader("Content-Type", TYPE[n.split(".").pop()]); res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800");
  res.end(buf);
};
module.exports.render = render; module.exports.names = Object.keys(KINDS); module.exports.SVG = SVG;
