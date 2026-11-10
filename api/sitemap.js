/* Sơ đồ trang (sitemap.xml) tự cập nhật: liệt kê các trang chính và từng mục nội dung công khai. */
const SITE = "https://skibidiscript.vercel.app";
const DB = "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app";
const BASE = [["scripts", "scripts"], ["apks", "apk"], ["links", "links"], ["ios", "ios"]]; // [thư mục dữ liệu, đường dẫn trang]
const STATIC = ["/", "/skibidiscript", "/categories", "/scripts", "/apk", "/ios", "/links", "/notifications", "/help", "/about", "/guide", "/apk-safety", "/security", "/terms", "/privacy"];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function keys(path) {
  try { const r = await fetch(DB + "/" + path + ".json?shallow=true"); if (!r.ok) return []; const j = await r.json(); return j && typeof j === "object" ? Object.keys(j) : []; } catch (_) { return []; }
}
module.exports = async (req, res) => {
  const urls = STATIC.slice();
  try {
    const parts = await Promise.all(BASE.map(async ([node, seg]) => (await keys("nox_data/" + node)).map(k => "/" + seg + "/" + encodeURIComponent(k))));
    parts.forEach(p => urls.push(...p));
    let cats = {}; try { const r = await fetch(DB + "/nox_categories.json"); if (r.ok) cats = (await r.json()) || {}; } catch (_) {}
    const customs = Object.values(cats).map(c => c && String(c.node || "").toLowerCase()).filter(n => /^[a-z0-9-]+$/.test(n || ""));
    for (const n of customs) { urls.push("/c/" + n); (await keys("nox_data/" + n)).forEach(k => urls.push("/c/" + n + "/" + encodeURIComponent(k))); }
  } catch (_) {}
  const today = new Date().toISOString().slice(0, 10);
  const IMG = "<image:image><image:loc>" + SITE + "/assets/img/icon-512.png</image:loc><image:title>SKIBIDI SCRIPT WEB</image:title></image:image>";
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    urls.slice(0, 5000).map(u => `  <url><loc>${esc(SITE + u)}</loc><lastmod>${today}</lastmod><priority>${u === "/" ? "1.0" : STATIC.includes(u) ? "0.8" : "0.6"}</priority>${u === "/" ? IMG : ""}</url>`).join("\n") + "\n</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
};
