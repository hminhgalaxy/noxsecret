/* Khối "cập nhật" dùng chung (trang chủ + trang Thông báo): một bài = tiêu đề, ngày, nội dung hoặc danh sách ý. */
import { esc, fmtDate } from "./util.js";
import { isNew } from "./updates.js";

export const updHTML = (e, i = 0, { fresh = isNew(e) } = {}) => {
  const body = e.items && e.items.length ? `<ul>${e.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : e.body ? `<p>${esc(e.body)}</p>` : "";
  const nt = e.src === "dev" ? ` translate="no"` : ""; /* bài do DEV viết: giữ nguyên, không dịch */
  return `<article class="upd${fresh ? " new" : ""}" style="--d:${Math.min(i, 8) * 60}ms">
    <div class="upd-top">${fresh ? `<span class="badge strong">Mới</span>` : ""}<time datetime="${new Date(e.ts).toISOString().slice(0, 10)}">${esc(fmtDate(e.ts))}</time></div>
    <div${nt}><h3>${esc(e.title)}</h3>${body}</div></article>`;
};
