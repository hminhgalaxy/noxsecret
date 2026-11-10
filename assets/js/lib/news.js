/* Khối "cập nhật" dùng chung (trang chủ + trang Thông báo): một bài = tiêu đề, ngày, nội dung hoặc danh sách ý. */
import { clampText } from "./collapse.js";
import { esc, fmtDate } from "./util.js";
import { isNew } from "./updates.js";
import { UPD_TAGS } from "./store.js";

/* Nội dung bài DEV: dòng bắt đầu bằng -, • hoặc * thành danh sách; các dòng còn lại thành đoạn văn. */
export function bodyHTML(text) {
  const out = []; let ul = [];
  const flush = () => { if (ul.length) { out.push(`<ul>${ul.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`); ul = []; } };
  String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => { const m = l.match(/^[-•*]\s+(.+)$/); if (m) ul.push(m[1]); else { flush(); out.push(`<p>${esc(l)}</p>`); } });
  flush(); return out.join("");
}

export const updHTML = (e, i = 0, { fresh = isNew(e) } = {}) => {
  const body = e.items && e.items.length ? `<ul>${e.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : e.body ? bodyHTML(e.body) : "";
  const nt = e.src === "dev" ? ` translate="no"` : ""; /* bài do DEV viết: giữ nguyên, không dịch */
  return `<article class="upd${fresh ? " new" : ""}" style="--d:${Math.min(i, 8) * 60}ms">
    <div class="upd-top">${fresh ? `<span class="badge strong">Mới</span>` : ""}${e.tag && UPD_TAGS[e.tag] ? `<span class="badge tag-${esc(e.tag)}">${esc(UPD_TAGS[e.tag])}</span>` : ""}<time datetime="${new Date(e.ts).toISOString().slice(0, 10)}">${esc(fmtDate(e.ts))}</time></div>
    <div${nt}><h3>${esc(e.title)}</h3>${body}</div></article>`;
};
/* Bài cập nhật dài: thu gọn danh sách/đoạn, có nút "Hiển thị tất cả" */
export const clampUpdates = root => { if (!root) return; root.querySelectorAll(".upd ul, .upd p").forEach(el => clampText(el, 5)); };
