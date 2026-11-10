import { t, onLangChange, getLang } from "./i18n.js";
/* SEO cho từng trang: tiêu đề, mô tả, canonical, Open Graph, chặn lập chỉ mục trang riêng tư. */
export const SITE = "https://skibidiscript.vercel.app";
export const NAME = "SKIBIDI SCRIPT WEB";
export const DEFAULT_TITLE = "skibidiscript — " + NAME + ": Nơi chia sẻ APK tiện ích, bảo mật cao";
export const DEFAULT_DESC = "Website tiện ích chia sẻ gói APK bảo mật cao: nội dung kiểm duyệt trước khi đăng, cảnh báo rõ phần mềm bên thứ ba. Không cổ xúy hack.";
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
function meta(sel, attr, val) {
  const el = document.head.querySelector(sel); if (!el) return;
  el.setAttribute(attr, val);
}
export const LOGO = SITE + "/assets/img/icon-512.png";
/* Dữ liệu có cấu trúc riêng cho từng trang: loại trang, đường dẫn breadcrumb, logo/nhà xuất bản. Trang riêng tư thì không có. */
function structured(o, url, full, d) {
  let el = document.getElementById("ld-page");
  if (o.noindex || !o.title) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("script"); el.id = "ld-page"; el.type = "application/ld+json"; document.head.appendChild(el); }
  const trail = [{ name: NAME, item: SITE + "/" }].concat((o.crumbs || []).map(c => ({ name: t(c.label), item: c.href ? SITE + c.href : null })), [{ name: t(o.title), item: url }]);
  const g = [{ "@type": o.ld || "WebPage", "@id": url + "#page", url, name: full, description: d, inLanguage: getLang() === "vi" ? "vi" : "en", isPartOf: { "@id": SITE + "/#site" }, publisher: { "@id": SITE + "/#org" }, primaryImageOfPage: { "@type": "ImageObject", url: SITE + "/assets/img/og.png", width: 1200, height: 630 } },
    { "@type": "BreadcrumbList", itemListElement: trail.map((c, i) => Object.assign({ "@type": "ListItem", position: i + 1, name: c.name }, c.item ? { item: c.item } : {})) }];
  if (o.faq && o.faq.length) g.push({ "@type": "FAQPage", "@id": url + "#faq", mainEntity: o.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  if (o.extra) g.push(o.extra);
  el.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": g });
}
let last = {};
export function applySeo(o = {}) {
  last = o; const { title, desc, path, noindex } = o;
  const full = title ? t(title) + " · " + NAME + " (skibidiscript)" : t(DEFAULT_TITLE);
  const d = cut(t(desc || DEFAULT_DESC), 160);
  const url = SITE + (path && path !== "/" ? path.replace(/\/$/, "") : "/");
  document.title = full;
  meta('meta[name="description"]', "content", d);
  meta('link[rel="canonical"]', "href", url);
  meta('meta[name="robots"]', "content", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
  meta('meta[property="og:title"]', "content", full); meta('meta[name="twitter:title"]', "content", full);
  meta('meta[property="og:description"]', "content", d); meta('meta[name="twitter:description"]', "content", d);
  meta('meta[property="og:url"]', "content", url);
  structured(o, url, full, d);
}

onLangChange(() => applySeo(last));
