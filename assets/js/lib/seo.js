/* SEO cho từng trang: tiêu đề, mô tả, canonical, Open Graph, chặn lập chỉ mục trang riêng tư. */
export const SITE = "https://skibidiscript.vercel.app";
export const NAME = "SKIBIDI SCRIPT WEB";
export const DEFAULT_TITLE = NAME + " — Kho Script, APK, iOS và liên kết hữu ích";
export const DEFAULT_DESC = "SKIBIDI SCRIPT WEB là nơi tập hợp Script, APK, iOS và các liên kết hữu ích. Gọn gàng, dễ tìm và được cập nhật liên tục.";
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
function meta(sel, attr, val) {
  const el = document.head.querySelector(sel); if (!el) return;
  el.setAttribute(attr, val);
}
export function applySeo({ title, desc, path, noindex } = {}) {
  const full = title ? title + " · " + NAME : DEFAULT_TITLE;
  const d = cut(desc || DEFAULT_DESC, 160);
  const url = SITE + (path && path !== "/" ? path.replace(/\/$/, "") : "/");
  document.title = full;
  meta('meta[name="description"]', "content", d);
  meta('link[rel="canonical"]', "href", url);
  meta('meta[name="robots"]', "content", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
  meta('meta[property="og:title"]', "content", full); meta('meta[name="twitter:title"]', "content", full);
  meta('meta[property="og:description"]', "content", d); meta('meta[name="twitter:description"]', "content", d);
  meta('meta[property="og:url"]', "content", url);
}
