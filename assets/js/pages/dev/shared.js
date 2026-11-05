/* Phần dùng chung của Dev Panel: kiểm tra quyền, đường dẫn, tìm danh mục. */
import * as S from "../../lib/store.js";
import { session } from "../../lib/auth.js";
import { lockedHTML } from "../../lib/ui.js";

export const devCrumb = [{ label: "Dev Panel", href: "/dev" }];
export const dataHref = c => "/dev/data/" + c.path;
/* Mỗi trang tự kiểm tra quyền (ngoài lớp chặn của bộ định tuyến). Quyền ghi thật do máy chủ quyết định. */
export function locked(ctx) {
  if (session.isDev) return false;
  ctx.setPage({ title: "Không có quyền", noindex: true });
  ctx.el.innerHTML = lockedHTML("Chỉ quản trị viên mới vào được khu vực này."); return true;
}
export async function findCat(ctx) {
  if (ctx.def.catId) return S.catById(ctx.def.catId);
  await Promise.race([S.catsReady, new Promise(r => setTimeout(r, 6000))]);
  return S.catByNode(String(ctx.params.node || "").toLowerCase());
}
