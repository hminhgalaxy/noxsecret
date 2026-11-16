/* Cookie của website: lưu tuỳ chỉnh (giao diện, kính mờ, màu nhấn, ngôn ngữ), giỏ hàng, trạng thái menu.
   Chỉ là cookie CHỨC NĂNG của chính website (không theo dõi, không quảng cáo, không gửi cho bên thứ ba).
   Cookie được ưu tiên; localStorage là bản dự phòng/đồng bộ (và giúp chuyển dữ liệu cũ sang cookie). */
const DAY = 86400;
export const PREFIX = "ssw_";
const enabled = () => { try { return !!navigator.cookieEnabled; } catch (_) { return false; } };
export function getCookie(name) {
  try { const m = document.cookie.split("; ").find(x => x.startsWith(name + "=")); return m ? decodeURIComponent(m.slice(name.length + 1)) : null; } catch (_) { return null; }
}
export function setCookie(name, value, days = 365) {
  if (!enabled()) return false;
  try {
    if (value == null) { document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax"; return true; }
    const v = encodeURIComponent(String(value)); if (v.length > 3500) return false; /* giới hạn 4 KB mỗi cookie */
    document.cookie = name + "=" + v + "; Max-Age=" + Math.round(days * DAY) + "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
    return true;
  } catch (_) { return false; }
}
/* kvGet/kvSet: cookie trước, localStorage sau; ghi cả hai để hai nơi luôn khớp */
export function kvGet(k) {
  const c = getCookie(k); if (c != null) return c;
  let l = null; try { l = localStorage.getItem(k); } catch (_) {}
  if (l != null) setCookie(k, l); /* chuyển dữ liệu cũ sang cookie */
  return l;
}
export function kvSet(k, v) {
  setCookie(k, v == null ? null : v);
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {}
}
/* Danh sách cookie của website (để hiển thị trong Cài đặt) */
export const listCookies = () => { try { return document.cookie.split("; ").filter(x => x.startsWith(PREFIX)).map(x => { const i = x.indexOf("="); return { name: x.slice(0, i), size: x.length }; }); } catch (_) { return []; } };
export function clearSiteCookies(keepConsent = true) { listCookies().forEach(c => { if (keepConsent && c.name === "ssw_ck") return; setCookie(c.name, null); try { localStorage.removeItem(c.name); } catch (_) {} }); }
export const cookiesEnabled = enabled;
/* Thông báo cookie (hiện một lần) */
export const consentGiven = () => getCookie("ssw_ck") === "1" || (() => { try { return localStorage.getItem("ssw_ck") === "1"; } catch (_) { return false; } })();
export function giveConsent() { setCookie("ssw_ck", "1", 400); try { localStorage.setItem("ssw_ck", "1"); } catch (_) {} }
