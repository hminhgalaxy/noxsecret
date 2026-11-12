/* Trang con có thẻ <head> riêng (tiêu đề, mô tả, canonical, Open Graph, JSON-LD) + nội dung tĩnh để Google đọc được ngay,
   thay vì mọi địa chỉ đều trả về cùng một index.html (khiến Google coi các trang con là bản sao của trang chủ).
   Giao diện thật vẫn do JavaScript dựng lại như cũ — hàm này chỉ thêm thông tin cho công cụ tìm kiếm. */
const fs = require("fs"), path = require("path");
const SITE = "https://skibidiscript.vercel.app";
const DB = "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app";
const NAME = "SKIBIDI SCRIPT WEB";
const BASE = { scripts: ["scripts", "Scripts"], apk: ["apks", "APK"], links: ["links", "Links"], ios: ["ios", "iOS"] };
const PAGES = {
  "/": null,
  "/skibidiscript": ["What is skibidiscript? — SKIBIDI SCRIPT WEB", "skibidiscript (SKIBIDI SCRIPT WEB) is a high-security website for sharing APK packages, scripts and useful links, reviewed before publishing."],
  "/categories": ["All categories — skibidiscript", "Browse every category of reviewed content on SKIBIDI SCRIPT WEB: scripts, APKs, iOS and links."],
  "/about": ["About skibidiscript — SKIBIDI SCRIPT WEB", "Who runs SKIBIDI SCRIPT WEB, what it offers and how content is reviewed before it is published."],
  "/guide": ["User guide — skibidiscript", "How to browse, search, copy code, save and like posts on SKIBIDI SCRIPT WEB."],
  "/apk-safety": ["APK safety tips — skibidiscript", "How to check an APK before installing it: sources, permissions, scanning and what to avoid."],
  "/security": ["Security — skibidiscript", "How SKIBIDI SCRIPT WEB protects accounts: 2-step verification, reviewed content and clear warnings for third-party software."],
  "/terms": ["Terms of use — skibidiscript", "The rules for using SKIBIDI SCRIPT WEB."],
  "/privacy": ["Privacy policy — skibidiscript", "What data SKIBIDI SCRIPT WEB keeps, why, and how you can control it."],
  "/help": ["Help & FAQ — skibidiscript", "Frequently asked questions about accounts, security, content and settings on SKIBIDI SCRIPT WEB."]
};
const PRIVATE = /^\/(dev|login|register|forgot-password|two-step|auth|profile|settings|search|favorites|inbox|help\/|notifications)/;
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n) => { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
async function getJson(p, timeout = 2500) {
  try { const c = new AbortController(), t = setTimeout(() => c.abort(), timeout); const r = await fetch(DB + "/" + p, { signal: c.signal }); clearTimeout(t); return r.ok ? await r.json() : null; } catch (_) { return null; }
}
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
  if (m.body) h = h.replace(/(<div id="view"[^>]*>)/, `$1<div id="seoStatic" class="seo-static">${m.body}</div>`);
  return h;
}
const crumbs = list => ({ "@type": "BreadcrumbList", itemListElement: list.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })) });
const nav = `<p><a href="/">Home</a> · <a href="/categories">Categories</a> · <a href="/scripts">Scripts</a> · <a href="/apk">APK</a> · <a href="/ios">iOS</a> · <a href="/links">Links</a> · <a href="/help">Help</a> · <a href="/about">About</a></p>`;
const listHtml = (seg, items) => items.length ? `<ul>${items.map(([k, it]) => `<li><a href="/${seg}/${encodeURIComponent(k)}">${esc(clip(it.name, 120))}</a>${it.desc ? " — " + esc(clip(it.desc, 140)) : ""}</li>`).join("")}</ul>` : "";
async function items(node) {
  const v = await getJson("nox_data/" + encodeURIComponent(node) + '.json?orderBy="ts"&limitToLast=40');
  return v && typeof v === "object" ? Object.entries(v).filter(([, it]) => it && typeof it === "object" && it.name).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)) : [];
}
async function resolve(p) {
  const seg = p.split("/").filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (_) { return s; } });
  if (p === "/" || PAGES[p]) { const e = PAGES[p]; return { ok: true, title: e ? e[0] : null, desc: e ? e[1] : null, url: SITE + (p === "/" ? "/" : p), body: e ? `<h1>${esc(e[0].split(" — ")[0])}</h1><p>${esc(e[1])}</p>${nav}` : null, ld: e ? { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", "@id": SITE + p + "#page", url: SITE + p, name: e[0], description: e[1], isPartOf: { "@id": SITE + "/#site" }, publisher: { "@id": SITE + "/#org" } }, crumbs([["Home", SITE + "/"], [e[0].split(" — ")[0], SITE + p]])] } : null }; }
  if (PRIVATE.test(p)) return { ok: true, noindex: true, title: NAME + " — skibidiscript", desc: "SKIBIDI SCRIPT WEB (skibidiscript).", url: SITE + "/" };
  let node = null, label = null, root = null;
  if (BASE[seg[0]]) { node = BASE[seg[0]][0]; label = BASE[seg[0]][1]; root = "/" + seg[0]; }
  else if (seg[0] === "c" && /^[a-z0-9-]+$/.test(seg[1] || "")) { node = seg[1]; root = "/c/" + seg[1]; const cats = await getJson("nox_categories.json"); const c = cats && Object.values(cats).find(x => x && String(x.node || "").toLowerCase() === node); if (!c) return { ok: false }; label = String(c.label || node); }
  if (!node) return { ok: false };
  if (seg.length === (seg[0] === "c" ? 2 : 1)) {
    const list = await items(node), t = `${label} — SKIBIDI SCRIPT WEB (skibidiscript)`, d = `Browse ${label} on SKIBIDI SCRIPT WEB: reviewed content, clear warnings, copy code or open links in one tap.`;
    return { ok: true, title: t, desc: d, url: SITE + root, body: `<h1>${esc(label)}</h1><p>${esc(d)}</p>${listHtml(root.slice(1), list)}${nav}`,
      ld: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", url: SITE + root, name: t, description: d, isPartOf: { "@id": SITE + "/#site" } }, crumbs([["Home", SITE + "/"], [label, SITE + root]])] } };
  }
  if (seg.length === (seg[0] === "c" ? 3 : 2) && !/\/(edit|create)$/.test(p)) {
    const key = seg[seg.length - 1], it = await getJson("nox_data/" + encodeURIComponent(node) + "/" + encodeURIComponent(key) + ".json");
    if (!it || typeof it !== "object" || !it.name) return { ok: false };
    const url = SITE + root + "/" + encodeURIComponent(key), d = clip(it.desc || `${it.name} on SKIBIDI SCRIPT WEB — reviewed before publishing.`, 160), t = `${clip(it.name, 70)} — ${label} · skibidiscript`;
    const img = /^https:\/\//.test(it.img || "") ? it.img : null;
    return { ok: true, title: t, desc: d, url, image: img,
      body: `<h1>${esc(it.name)}</h1><p>${esc(clip(it.desc, 600))}</p><p><a href="${esc(root)}">${esc(label)}</a></p>${nav}`,
      ld: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", "@id": url + "#page", url, name: String(it.name), description: d, ...(it.ts ? { datePublished: new Date(it.ts).toISOString() } : {}), ...(img ? { primaryImageOfPage: { "@type": "ImageObject", url: img } } : {}), isPartOf: { "@id": SITE + "/#site" }, publisher: { "@id": SITE + "/#org" } }, crumbs([["Home", SITE + "/"], [label, SITE + root], [String(it.name), url]])] } };
  }
  return { ok: true, noindex: true, title: NAME + " — skibidiscript", desc: "SKIBIDI SCRIPT WEB (skibidiscript).", url: SITE + "/" };
}
module.exports = async (req, res) => {
  let p = "";
  try { p = String((req.query && req.query.p) || ""); } catch (_) {}
  if (!p || p.includes("$")) { try { p = new URL(req.url, SITE).pathname; } catch (_) { p = "/"; } if (p === "/api/page") p = "/"; }
  p = "/" + p.replace(/^\/+/, "").replace(/\/+$/, ""); if (!/^\/[A-Za-z0-9\-._~%\/]*$/.test(p) || p.length > 300) p = "/__invalid";
  let h = await html();
  if (!h) { res.statusCode = 503; res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("Service temporarily unavailable"); }
  let m; try { m = await resolve(p); } catch (_) { m = { ok: true, noindex: true, title: NAME, desc: NAME, url: SITE + "/" }; }
  if (!m.ok) { h = head(h, { title: "Page not found — SKIBIDI SCRIPT WEB", desc: "This page does not exist.", url: SITE + "/", noindex: true }); res.statusCode = 404; }
  else { res.statusCode = 200; if (m.title) h = head(h, m); else if (m.noindex) h = head(h, m); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", m.ok && !m.noindex ? "public, s-maxage=300, stale-while-revalidate=3600" : "public, s-maxage=60");
  if (!m.ok || m.noindex) res.setHeader("X-Robots-Tag", "noindex");
  res.end(h);
};
