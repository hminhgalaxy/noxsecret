/* Ảnh sản phẩm dưới dạng tệp ảnh thật (/img/shop/<id>.jpg) cho Google Hình ảnh, Open Graph và dữ liệu Product.
   Trong cơ sở dữ liệu ảnh được lưu dạng data URL; ở đây giải mã và trả về nhị phân, có cache dài trên CDN. */
const DB = "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app";
const ID = /^[A-Za-z0-9_-]{1,40}$/;
async function getJson(p) {
  try { const c = new AbortController(), t = setTimeout(() => c.abort(), 6000); const r = await fetch(DB + "/" + p, { signal: c.signal }); clearTimeout(t); return r.ok ? await r.json() : (r.status === 404 ? null : undefined); } catch (_) { return undefined; }
}
function decode(u) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(typeof u === "string" ? u : ""); if (!m) return null;
  const buf = Buffer.from(m[2].replace(/\s+/g, ""), "base64"); return buf.length > 8 && buf.length < 4 * 1024 * 1024 ? { type: m[1], buf } : null;
}
module.exports = async (req, res) => {
  let id = ""; try { id = String((req.query && req.query.id) || ""); } catch (_) {}
  const miss = (code, msg) => { res.statusCode = code; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.setHeader("Cache-Control", code === 404 ? "public, s-maxage=300" : "no-store"); res.setHeader("X-Robots-Tag", "noindex"); res.end(msg); };
  if (!ID.test(id)) return miss(404, "Not found");
  const e = encodeURIComponent(id);
  const [active, img, a, b, c] = await Promise.all(["active", "img", "imgs/a", "imgs/b", "imgs/c"].map(k => getJson("nox_shop/items/" + e + "/" + k + ".json")));
  if ([active, img].some(x => x === undefined)) return miss(503, "Temporarily unavailable");
  if (active === false) return miss(404, "Not found");
  const d = decode(img) || decode(a) || decode(b) || decode(c);
  if (!d) return miss(404, "Not found");
  res.statusCode = 200; res.setHeader("Content-Type", d.type); res.setHeader("Content-Length", String(d.buf.length));
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  res.end(d.buf);
};
