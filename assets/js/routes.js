/* Bảng route duy nhất. Route tĩnh luôn khai báo TRƯỚC route có :tham-số để không bị che. */
import { define } from "./lib/router.js";
const L = p => () => import("./pages/" + p + ".js");
export const BASE_PATHS = [["scripts", "script"], ["apk", "apk"], ["ios", "ios"], ["links", "link"]];
export const notFoundDef = { load: L("notfound"), title: "Không tìm thấy trang", guard: "public", noindex: true };
/* needs = dữ liệu phải về đủ thì trang mới hiện (xem store.waitFor) */
const ALL = ["cats", "data:*"];
const catNeeds = extra => p => extra.catId ? ["data:" + extra.catId] : ["cats", "data:" + String(p.node || "").toLowerCase()];

export function registerRoutes() {
  define("/", { load: L("home"), guard: "public", needs: ALL });
  define("/login", { load: L("auth/login"), guard: "guest", title: "Đăng nhập", desc: "Đăng nhập để dùng đầy đủ tính năng của SKIBIDI SCRIPT WEB." });
  define("/register", { load: L("auth/register"), guard: "guest", title: "Đăng ký", desc: "Tạo tài khoản miễn phí trên SKIBIDI SCRIPT WEB." });
  define("/forgot-password", { load: L("auth/forgot"), guard: "guest", title: "Quên mật khẩu", desc: "Đặt lại mật khẩu tài khoản của bạn." });
  define("/profile", { load: L("profile"), guard: "auth", title: "Hồ sơ", needs: [] });
  define("/search", { load: L("search"), guard: "public", title: "Tìm kiếm", noindex: true, needs: ALL });
  define("/categories", { load: L("categories"), guard: "public", title: "Danh mục", desc: "Tất cả danh mục Script, APK, iOS và liên kết hữu ích trên SKIBIDI SCRIPT WEB.", needs: ALL });
  define("/notifications", { load: L("notifications"), guard: "public", title: "Thông báo", desc: "Thông báo mới nhất từ SKIBIDI SCRIPT WEB.", needs: ["notice"] });
  define("/settings", { load: L("settings"), guard: "public", title: "Cài đặt", noindex: true, needs: ["theme"] });
  define("/404", notFoundDef);

  const family = (prefix, extra) => {
    const needs = catNeeds(extra);
    define(prefix, { load: L("items/list"), guard: "public", needs, ...extra });
    define(prefix + "/create", { load: L("items/form"), guard: "dev", mode: "create", needs, ...extra });
    define(prefix + "/:id", { load: L("items/detail"), guard: "public", needs, ...extra });
    define(prefix + "/:id/edit", { load: L("items/form"), guard: "dev", mode: "edit", needs, ...extra });
  };
  BASE_PATHS.forEach(([seg, catId]) => family("/" + seg, { catId }));
  family("/c/:node", { custom: true });

  define("/dev", { load: L("dev/index"), guard: "dev", title: "Dev Panel", needs: [...ALL, "users", "maint"] });
  define("/dev/data", { load: L("dev/data"), guard: "dev", title: "Quản lý dữ liệu", needs: ALL });
  BASE_PATHS.forEach(([seg, catId]) => define("/dev/data/" + seg, { load: L("dev/records"), guard: "dev", catId, needs: catNeeds({ catId }) }));
  define("/dev/data/c/:node", { load: L("dev/records"), guard: "dev", custom: true, needs: catNeeds({ custom: true }) });
  define("/dev/categories", { load: L("dev/categories"), guard: "dev", title: "Danh mục", needs: ["cats"] });
  define("/dev/users", { load: L("dev/users"), guard: "dev", title: "Người dùng", needs: ["users"] });
  define("/dev/theme", { load: L("dev/theme"), guard: "dev", title: "Giao diện", needs: ["theme"] });
  define("/dev/system", { load: L("dev/system"), guard: "dev", title: "Bảo trì & thông báo", needs: ["maint", "notice"] });
}
