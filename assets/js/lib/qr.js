/* Bộ tạo mã QR nhỏ gọn, tự viết (không phụ thuộc thư viện ngoài): chế độ byte, mức sửa lỗi M, phiên bản 1–10 (tới 213 byte).
   Đủ cho chuỗi VietQR (~170 ký tự). Được kiểm tra bằng cách quét lại ảnh bằng bộ giải mã (tests/e2e + kiểm tra thủ công). */

/* ── Trường Galois GF(256), đa thức 0x11d ── */
const EXP = new Array(512), LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function rsGen(n) { let p = [1]; for (let i = 0; i < n; i++) { const q = new Array(p.length + 1).fill(0); for (let j = 0; j < p.length; j++) { q[j] ^= p[j]; q[j + 1] ^= gmul(p[j], EXP[i]); } p = q; } return p; }
function rsEc(data, n) { const g = rsGen(n), r = new Array(n).fill(0); for (const d of data) { const f = d ^ r[0]; r.shift(); r.push(0); if (f) for (let i = 0; i < n; i++) r[i] ^= gmul(g[i + 1], f); } return r; }

/* Mức M: [số byte sửa lỗi mỗi khối, [số khối, số byte dữ liệu mỗi khối], [số khối 2, byte dữ liệu mỗi khối 2]] */
const M = [null, [10, [1, 16]], [16, [1, 28]], [26, [1, 44]], [18, [2, 32]], [24, [2, 43]], [16, [4, 27]], [18, [4, 31]], [22, [2, 38], [2, 39]], [22, [3, 36], [2, 37]], [26, [4, 43], [1, 44]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const dataCw = v => M[v].slice(1).reduce((s, [n, k]) => s + n * k, 0);
export const QR_MAX_BYTES = 213;

function bch(v, poly, bits) { const hi = (x) => 31 - Math.clz32(x); let d = v << bits; while (d && hi(d) >= hi(poly)) d ^= poly << (hi(d) - hi(poly)); return (v << bits) | d; }
const formatBits = mask => (bch((0 << 3) | mask, 0x537, 10)) ^ 0x5412; /* mức M = 00 */
const versionBits = v => bch(v, 0x1f25, 12);

function encode(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let v = 1; while (v <= 10 && bytes.length > dataCw(v) - (v < 10 ? 2 : 3)) v++;
  if (v > 10) throw new Error("QR: dữ liệu quá dài");
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCw(v) * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0; cw.length < dataCw(v); p++) cw.push(p % 2 ? 0x11 : 0xec);
  /* chia khối + sinh byte sửa lỗi + xen kẽ */
  const [ecn, ...groups] = M[v], blocks = []; let o = 0;
  groups.forEach(([n, k]) => { for (let i = 0; i < n; i++) { const d = cw.slice(o, o + k); o += k; blocks.push({ d, e: rsEc(d, ecn) }); } });
  const out = [], maxD = Math.max(...blocks.map(b => b.d.length));
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.d.length) out.push(b.d[i]); });
  for (let i = 0; i < ecn; i++) blocks.forEach(b => out.push(b.e[i]));
  return { v, out };
}

function build(text) {
  const { v, out } = encode(text), n = 17 + 4 * v;
  const mod = Array.from({ length: n }, () => new Array(n).fill(false)), fn = Array.from({ length: n }, () => new Array(n).fill(false));
  const set = (r, c, val) => { if (r >= 0 && r < n && c >= 0 && c < n) { mod[r][c] = val; fn[r][c] = true; } };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const on = i >= 0 && i <= 6 && j >= 0 && j <= 6 && (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)); set(r + i, c + j, on); } };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  const al = ALIGN[v];
  for (const r of al) for (const c of al) { if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1); }
  for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  set(n - 8, 8, true);
  for (let i = 0; i < 9; i++) { fn[8][i] = fn[i][8] = true; } for (let i = 0; i < 8; i++) { fn[8][n - 1 - i] = fn[n - 1 - i][8] = true; }
  if (v >= 7) { const vb = versionBits(v); for (let i = 0; i < 18; i++) { const b = (vb >> i) & 1, a = n - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, !!b); set(c, a, !!b); } }
  /* đặt dữ liệu theo đường zigzag */
  const bitsOut = []; out.forEach(b => { for (let i = 7; i >= 0; i--) bitsOut.push((b >> i) & 1); });
  const place = []; let up = true, k = 0;
  for (let c = n - 1; c > 0; c -= 2) { if (c === 6) c--; for (let i = 0; i < n; i++) { const r = up ? n - 1 - i : i; for (const cc of [c, c - 1]) if (!fn[r][cc]) place.push([r, cc]); } up = !up; }
  place.forEach(([r, c]) => { mod[r][c] = (bitsOut[k++] || 0) === 1; });
  const MASK = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0, (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0];
  const withMask = m => {
    const g = mod.map((row, r) => row.map((x, c) => (fn[r][c] ? x : x !== MASK[m](r, c))));
    const fb = formatBits(m), bit = i => ((fb >> i) & 1) === 1;
    for (let i = 0; i < 6; i++) g[i][8] = bit(i); g[7][8] = bit(6); g[8][8] = bit(7); g[8][7] = bit(8); for (let i = 9; i < 15; i++) g[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) g[8][n - 1 - i] = bit(i); for (let i = 8; i < 15; i++) g[n - 15 + i][8] = bit(i);
    g[n - 8][8] = true; return g;
  };
  const penalty = g => {
    let p = 0;
    for (let pass = 0; pass < 2; pass++) for (let a = 0; a < n; a++) { let run = 1; for (let b = 1; b < n; b++) { const cur = pass ? g[b][a] : g[a][b], prev = pass ? g[b - 1][a] : g[a][b - 1]; if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (g[r][c] === g[r][c + 1] && g[r][c] === g[r + 1][c] && g[r][c] === g[r + 1][c + 1]) p += 3;
    const pat = [true, false, true, true, true, false, true, false, false, false, false], pat2 = pat.slice().reverse();
    for (let a = 0; a < n; a++) for (let b = 0; b <= n - 11; b++) for (const q of [pat, pat2]) { let h = true, w = true; for (let i = 0; i < 11; i++) { if (g[a][b + i] !== q[i]) h = false; if (g[b + i][a] !== q[i]) w = false; } if (h) p += 40; if (w) p += 40; }
    let dark = 0; g.forEach(row => row.forEach(x => { if (x) dark++; })); p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
    return p;
  };
  let best = null, bp = Infinity; for (let m = 0; m < 8; m++) { const g = withMask(m), p = penalty(g); if (p < bp) { bp = p; best = g; } }
  return best;
}

/* → chuỗi SVG (nền trắng, chấm đen, vùng yên tĩnh 4 ô) — luôn đen/trắng để máy quét đọc được ở cả chế độ tối */
export function qrSvg(text, { margin = 4, label = "Mã QR" } = {}) {
  const g = build(String(text)), n = g.length, s = n + margin * 2; let d = "";
  for (let r = 0; r < n; r++) { let c = 0; while (c < n) { if (!g[r][c]) { c++; continue; } let e = c; while (e < n && g[r][e]) e++; d += `M${c + margin} ${r + margin}h${e - c}v1h${-(e - c)}z`; c = e; } }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
export const qrMatrix = build;
