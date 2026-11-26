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
for (const p of ["/skibidiscript", "/about", "/privacy", "/guide", "/security", "/terms"]) t("sitemap có " + p, sm.b.includes("<loc>https://skibidiscript.vercel.app" + p + "</loc>"), true);
t("sitemap: ảnh logo + schema ảnh", /image:loc>https:\/\/skibidiscript.vercel.app\/icons\/icon-512.png/.test(sm.b) && /xmlns:image=/.test(sm.b), true);

const os = txt("opensearch.xml"); t("OpenSearch: mẫu tìm kiếm", /template="https:\/\/skibidiscript\.vercel\.app\/search\?q=\{searchTerms\}"/.test(os) && /<ShortName>Skibidi Web<\/ShortName>/.test(os), true);
const vj = JSON.parse(txt("vercel.json")), rw = vj.rewrites;
t("vercel: /feed.xml → /api/feed (trước catch-all)", rw.findIndex(r => r.source === "/feed.xml" && r.destination === "/api/feed") < rw.length - 1 && rw.findIndex(r => r.source === "/feed.xml") >= 0, true);
const catchAll = new RegExp("^" + rw[rw.length - 1].source + "$");
for (const [p, shouldServe] of [["/opensearch.xml", false], ["/robots.txt", false], ["/favicon.ico", false], ["/logo.svg", false], ["/icons/icon-192.png", false], ["/.well-known/security.txt", false], ["/skibidiscript", true], ["/about", true], ["/scripts/abc", true]]) t("vercel catch-all: " + p, catchAll.test(p), shouldServe);
const robots = txt("robots.txt"); t("robots: sitemap + chặn trang riêng tư, không chặn /help", [/Sitemap: https:\/\/skibidiscript.vercel.app\/sitemap.xml/.test(robots), /Disallow: \/help\/\n/.test(robots), /Disallow: \/help\n/.test(robots), /Disallow: \/two-step/.test(robots)], [true, true, false, true]);
const mf = JSON.parse(txt("manifest.webmanifest")); t("manifest: id + shortcuts hợp lệ", [mf.id, mf.shortcuts.length >= 3, mf.shortcuts.every(s => s.url.startsWith("/") && s.name)], ["/", true, true]);
const LG = require("../api/logo.js");
t("manifest: mọi icon do api/logo.js vẽ ra (không có tệp ảnh)", mf.icons.every(i => /^\/icons\/[a-z0-9.-]+$/.test(i.src) && LG.names.includes(i.src.slice(7))), true);
const sec = txt(".well-known/security.txt"); t("security.txt: Contact + Expires tương lai", [/^Contact: https:\/\//m.test(sec), new Date((sec.match(/^Expires: (.+)$/m) || [])[1]) > new Date()], [true, true]);
/* ── Logo vẽ bằng code: không còn tệp ảnh nào, mọi đường dẫn logo đi qua api/logo.js ── */
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === "node_modules" || e.name === ".git" ? [] : e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
const imgs = walk(new URL("..", import.meta.url).pathname).filter(f => /\.(png|jpe?g|gif|webp|ico|bmp|avif)$/i.test(f) && !/\/tests\//.test(f));
t("repo: không còn tệp logo/ảnh nào (png, jpg, ico, …)", imgs, []);
t("repo: không còn thư mục assets/img", fs.existsSync(R("assets/img")), false);
const srcAll = walk(new URL("..", import.meta.url).pathname).filter(f => /\.(js|html|css|json|xml|webmanifest|md)$/.test(f) && !/\/tests\//.test(f) && !/HUONG-DAN/.test(f));
t("mã nguồn: không còn đường dẫn /assets/img/ hay logo.png", srcAll.filter(f => /assets\/img\/|logo\.png/.test(fs.readFileSync(f, "utf8"))), []);
const lres = n => { const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { this.b = b; } }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); LG({ query: { n }, url: "/api/logo?n=" + n }, res); return res; };
const pngInfo = b => ({ sig: b.subarray(0, 8).toString("hex"), w: b.readUInt32BE(16), h: b.readUInt32BE(20) });
for (const [n, w, h] of [["icon-48.png", 48, 48], ["icon-96.png", 96, 96], ["icon-192.png", 192, 192], ["icon-512.png", 512, 512], ["icon-maskable-512.png", 512, 512], ["apple-touch-icon.png", 180, 180], ["og.png", 1200, 630]]) { const r = lres(n); t("logo " + n + ": PNG " + w + "×" + h + ", 200, cache dài", [r.statusCode, r.h["Content-Type"], pngInfo(r.b), /s-maxage=\d{6,}/.test(r.h["Cache-Control"])], [200, "image/png", { sig: "89504e470d0a1a0a", w, h }, true]); }
{ const r = lres("favicon.ico"); t("favicon.ico là ICO (3 kích thước, PNG bên trong)", [r.b.subarray(0, 4).toString("hex"), r.b.readUInt16LE(4), r.b.subarray(r.b.readUInt32LE(18), r.b.readUInt32LE(18) + 4).toString("hex"), r.h["Content-Type"]], ["00000100", 3, "89504e47", "image/x-icon"]); }
{ const r = lres("logo.svg"); t("logo.svg: SVG có chữ S, không có <script>", [r.h["Content-Type"].startsWith("image/svg+xml"), /<svg[^>]+viewBox="0 0 100 100"/.test(String(r.b)), /<path d="M67 34/.test(String(r.b)), /script|onload/i.test(String(r.b))], [true, true, true, false]); }
t("logo: tên lạ / thử thoát thư mục → 404", ["nope.png", "../package.json", "x/../../etc/passwd", ""].map(n => lres(n).statusCode), [404, 404, 404, 404]);
{ const zlib = require("zlib"), b = lres("icon-512.png").b; let o = 8, idat = []; while (o < b.length) { const L = b.readUInt32BE(o), ty = b.subarray(o + 4, o + 8).toString(); if (ty === "IDAT") idat.push(b.subarray(o + 8, o + 8 + L)); o += 12 + L; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), row = 512 * 4 + 1, px = (x, y) => [...raw.subarray(y * row + 1 + x * 4, y * row + 1 + x * 4 + 4)];
  t("logo 512: góc trong suốt (bo góc), tâm tối (nét chữ S), nền ô sáng", [px(0, 0)[3], px(256, 256).slice(0, 3), px(100, 100).slice(0, 3)], [0, [10, 10, 10], [250, 250, 250]]); }
t("vercel: /logo.svg, /favicon.ico, /icons/* → /api/logo, đặt trước catch-all", ["/logo.svg", "/favicon.ico", "/icons/:x"].map(s => { const i = rw.findIndex(r => r.destination.startsWith("/api/logo") && (r.source === s || (s === "/icons/:x" && /^\/icons\//.test(r.source)))); return i >= 0 && i < rw.length - 1; }), [true, true, true]);

/* ── Cửa hàng: trang sản phẩm có SEO riêng, ví/đơn hàng không lập chỉ mục ── */
const pageRun = async (p, db) => { const old = globalThis.fetch; globalThis.fetch = async u => ({ ok: true, json: async () => db(String(u)) }); const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { this.b = b; } }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); try { await require("../api/page.js")({ query: { p }, url: "/api/page?p=" + p, headers: {} }, res); } finally { globalThis.fetch = old; } return res; };
const prod = u => u.includes("nox_shop/items/sp1") ? { name: "Key VIP <30 ngày>", desc: "Giao tự động", price: 59000, stock: 3, active: true } : u.includes("nox_shop/items/off") ? { name: "Ẩn", price: 1, active: false } : null;
const pg = await pageRun("/shop/sp1", prod);
t("shop: trang sản phẩm 200 + Product/Offer VND", [pg.statusCode, /"@type":"Product"/.test(pg.b), /"priceCurrency":"VND"/.test(pg.b), /"price":"59000"/.test(pg.b), /schema.org\/InStock/.test(pg.b)], [200, true, true, true, true]);
t("shop: escape HTML tên sản phẩm", /Key VIP &lt;30/.test(pg.b) && !/Key VIP <30/.test(pg.b), true);
t("shop: canonical /shop/sp1 + cho lập chỉ mục", /rel="canonical" href="https:\/\/skibidiscript.vercel.app\/shop\/sp1"/.test(pg.b) && /index,follow/.test(pg.b), true);
t("shop: sản phẩm ẩn / không có → 404", [(await pageRun("/shop/off", prod)).statusCode, (await pageRun("/shop/zzz", prod)).statusCode], [404, 404]);
const legacy = await pageRun("/c/mod/old1", u => u.includes("nox_categories") ? { c1: { name: "Mod", node: "mod" } } : u.includes("nox_data/mod/old1") ? { title: "Bài cũ dùng title", description: "Mô tả cũ", script: "x" } : null);
t("dữ liệu cũ (title/description): trang vẫn 200, lập chỉ mục, không noindex", [legacy.statusCode, /index,follow/.test(legacy.b), /noindex/.test(legacy.b), legacy.h["X-Robots-Tag"] || null, /Bài cũ dùng title/.test(legacy.b)], [200, true, false, null, true]);
{ const old = globalThis.fetch; globalThis.fetch = async () => { throw new Error("net"); }; let pe; try { pe = await pageRun("/shop/sp1", () => null); } finally { globalThis.fetch = old; }
  const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { this.b = b; } }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); globalThis.fetch = async () => { throw new Error("net"); }; try { await require("../api/page.js")({ query: { p: "/shop/sp1" }, url: "/api/page?p=/shop/sp1", headers: {} }, res); } finally { globalThis.fetch = old; }
  t("Firebase lỗi mạng: trả 503 + Retry-After, KHÔNG gắn noindex/404, không cache", [res.statusCode, res.h["Retry-After"], res.h["X-Robots-Tag"] || null, res.h["Cache-Control"]], [503, "120", null, "no-store"]); }
const pw = await pageRun("/wallet", () => null); t("ví/đơn hàng: noindex", [pw.statusCode, /noindex/.test(pw.b), pw.h["X-Robots-Tag"]], [200, true, "noindex"]);
const lib = await pageRun("/library", () => null); t("/library: có tiêu đề riêng, lập chỉ mục", /<title>Content library/.test(lib.b) && /index,follow/.test(lib.b), true);
const smShop = await run("../api/sitemap.js", u => u.includes("nox_shop/items") ? { sp1: { name: "A", active: true }, off: { name: "B", active: false } } : u.includes("shallow") ? {} : {});
t("sitemap: có /library + sản phẩm đang bán, không có sản phẩm ẩn", [smShop.b.includes("/library</loc>"), smShop.b.includes("/shop/sp1</loc>"), smShop.b.includes("/shop/off")], [true, true, false]);
t("robots: chặn /wallet /orders", /Disallow: \/wallet/.test(robots) && /Disallow: \/orders/.test(robots), true);
const ix = txt("index.html");
t("index: tiêu đề có thương hiệu Skibidi Web / Skibidi Shop", /<title>Skibidi Web — Skibidi Shop/.test(ix), true);
t("index: liên kết feed + opensearch + canonical", [/rel="alternate" type="application\/atom\+xml"/.test(ix), /rel="search" type="application\/opensearchdescription\+xml"/.test(ix), /rel="canonical" href="https:\/\/skibidiscript\.vercel\.app\/"/.test(ix)], [true, true, true]);
const ld = JSON.parse(ix.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)[1]), site = ld["@graph"].find(x => x["@type"] === "WebSite"), org = ld["@graph"].find(x => x["@type"] === "Organization");
t("JSON-LD: alternateName chứa skibidiscript", [site.alternateName.includes("skibidiscript"), org.alternateName.includes("skibidiscript")], [true, true]);
t("JSON-LD: SearchAction trỏ /search", JSON.stringify(site).includes("/search?q={search_term_string}"), true);
t("noscript: có nội dung thương hiệu + liên kết", /<noscript>[\s\S]*skibidiscript[\s\S]*href="\/skibidiscript"[\s\S]*<\/noscript>/.test(ix), true);
/* ── Cửa hàng: trang chủ + trang mục lục + ảnh sản phẩm + sơ đồ trang dùng chỉ mục nox_shopseo ── */
const PNG = "data:image/png;base64," + Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").toString("base64");
const SEO = { sp1: { n: "Key VIP <30 ngày>", d: "Giao tự động", p: 59000, c: "k1", t: 2, h: 5, a: true, i: 1 }, sp2: { n: "Tài khoản", d: "", p: 10000, c: "k2", t: 1, h: 0, a: true, s: 0 }, off: { n: "Ẩn", p: 1, a: false }, bad: { p: 5 } };
const CATS = { k1: { name: "Key & Mã", sort: 1 }, k2: { name: "Tài khoản", sort: 2 }, k3: { name: "Trống", sort: 3 } };
const shopDb = u => u.includes("nox_shopseo") ? SEO : u.includes("nox_shop/cats") ? CATS : u.includes("nox_shop/items/sp1/img") ? PNG : u.includes("nox_shop/items/sp1/active") ? true : u.includes("nox_shop/items/sp1") ? { name: "Key VIP <30 ngày>", price: 59000, active: true, img: PNG } : null;
const hm = await pageRun("/shop", shopDb);
const land = await pageRun("/", shopDb);
t("trang chủ mới: 200, 1 h1, World/Chat/Group Coming Soon, Share trỏ /library, canonical /, không liệt kê sản phẩm", [land.statusCode, (land.b.match(/<h1[ >]/g) || []).length, /World — Coming Soon/.test(land.b) && /Chat — Coming Soon/.test(land.b) && /Group — Coming Soon/.test(land.b), /href="\/library">Share/.test(land.b), /rel="canonical" href="https:\/\/skibidiscript.vercel.app\/"/.test(land.b), /\/shop\/sp1/.test(land.b)], [200, 1, true, true, true, false]);
t("cửa hàng (/shop): 200, có h1 duy nhất, danh sách sản phẩm đang bán + mục lục, không có sản phẩm ẩn/thiếu tên", [hm.statusCode, (hm.b.match(/<h1[ >]/g) || []).length, /href="\/shop\/sp1"/.test(hm.b), /href="\/shop\/c\/k1"/.test(hm.b), /\/shop\/off/.test(hm.b), /\/shop\/bad/.test(hm.b), /"@type":"ItemList"/.test(hm.b)], [200, 1, true, true, false, false, true]);
t("cửa hàng: hết hàng được ghi, tên được escape", [/Tài khoản<\/a> — 10,000 VND \(out of stock\)/.test(hm.b), /Key VIP &lt;30/.test(hm.b)], [true, true]);
const hmDown = await (async () => { const old = globalThis.fetch; globalThis.fetch = async () => { throw new Error("net"); }; const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { this.b = b; } }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); try { await require("../api/page.js")({ query: { p: "/" }, url: "/" }, res); } finally { globalThis.fetch = old; } return res; })();
t("cửa hàng khi Firebase lỗi: vẫn 200 (khung trang), không noindex", [hmDown.statusCode, /noindex/.test(hmDown.b)], [200, false]);
const cp = await pageRun("/shop/c/k1", shopDb);
t("mục lục: 200 + CollectionPage + ItemList + BreadcrumbList + canonical riêng + index", [cp.statusCode, /"@type":"CollectionPage"/.test(cp.b), /"@type":"ItemList"/.test(cp.b), /"@type":"BreadcrumbList"/.test(cp.b), /rel="canonical" href="https:\/\/skibidiscript.vercel.app\/shop\/c\/k1"/.test(cp.b), /index,follow/.test(cp.b)], [200, true, true, true, true, true]);
t("mục lục: chỉ liệt kê sản phẩm của mục đó; escape &; og:image là ảnh thật", [/href="\/shop\/sp1"/.test(cp.b), /href="\/shop\/sp2"/.test(cp.b), /Key &amp; Mã/.test(cp.b), /og:image" content="https:\/\/skibidiscript.vercel.app\/img\/shop\/sp1.jpg"/.test(cp.b)], [true, false, true, true]);
t("mục lục không tồn tại / id sai → 404 noindex", [(await pageRun("/shop/c/zzz", shopDb)).statusCode, (await pageRun("/shop/c/a%20b", shopDb)).statusCode], [404, 404]);
const pimg = await pageRun("/shop/sp1", shopDb);
t("sản phẩm: JSON-LD image + og:image trỏ /img/shop/<id>.jpg, thẻ img có alt, 1 h1", [/"image":\["https:\/\/skibidiscript.vercel.app\/img\/shop\/sp1.jpg"\]/.test(pimg.b), /og:image" content="https:\/\/skibidiscript.vercel.app\/img\/shop\/sp1.jpg"/.test(pimg.b), /<img src="[^"]+" alt="Key VIP/.test(pimg.b), (pimg.b.match(/<h1[ >]/g) || []).length], [true, true, true, 1]);
/* kiểm tra cơ bản cho mọi loại trang công khai: tiêu đề, mô tả, canonical tuyệt đối khớp địa chỉ, og:*, JSON-LD hợp lệ */
for (const [p, canon] of [["/", "https://skibidiscript.vercel.app/"], ["/shop/c/k1", "https://skibidiscript.vercel.app/shop/c/k1"], ["/shop/sp1", "https://skibidiscript.vercel.app/shop/sp1"], ["/library", "https://skibidiscript.vercel.app/library"]]) {
  const r = await pageRun(p, shopDb), g = re => (r.b.match(re) || [])[1] || "";
  const title = g(/<title>([^<]*)<\/title>/), desc = g(/<meta name="description" content="([^"]*)">/), lds = [...r.b.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/gs)].map(m => { try { return JSON.parse(m[1]); } catch (_) { return null; } });
  t("SEO cơ bản " + p, [title.length >= 15 && title.length <= 75, desc.length >= 50 && desc.length <= 170, g(/<link rel="canonical" href="([^"]*)">/), g(/og:url" content="([^"]*)"/), /^https:\/\//.test(g(/og:image" content="([^"]*)"/)), lds.every(Boolean)], [true, true, canon, canon, true, true]);
}
const img = async (id, db) => { const old = globalThis.fetch; globalThis.fetch = async u => ({ ok: true, status: 200, json: async () => db(String(u)) }); const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { this.b = b; } }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); try { await require("../api/img.js")({ query: { id } }, res); } finally { globalThis.fetch = old; } return res; };
const im1 = await img("sp1", shopDb);
t("ảnh sản phẩm: 200, đúng Content-Type, nhị phân, cache dài", [im1.statusCode, im1.h["Content-Type"], Buffer.isBuffer(im1.b) && im1.b.length === 16, /s-maxage=86400/.test(im1.h["Cache-Control"])], [200, "image/png", true, true]);
t("ảnh sản phẩm: id sai / sản phẩm ẩn / không có ảnh → 404", [(await img("../x", shopDb)).statusCode, (await img("sp1", u => u.includes("/active") ? false : PNG)).statusCode, (await img("sp9", () => null)).statusCode], [404, 404, 404]);
t("ảnh sản phẩm: Firebase lỗi → 503 (không lưu cache)", (await (async () => { const old = globalThis.fetch; globalThis.fetch = async () => { throw new Error("net"); }; const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end() {} }; Object.defineProperty(res, "statusCode", { value: 0, writable: true }); try { await require("../api/img.js")({ query: { id: "sp1" } }, res); } finally { globalThis.fetch = old; } return [res.statusCode, res.h["Cache-Control"]]; })()), [503, "no-store"]);
const sm2 = await run("../api/sitemap.js", u => u.includes("nox_shopseo") ? SEO : u.includes("nox_shop/cats") ? CATS : u.includes("shallow") ? {} : {});
t("sitemap: dùng chỉ mục nhẹ — có sản phẩm đang bán + mục lục có hàng + ảnh, không có ẩn/trống", [sm2.b.includes("/shop/sp1</loc>"), sm2.b.includes("/shop/c/k1</loc>"), sm2.b.includes("/shop/c/k3"), sm2.b.includes("/shop/off"), sm2.b.includes("/img/shop/sp1.jpg")], [true, true, false, false, true]);
t("vercel.json: /shop là trang cửa hàng (không còn chuyển hướng về /) và /img/ không bị rewrite vào page", [!JSON.parse(txt("vercel.json")).redirects.some(r => r.source === "/shop"), JSON.parse(txt("vercel.json")).rewrites.some(r => r.source.includes("img/shop") && r.destination.startsWith("/api/img")), /img\\\//.test(JSON.parse(txt("vercel.json")).rewrites.at(-1).source) || /img\//.test(JSON.parse(txt("vercel.json")).rewrites.at(-1).source)], [true, true, true]);
t("robots: cho phép /img/ và sitemap", [/Allow: \/img\//.test(robots), /Sitemap: https:\/\/skibidiscript.vercel.app\/sitemap.xml/.test(robots)], [true, true]);

const en = (await import("../assets/js/lib/i18n-en.js")).default;
t("i18n: mẫu có nhóm bắt phải chèn lại $n trong bản dịch (không mất số tiền/tên)", en.P.filter(([rx, rep]) => { const n = (rx.source.match(/\((?!\?)/g) || []).length - (rx.source.match(/\\\(/g) || []).length; return n > 0 && !/\$\d/.test(rep); }).map(x => x[0].source), []);
console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
