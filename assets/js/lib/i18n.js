/* Ngôn ngữ giao diện: English (mặc định) và Tiếng Việt (chữ gốc viết sẵn trong mã).
   Khi chọn English, từ điển (i18n-en.js) được nạp và mọi chữ trên trang được dịch tại chỗ — kể cả nội dung dựng sau đó
   (thông báo, hộp thoại, trang mới). Chọn lại Tiếng Việt thì khôi phục nguyên bản. Nội dung do người quản trị nhập không bị dịch. */
const K = "ssw_lang";
const ATTRS = ["placeholder", "aria-label", "title", "alt", "value"];
let dict = null, lang = "vi", mo = null; /* "vi" = chưa dịch (chữ gốc trong mã) cho tới khi initI18n chạy */
const listeners = new Set();
const textOrig = new WeakMap(), textDone = new WeakMap(), attrOrig = new WeakMap();

/* Ngôn ngữ chính của web là English; chỉ khi người dùng chủ động chọn Tiếng Việt mới dùng bản Việt */
export const getLang = () => { try { return localStorage.getItem(K) === "vi" ? "vi" : "en"; } catch (_) { return "en"; } };
export const onLangChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/* Dịch một chuỗi (giữ nguyên khoảng trắng đầu/cuối). Tiếng Việt → trả nguyên. */
/* Dịch một chuỗi đã chuẩn hoá khoảng trắng; trả về undefined nếu không có bản dịch */
function tr(key) {
  let out = dict.D[key];
  if (out === undefined) {
    for (const [re, rep] of dict.P) { const r = re.exec(key); if (r) { out = rep.replace(/\$(\d)/g, (_, i) => { const c = r[+i]; if (c === undefined) return ""; const x = c.length < key.length ? tr(c.replace(/\s+/g, " ").trim()) : undefined; return x === undefined ? c : x; }); break; } }
    if (out !== undefined) for (const [re, rep] of dict.S || []) out = out.replace(re, rep);
  }
  return out;
}
export function t(s) {
  if (lang !== "en" || !dict || s == null) return s;
  const str = String(s), m = str.match(/^(\s*)([\s\S]*?)(\s*)$/); if (!m[2]) return str;
  const out = tr(m[2].replace(/\s+/g, " "));
  return out === undefined ? str : m[1] + out + m[3];
}

const skip = n => { for (let e = n.nodeType === 1 ? n : n.parentElement; e; e = e.parentElement) { const tg = e.tagName; if (tg === "SCRIPT" || tg === "STYLE" || tg === "NOSCRIPT" || tg === "CODE" || tg === "PRE" || e.getAttribute("translate") === "no") return true; } return false; };
function doText(n) {
  const v = n.nodeValue; if (textDone.get(n) === v || !/\S/.test(v) || skip(n)) return;
  const o = t(v); if (o !== v) { textOrig.set(n, v); n.nodeValue = o; textDone.set(n, o); }
}
function doAttrs(el) {
  if (skip(el)) return;
  for (const a of ATTRS) {
    if (!el.hasAttribute(a) || (a === "value" && !(el.tagName === "INPUT" && /^(submit|button)$/.test(el.type)))) continue;
    const v = el.getAttribute(a), rec = attrOrig.get(el) || {};
    if (rec[a] && rec[a][1] === v) continue;
    const o = t(v); if (o !== v) { rec[a] = [v, o]; attrOrig.set(el, rec); el.setAttribute(a, o); }
  }
}
function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  if (skip(root)) return;
  doAttrs(root);
  const w = document.createTreeWalker(root, 5, { acceptNode: n => n.nodeType === 1 && (n.tagName === "SCRIPT" || n.tagName === "STYLE" || n.getAttribute("translate") === "no") ? 2 : 1 });
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? doText(n) : doAttrs(n);
}
function restore(root) {
  const w = document.createTreeWalker(root, 5);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) { if (textOrig.has(n) && textDone.get(n) === n.nodeValue) n.nodeValue = textOrig.get(n); textOrig.delete(n); textDone.delete(n); }
    else { const rec = attrOrig.get(n); if (rec) { for (const a in rec) if (n.getAttribute(a) === rec[a][1]) n.setAttribute(a, rec[a][0]); attrOrig.delete(n); } }
  }
}
function observe() {
  if (mo) return;
  mo = new MutationObserver(recs => {
    for (const r of recs) {
      if (r.type === "childList") r.addedNodes.forEach(walk);
      else if (r.type === "characterData") doText(r.target);
      else if (r.type === "attributes") doAttrs(r.target);
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
async function load() { if (!dict) dict = (await import("./i18n-en.js")).default; }

export async function setLang(l, save = true) {
  l = l === "en" ? "en" : "vi";
  if (save) try { localStorage.setItem(K, l); } catch (_) {}
  if (l === "en") { await load(); lang = "en"; document.documentElement.lang = "en"; walk(document.body); walk(document.querySelector("head > title") || document.body); observe(); }
  else { lang = "vi"; document.documentElement.lang = "vi"; if (mo) { mo.disconnect(); mo = null; } restore(document.body); }
  listeners.forEach(f => { try { f(lang); } catch (_) {} });
}
export async function initI18n() { if (getLang() === "en") await setLang("en", false); }
export const currentLang = () => lang;
