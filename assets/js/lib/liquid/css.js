/* Danh sách file CSS của Skliquid Glass. index.html (đoạn script đầu trang) có bản sao của danh sách này — tests/static.test.mjs kiểm tra hai nơi luôn khớp. */
export const LQ_CSS = ["lq-tokens", "lq-base", "lq-glass", "lq-buttons", "lq-controls", "lq-nav", "lq-popups", "lq-logo", "lq-motion", "lq-edit", "lq-cats", "lq-skias", "lq-pages", "lq-os", "lq-music", "lq-liquid"].map(n => "/assets/css/lq/" + n + ".css");
let loading = null;
/* Nạp (một lần) mọi file CSS rồi mới báo xong — để khi bật Skliquid không bị nháy giao diện nửa vời. */
export function ensureCss() {
  if (loading) return loading;
  loading = Promise.all(LQ_CSS.map(href => new Promise(res => {
    if (document.querySelector('link[href="' + href + '"]')) return res();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; l.onload = l.onerror = () => res(); document.head.appendChild(l);
  })));
  return loading;
}
