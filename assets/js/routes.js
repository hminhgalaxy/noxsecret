/* Bảng route duy nhất. Route tĩnh luôn khai báo TRƯỚC route có :tham-số để không bị che. */
import { define } from "./lib/router.js";
const L = p => () => import("./pages/" + p + ".js");
export const BASE_PATHS = [["scripts", "script"], ["apk", "apk"], ["ios", "ios"], ["links", "link"]];
export const notFoundDef = { load: L("misc"), fn: "notFound", title: "Không tìm thấy trang", guard: "public" };

export function registerRoutes() {
  define("/", { load: L("home"), guard: "public" });
  define("/login", { load: L("auth"), fn: "login", guard: "guest", title: "Đăng nhập" });
  define("/register", { load: L("auth"), fn: "register", guard: "guest", title: "Đăng ký" });
  define("/forgot-password", { load: L("auth"), fn: "forgot", guard: "guest", title: "Quên mật khẩu" });
  define("/search", { load: L("misc"), fn: "search", guard: "public", title: "Tìm kiếm" });
  define("/categories", { load: L("misc"), fn: "categories", guard: "public", title: "Danh mục" });
  define("/notifications", { load: L("misc"), fn: "notifications", guard: "public", title: "Thông báo" });
  define("/settings", { load: L("misc"), fn: "settings", guard: "public", title: "Cài đặt" });
  define("/bypass", { load: L("misc"), fn: "bypass", guard: "dev", title: "Bypass" });
  define("/404", notFoundDef);

  const family = (prefix, extra) => {
    define(prefix, { load: L("category"), fn: "list", guard: "public", ...extra });
    define(prefix + "/create", { load: L("category"), fn: "form", guard: "dev", mode: "create", ...extra });
    define(prefix + "/:id", { load: L("category"), fn: "detail", guard: "public", ...extra });
    define(prefix + "/:id/edit", { load: L("category"), fn: "form", guard: "dev", mode: "edit", ...extra });
  };
  BASE_PATHS.forEach(([seg, catId]) => family("/" + seg, { catId }));
  family("/c/:node", { custom: true });

  define("/dev", { load: L("dev"), fn: "index", guard: "dev", title: "Dev Panel" });
  define("/dev/data", { load: L("dev"), fn: "data", guard: "dev", title: "Quản lý dữ liệu" });
  BASE_PATHS.forEach(([seg, catId]) => define("/dev/data/" + seg, { load: L("dev"), fn: "dataCat", guard: "dev", catId }));
  define("/dev/data/c/:node", { load: L("dev"), fn: "dataCat", guard: "dev", custom: true });
  define("/dev/categories", { load: L("dev"), fn: "categories", guard: "dev", title: "Danh mục" });
  define("/dev/users", { load: L("dev"), fn: "users", guard: "dev", title: "Quản lý người dùng" });
  define("/dev/theme", { load: L("dev"), fn: "theme", guard: "dev", title: "Quản lý giao diện" });
  define("/dev/system", { load: L("dev"), fn: "system", guard: "dev", title: "Hệ thống" });
}
