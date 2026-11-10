/* Phần dùng chung của các trang danh sách / chi tiết / thêm-sửa nội dung. */
import { esc } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";

export async function resolveCat(ctx) {
  if (ctx.def.catId) return S.catById(ctx.def.catId);
  await Promise.race([S.catsReady, new Promise(r => setTimeout(r, 6000))]);
  return S.catByNode(String(ctx.params.node || "").toLowerCase());
}
export function notFound(ctx, what) {
  ctx.setPage({ title: "Không tìm thấy", crumbs: [], noindex: true });
  ctx.el.innerHTML = `<div class="statebox">${ICO.warn}<p>${esc(what)}</p><a class="btn ghost" href="/">Về trang chủ</a></div>`;
}
export const crumbsFor = cat => [{ label: "Danh mục", href: "/categories" }];
/* Đã nhận dữ liệu mới nhất từ máy chủ (không chỉ bản lưu tạm)? */
export const settled = cat => !!S.store.live[cat.id] || S.store.status[cat.id] === "error";
export const missingHTML = (base, label) => `<div class="statebox">${ICO.warn}<p>Mục này không tồn tại hoặc đã bị xóa.</p><a class="btn ghost" href="${base}">${ICO.back}Quay lại ${esc(label)}</a></div>`;

export function fieldsFor(cat) {
  const f = [{ k: "name", label: "Tên", req: true, ph: "Tên hiển thị" }, { k: "desc", label: "Mô tả", area: true, rows: 3 }];
  const need = cat.need || "any";
  if (need === "code") f.push({ k: "code", label: "Code", req: true, area: true, rows: 12, mono: true });
  else if (need === "url") f.push({ k: "url", label: "Link", req: true, type: "url", ph: "https://…" });
  else { f.push({ k: "url", label: "Link", type: "url", ph: "https://…" }); f.push({ k: "code", label: "Code", area: true, rows: 10, mono: true }); }
  f.push({ k: "img", label: "Ảnh minh họa (chọn từ máy, không bắt buộc)", image: true });
  if (cat.id === "apk" || cat.id === "ios") f.push({ k: "vault", label: "Đánh dấu Vault", check: true });
  return f;
}
