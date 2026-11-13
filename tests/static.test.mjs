/* Kiểm thử SEO tĩnh: feed, sitemap, OpenSearch, vercel.json, robots, manifest, security.txt, index.html (không cần trình duyệt). */
import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url), R = p => new URL("../" + p, import.meta.url);
let pass = 0, fail = 0; const t = (n, a, e = true) => { const ok = JSON.stringify(a) === JSON.stringify(e); ok ? pass++ : (fail++, console.log("✗", n, "→", JSON.stringify(a), "(cần", JSON.stringify(e) + ")")); };
const txt = p => fs.readFileSync(R(p), "utf8");
const run = async (mod, fakeDb) => { const old = globalThis.fetch; globalThis.fetch = async u => ({ ok: true, json: async () => fakeDb(String(u)) }); const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.c = c; return this; }, send(b) { this.b = b; } }; try { await require(mod)({}, res); } finally { globalThis.fetch = old; } return res; };

const feed = await run("../api/feed.js", u => ({ a1: { title: "Bản <1> & mới", body: "Dòng 1\n- Lỗi", ts: 1700000000000, tag: "fix" }, a2: { title: "Cũ", ts: 1600000000000 }, bad: { ts: 5 } }));
t("feed: 200 + Atom", [feed.c, feed.h["Content-Type"]], [200, "application/atom+xml; charset=utf-8"]);
t("feed: escape XML", /Bản &lt;1&gt; &amp; mới/.test(feed.b) && !/<1>/.test(feed.b), true);
t("feed: mới nhất lên đầu, bỏ bài thiếu tiêu đề", [(feed.b.match(/<entry>/g) || []).length, feed.b.indexOf("Bản &lt;1") < feed.b.indexOf("Cũ")], [2, true]);
t("feed: phân loại + ngày cập nhật", /<category term="fix" label="Sửa lỗi"\/>/.test(feed.b) && /<updated>2023-11-14T22:13:20.000Z<\/updated>/.test(feed.b), true);
t("feed: ngày không hợp lệ không làm sập", (await run("../api/feed.js", () => ({ x: { title: "a", ts: "zzz" } }))).c, 200);
const feed0 = await run("../api/feed.js", () => null); t("feed: rỗng vẫn hợp lệ", [feed0.c, /<feed /.test(feed0.b), /<entry>/.test(feed0.b)], [200, true, false]);

const sm = await run("../api/sitemap.js", u => u.includes("shallow") ? { k1: true } : {});
for (const p of ["/skibidiscript", "/about", "/privacy", "/guide", "/apk-safety", "/security", "/terms"]) t("sitemap có " + p, sm.b.includes("<loc>https://skibidiscript.vercel.app" + p + "</loc>"), true);
t("sitemap: ảnh logo + schema ảnh", /image:loc>https:\/\/skibidiscript.vercel.app\/assets\/img\/icon-512.png/.test(sm.b) && /xmlns:image=/.test(sm.b), true);

const os = txt("opensearch.xml"); t("OpenSearch: mẫu tìm kiếm", /template="https:\/\/skibidiscript\.vercel\.app\/search\?q=\{searchTerms\}"/.test(os) && /<ShortName>skibidiscript<\/ShortName>/.test(os), true);
const vj = JSON.parse(txt("vercel.json")), rw = vj.rewrites;
t("vercel: /feed.xml → /api/feed (trước catch-all)", rw.findIndex(r => r.source === "/feed.xml" && r.destination === "/api/feed") < rw.length - 1 && rw.findIndex(r => r.source === "/feed.xml") >= 0, true);
const catchAll = new RegExp("^" + rw[rw.length - 1].source + "$");
for (const [p, shouldServe] of [["/opensearch.xml", false], ["/robots.txt", false], ["/favicon.ico", false], ["/.well-known/security.txt", false], ["/skibidiscript", true], ["/about", true], ["/scripts/abc", true]]) t("vercel catch-all: " + p, catchAll.test(p), shouldServe);
const robots = txt("robots.txt"); t("robots: sitemap + chặn trang riêng tư, không chặn /help", [/Sitemap: https:\/\/skibidiscript.vercel.app\/sitemap.xml/.test(robots), /Disallow: \/help\/\n/.test(robots), /Disallow: \/help\n/.test(robots), /Disallow: \/two-step/.test(robots)], [true, true, false, true]);
const mf = JSON.parse(txt("manifest.webmanifest")); t("manifest: id + shortcuts hợp lệ", [mf.id, mf.shortcuts.length >= 3, mf.shortcuts.every(s => s.url.startsWith("/") && s.name)], ["/", true, true]);
t("manifest: icon tồn tại", mf.icons.every(i => fs.existsSync(R(i.src.slice(1)))), true);
const sec = txt(".well-known/security.txt"); t("security.txt: Contact + Expires tương lai", [/^Contact: https:\/\//m.test(sec), new Date((sec.match(/^Expires: (.+)$/m) || [])[1]) > new Date()], [true, true]);
t("favicon.ico là ICO", fs.readFileSync(R("favicon.ico")).subarray(0, 4).toString("hex"), "00000100");

/* ── Cửa hàng: trang sản phẩm có SEO riêng, ví/đơn hàng không lập chỉ mục ── */
const pageRun = async (p, db) => { const old = globalThis.fetch; globalThis.fetch = async u => ({ ok: true, json: async () => db(String(u)) }); const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { this.b = b; } }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); try { await require("../api/page.js")({ query: { p }, url: "/api/page?p=" + p, headers: {} }, res); } finally { globalThis.fetch = old; } return res; };
const prod = u => u.includes("nox_shop/items/sp1") ? { name: "Key VIP <30 ngày>", desc: "Giao tự động", price: 59000, stock: 3, active: true } : u.includes("nox_shop/items/off") ? { name: "Ẩn", price: 1, active: false } : null;
const pg = await pageRun("/shop/sp1", prod);
t("shop: trang sản phẩm 200 + Product/Offer VND", [pg.statusCode, /"@type":"Product"/.test(pg.b), /"priceCurrency":"VND"/.test(pg.b), /"price":"59000"/.test(pg.b), /schema.org\/InStock/.test(pg.b)], [200, true, true, true, true]);
t("shop: escape HTML tên sản phẩm", /Key VIP &lt;30/.test(pg.b) && !/Key VIP <30/.test(pg.b), true);
t("shop: canonical /shop/sp1 + cho lập chỉ mục", /rel="canonical" href="https:\/\/skibidiscript.vercel.app\/shop\/sp1"/.test(pg.b) && /index,follow/.test(pg.b), true);
t("shop: sản phẩm ẩn / không có → 404", [(await pageRun("/shop/off", prod)).statusCode, (await pageRun("/shop/zzz", prod)).statusCode], [404, 404]);
const pw = await pageRun("/wallet", () => null); t("ví/đơn hàng: noindex", [pw.statusCode, /noindex/.test(pw.b), pw.h["X-Robots-Tag"]], [200, true, "noindex"]);
const lib = await pageRun("/library", () => null); t("/library: có tiêu đề riêng, lập chỉ mục", /<title>Content library/.test(lib.b) && /index,follow/.test(lib.b), true);
const smShop = await run("../api/sitemap.js", u => u.includes("nox_shop/items") ? { sp1: { name: "A", active: true }, off: { name: "B", active: false } } : u.includes("shallow") ? {} : {});
t("sitemap: có /library + sản phẩm đang bán, không có sản phẩm ẩn", [smShop.b.includes("/library</loc>"), smShop.b.includes("/shop/sp1</loc>"), smShop.b.includes("/shop/off")], [true, true, false]);
t("robots: chặn /wallet /orders", /Disallow: \/wallet/.test(robots) && /Disallow: \/orders/.test(robots), true);
const ix = txt("index.html");
t("index: tiêu đề có thương hiệu skibidiscript", /<title>skibidiscript — SKIBIDI SCRIPT WEB/.test(ix), true);
t("index: liên kết feed + opensearch + canonical", [/rel="alternate" type="application\/atom\+xml"/.test(ix), /rel="search" type="application\/opensearchdescription\+xml"/.test(ix), /rel="canonical" href="https:\/\/skibidiscript\.vercel\.app\/"/.test(ix)], [true, true, true]);
const ld = JSON.parse(ix.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)[1]), site = ld["@graph"].find(x => x["@type"] === "WebSite"), org = ld["@graph"].find(x => x["@type"] === "Organization");
t("JSON-LD: alternateName chứa skibidiscript", [site.alternateName.includes("skibidiscript"), org.alternateName.includes("skibidiscript")], [true, true]);
t("JSON-LD: SearchAction trỏ /search", JSON.stringify(site).includes("/search?q={search_term_string}"), true);
t("noscript: có nội dung thương hiệu + liên kết", /<noscript>[\s\S]*skibidiscript[\s\S]*href="\/skibidiscript"[\s\S]*<\/noscript>/.test(ix), true);
console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
