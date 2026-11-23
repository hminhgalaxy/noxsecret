/* Trang con có thẻ <head> riêng (tiêu đề, mô tả, canonical, Open Graph, JSON-LD) + nội dung tĩnh để Google đọc được ngay,
   thay vì mọi địa chỉ đều trả về cùng một index.html (khiến Google coi các trang con là bản sao của trang chủ).
   Giao diện thật vẫn do JavaScript dựng lại như cũ — hàm này chỉ thêm thông tin cho công cụ tìm kiếm. */
const fs = require("fs"), path = require("path");
const SITE = "https://skibidiscript.vercel.app";
const DB = "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app";
const NAME = "Skibidi Web";
const BASE = {}; /* các danh mục gốc cũ (Script/APK/iOS/Link) đã bị xóa khỏi web */
const PAGES = {
  "/": null,
  "/skibidiscript": ["What is Skibidi Web (skibidiscript)? — Skibidi Shop", "Skibidi Web, also called Skibidi Shop or skibidiscript, is a digital shop: top up your wallet by bank transfer, buy and receive instantly."],
  "/library": ["Content library — Skibidi Web", "Browse the free content library on Skibidi Web: posts reviewed before publishing, grouped by category."],
  "/categories": ["All categories — Skibidi Web", "Browse every category of reviewed content on Skibidi Web."],
  "/about": ["About Skibidi Web — Skibidi Shop", "Who runs Skibidi Web (skibidiscript), what the Skibidi shop offers and how payments and delivery work."],
  "/guide": ["User guide — Skibidi Web", "How to top up your wallet, buy from the Skibidi shop, find your orders and keep your account safe on Skibidi Web."],
  "/security": ["Security — Skibidi Web", "How Skibidi Web protects accounts and payments: 2-step verification, email codes and safe wallet top-ups."],
  "/terms": ["Terms of use — Skibidi Web", "The rules for using Skibidi Web."],
  "/privacy": ["Privacy policy — Skibidi Web", "What data Skibidi Web keeps, why, and how you can control it."],
};
const PRIVATE = /^\/(dev|login|register|forgot-password|two-step|auth|profile|settings|search|favorites|inbox|wallet|orders|help\/|notifications)/;
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n) => { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
async function getJson(p, timeout = 2500) {
  /* null = Firebase trả lời "không có dữ liệu"; undefined = lỗi mạng/máy chủ (KHÔNG được coi là "trang không tồn tại") */
  try { const c = new AbortController(), t = setTimeout(() => c.abort(), timeout); const r = await fetch(DB + "/" + p, { signal: c.signal }); clearTimeout(t); return r.ok ? await r.json() : (r.status === 404 ? null : undefined); } catch (_) { return undefined; }
}
/* Dữ liệu cũ dùng title/description/note thay cho name/desc — giống cách giao diện đọc (store.js: pick) */
const norm = it => it && typeof it === "object" ? Object.assign({}, it, { name: it.name || it.title, desc: it.desc || it.description || it.note }) : it;
let shell = "";
async function html() {
  if (shell) return shell;
  for (const p of [path.join(process.cwd(), "index.html"), path.join(__dirname, "..", "index.html")]) { try { shell = fs.readFileSync(p, "utf8"); if (shell) return shell; } catch (_) {} }
  try { const r = await fetch(SITE + "/index.html"); if (r.ok) shell = await r.text(); } catch (_) {}
  return shell;
}
const setTag = (h, re, rep) => re.test(h) ? h.replace(re, rep) : h;
function head(h, m) {
  const t = esc(m.title), d = esc(m.desc), u = esc(m.url), img = esc(m.image || SITE + "/assets/img/og.png");
  h = setTag(h, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  h = setTag(h, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`);
  h = setTag(h, /<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${m.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"}">`);
  h = setTag(h, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${u}">`);
  h = setTag(h, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`);
  h = setTag(h, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`);
  h = setTag(h, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${u}">`);
  h = setTag(h, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${img}">`);
  h = setTag(h, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${t}">`);
  h = setTag(h, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d}">`);
  h = setTag(h, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${img}">`);
  if (m.ld) h = h.replace("</head>", `<script type="application/ld+json">${JSON.stringify(m.ld).replace(/</g, "\\u003c")}</script>\n</head>`);
  if (m.body) h = h.replace(/(<div id="view"[^>]*>)(<noscript>[\s\S]*?<\/noscript>)?/, (_, a) => `${a}<noscript><style>.seo-static{position:static;width:auto;height:auto;overflow:visible;clip:auto;clip-path:none;white-space:normal;padding:16px}</style></noscript><div id="seoStatic" class="seo-static">${m.body}</div>`); /* bỏ khối noscript của khung trang để chỉ còn một <h1> */
  return h;
}
const crumbs = list => ({ "@type": "BreadcrumbList", itemListElement: list.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })) });
const nav = `<p><a href="/">Shop</a> · <a href="/library">Library</a> · <a href="/categories">Categories</a> · <a href="/guide">Guide</a> · <a href="/about">About</a></p>`;
const listHtml = (seg, items) => items.length ? `<ul>${items.map(([k, it]) => `<li><a href="/${seg}/${encodeURIComponent(k)}">${esc(clip(it.name, 120))}</a>${it.desc ? " — " + esc(clip(it.desc, 140)) : ""}</li>`).join("")}</ul>` : "";
async function items(node) {
  const v = await getJson("nox_data/" + encodeURIComponent(node) + '.json?orderBy="ts"&limitToLast=40');
  return v && typeof v === "object" ? Object.entries(v).map(([k, it]) => [k, norm(it)]).filter(([, it]) => it && typeof it === "object" && it.name).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)) : [];
}

const HOME_T = "Skibidi Web — Skibidi Shop: digital goods & instant delivery";
const HOME_D = "Skibidi Web (skibidiscript) is a digital shop: top up your wallet by bank transfer, buy digital goods and receive them instantly. Browse the Skibidi shop.";
const IDOK = /^[A-Za-z0-9_-]{1,40}$/;
const vnd = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("en-US") + " VND";
/* Chỉ mục nhẹ của cửa hàng (nox_shopseo, do máy chủ ghi) + mục lục. Trả về null nếu Firebase lỗi. */
async function shopIndex() {
  const [ix, cs] = await Promise.all([getJson("nox_shopseo.json", 3000), getJson("nox_shop/cats.json", 3000)]);
  if (ix === undefined || cs === undefined) return null;
  const list = ix && typeof ix === "object" ? Object.entries(ix).filter(([k, v]) => IDOK.test(k) && v && typeof v === "object" && v.n && v.a !== false)
    .map(([id, v]) => ({ id, name: String(v.n), desc: String(v.d || ""), price: Math.max(0, Math.floor(Number(v.p) || 0)), cat: String(v.c || ""), ts: Number(v.t) || 0, sold: Number(v.h) || 0, stock: typeof v.s === "number" ? v.s : null, img: !!v.i }))
    .sort((a, b) => b.sold - a.sold || b.ts - a.ts) : [];
  const cats = cs && typeof cs === "object" ? Object.entries(cs).filter(([k, v]) => IDOK.test(k) && v && v.name).map(([id, v]) => ({ id, name: String(v.name), sort: Number(v.sort) || 0 })).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)) : [];
  return { list, cats };
}
const imgUrl = id => SITE + "/img/shop/" + encodeURIComponent(id) + ".jpg";
const prodList = list => list.length ? `<ul>${list.slice(0, 60).map(x => `<li><a href="/shop/${encodeURIComponent(x.id)}">${esc(clip(x.name, 120))}</a> — ${vnd(x.price)}${x.stock !== null && x.stock <= 0 ? " (out of stock)" : ""}${x.desc ? " — " + esc(clip(x.desc, 140)) : ""}</li>`).join("")}</ul>` : "";
const catNav = cats => cats.length ? `<p>${cats.map(c => `<a href="/shop/c/${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join(" · ")}</p>` : "";
const itemListLd = (list, id) => ({ "@type": "ItemList", "@id": id, itemListElement: list.slice(0, 30).map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/shop/" + encodeURIComponent(x.id), name: x.name })) });
async function resolve(p) {
  const seg = p.split("/").filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (_) { return s; } });
  if (p === "/") {
    const sx = await shopIndex(), list = sx ? sx.list : [], cats = sx ? sx.cats : [];
    return { ok: true, title: HOME_T, desc: HOME_D, url: SITE + "/",
      body: `<h1>Skibidi Web — Skibidi Shop</h1><p>${esc(HOME_D)}</p>${catNav(cats)}${prodList(list)}${nav}`,
      ld: list.length ? { "@context": "https://schema.org", "@graph": [itemListLd(list, SITE + "/#shop")] } : null };
  }
  if (PAGES[p]) { const e = PAGES[p]; return { ok: true, title: e ? e[0] : null, desc: e ? e[1] : null, url: SITE + (p === "/" ? "/" : p), body: e ? `<h1>${esc(e[0].split(" — ")[0])}</h1><p>${esc(e[1])}</p>${nav}` : null, ld: e ? { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", "@id": SITE + p + "#page", url: SITE + p, name: e[0], description: e[1], isPartOf: { "@id": SITE + "/#site" }, publisher: { "@id": SITE + "/#org" } }, crumbs([["Home", SITE + "/"], [e[0].split(" — ")[0], SITE + p]])] } : null }; }
  if (PRIVATE.test(p)) return { ok: true, noindex: true, title: NAME, desc: "Skibidi Web — Skibidi Shop.", url: SITE + "/" };
  if (seg[0] === "shop" && seg[1] === "c" && seg.length === 3 && IDOK.test(seg[2])) {
    const sx = await shopIndex(); if (!sx) throw new Error("upstream");
    const c = sx.cats.find(x => x.id === seg[2]); if (!c) return { ok: false };
    const list = sx.list.filter(x => x.cat === c.id), url = SITE + "/shop/c/" + encodeURIComponent(c.id);
    const from = list.length ? Math.min(...list.map(x => x.price)) : 0;
    const t = `${clip(c.name, 60)} — Skibidi Web`, d = clip(list.length ? `Buy ${c.name} on Skibidi Web: ${list.length} product${list.length === 1 ? "" : "s"} from ${vnd(from)}. Pay with your wallet balance and get instant delivery.` : `${c.name} on Skibidi Web — products coming soon.`, 160);
    return { ok: true, title: t, desc: d, url, image: list.find(x => x.img) ? imgUrl(list.find(x => x.img).id) : null,
      body: `<h1>${esc(c.name)}</h1><p>${esc(d)}</p>${catNav(sx.cats)}${prodList(list)}<p><a href="/">Shop</a></p>${nav}`,
      ld: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", "@id": url + "#page", url, name: t, description: d, isPartOf: { "@id": SITE + "/#site" } }, ...(list.length ? [itemListLd(list, url + "#list")] : []), crumbs([["Home", SITE + "/"], [c.name, url]])] } };
  }
  if (seg[0] === "shop" && seg.length === 2 && IDOK.test(seg[1])) {
    const it = await getJson("nox_shop/items/" + encodeURIComponent(seg[1]) + ".json");
    if (it === undefined) throw new Error("upstream");
    if (!it || typeof it !== "object" || !it.name || it.active === false) return { ok: false };
    const hasImg = !!(it.img || (it.imgs && (it.imgs.a || it.imgs.b || it.imgs.c))), im = hasImg ? imgUrl(seg[1]) : null;
    const url = SITE + "/shop/" + encodeURIComponent(seg[1]), price = Math.max(0, Math.floor(Number(it.price) || 0)), inStock = typeof it.stock !== "number" || it.stock > 0;
    const d = clip(it.desc || `${it.name} — buy with your wallet balance on Skibidi Web. Instant delivery after payment.`, 160), t = `${clip(it.name, 70)} — Skibidi Web`;
    return { ok: true, title: t, desc: d, url, image: im,
      body: `<h1>${esc(it.name)}</h1>${im ? `<img src="${esc(im)}" alt="${esc(clip(it.name, 120))}" width="480" height="480">` : ""}<p>${esc(clip(it.desc, 600))}</p><p>${price.toLocaleString("en-US")} VND — ${inStock ? "In stock" : "Out of stock"}</p><p><a href="/">Shop</a>${it.cat && IDOK.test(String(it.cat)) ? ` · <a href="/shop/c/${encodeURIComponent(String(it.cat))}">More in this category</a>` : ""}</p>${nav}`,
      ld: { "@context": "https://schema.org", "@graph": [{ "@type": "Product", "@id": url + "#product", name: String(it.name), description: d, url, sku: seg[1], ...(im ? { image: [im] } : {}),
        offers: { "@type": "Offer", url, priceCurrency: "VND", price: String(price), availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name: NAME } } }, crumbs([["Home", SITE + "/"], [String(it.name), url]])] } };
  }
  let node = null, label = null, root = null;
  if (BASE[seg[0]]) { node = BASE[seg[0]][0]; label = BASE[seg[0]][1]; root = "/" + seg[0]; }
  else if (seg[0] === "c" && /^[a-z0-9-]+$/.test(seg[1] || "")) { node = seg[1]; root = "/c/" + seg[1]; const cats = await getJson("nox_categories.json"); const c = cats && Object.values(cats).find(x => x && String(x.node || "").toLowerCase() === node); if (!c) return { ok: false }; label = String(c.label || node); }
  if (!node) return { ok: false };
  if (seg.length === (seg[0] === "c" ? 2 : 1)) {
    const list = await items(node), t = `${label} — Skibidi Web`, d = `Browse ${label} on Skibidi Web: reviewed content, clear warnings, copy code or open links in one tap.`;
    return { ok: true, title: t, desc: d, url: SITE + root, body: `<h1>${esc(label)}</h1><p>${esc(d)}</p>${listHtml(root.slice(1), list)}${nav}`,
      ld: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", url: SITE + root, name: t, description: d, isPartOf: { "@id": SITE + "/#site" } }, crumbs([["Home", SITE + "/"], [label, SITE + root]])] } };
  }
  if (seg.length === (seg[0] === "c" ? 3 : 2) && !/\/(edit|create)$/.test(p)) {
    const key = seg[seg.length - 1], raw = await getJson("nox_data/" + encodeURIComponent(node) + "/" + encodeURIComponent(key) + ".json");
    if (raw === undefined) throw new Error("upstream");
    const it = norm(raw);
    if (!it || typeof it !== "object" || !it.name) return { ok: false };
    const url = SITE + root + "/" + encodeURIComponent(key), d = clip(it.desc || `${it.name} on Skibidi Web — reviewed before publishing.`, 160), t = `${clip(it.name, 70)} — ${label} · Skibidi Web`;
    const img = /^https:\/\//.test(it.img || "") ? it.img : null;
    return { ok: true, title: t, desc: d, url, image: img,
      body: `<h1>${esc(it.name)}</h1><p>${esc(clip(it.desc, 600))}</p><p><a href="${esc(root)}">${esc(label)}</a></p>${nav}`,
      ld: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", "@id": url + "#page", url, name: String(it.name), description: d, ...(it.ts ? { datePublished: new Date(it.ts).toISOString() } : {}), ...(img ? { primaryImageOfPage: { "@type": "ImageObject", url: img } } : {}), isPartOf: { "@id": SITE + "/#site" }, publisher: { "@id": SITE + "/#org" } }, crumbs([["Home", SITE + "/"], [label, SITE + root], [String(it.name), url]])] } };
  }
  return { ok: true, noindex: true, title: NAME, desc: "Skibidi Web — Skibidi Shop.", url: SITE + "/" };
}
module.exports = async (req, res) => {
  let p = "";
  try { p = String((req.query && req.query.p) || ""); } catch (_) {}
  if (!p || p.includes("$")) { try { p = new URL(req.url, SITE).pathname; } catch (_) { p = "/"; } if (p === "/api/page") p = "/"; }
  p = "/" + p.replace(/^\/+/, "").replace(/\/+$/, ""); if (!/^\/[A-Za-z0-9\-._~%\/]*$/.test(p) || p.length > 300) p = "/__invalid";
  let h = await html();
  if (!h) { res.statusCode = 503; res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("Service temporarily unavailable"); }
  let m; try { m = await resolve(p); } catch (_) {
    /* Firebase tạm lỗi: trả 503 (không lưu cache, không gắn noindex) để Google tự thử lại, thay vì đánh dấu trang là noindex/404 */
    res.statusCode = 503; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Retry-After", "120"); res.setHeader("Cache-Control", "no-store");
    return res.end("<!doctype html><meta charset=utf-8><title>Temporarily unavailable</title><p>The page is temporarily unavailable. Please try again in a moment.</p>"); }
  if (!m.ok) { h = head(h, { title: "Page not found — Skibidi Web", desc: "This page does not exist.", url: SITE + "/", noindex: true }); res.statusCode = 404; }
  else { res.statusCode = 200; if (m.title || m.noindex) h = head(h, m); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", m.ok && !m.noindex ? "public, s-maxage=300, stale-while-revalidate=3600" : "public, s-maxage=60");
  if (!m.ok || m.noindex) res.setHeader("X-Robots-Tag", "noindex");
  res.end(h);
};
