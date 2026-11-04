/* Bảng route duy nhất. Route tĩnh luôn khai báo TRƯỚC route có :tham-số để không bị che. */
import { define } from "./lib/router.js";
const L = p => () => import("./pages/" + p + ".js");
export const BASE_PATHS = [["scripts", "script"], ["apk", "apk"], ["ios", "ios"], ["links", "link"]];
export const notFoundDef = { load: L("misc"), fn: "notFound", title: "Không tìm thấy trang", guard: "public" };
/* needs = dữ liệu Firebase phải tải xong thì trang mới hiện (xem store.waitFor) */
const ALL = ["cats", "data:*"];
const catNeeds = extra => p => extra.catId ? ["data:" + extra.catId] : ["cats", "data:" + String(p.node || "").toLowerCase()];

export function registerRoutes() {
  define("/", { load: L("home"), guard: "public", needs: ALL });
  define("/login", { load: L("auth"), fn: "login", guard: "guest", title: "Đăng nhập" });
  define("/register", { load: L("auth"), fn: "register", guard: "guest", title: "Đăng ký" });
  define("/forgot-password", { load: L("auth"), fn: "forgot", guard: "guest", title: "Quên mật khẩu" });
  define("/search", { load: L("misc"), fn: "search", guard: "public", title: "Tìm kiếm", needs: ALL });
  define("/categories", { load: L("misc"), fn: "categories", guard: "public", title: "Danh mục", needs: ALL });
  define("/notifications", { load: L("misc"), fn: "notifications", guard: "public", title: "Thông báo", needs: ["notice"] });
  define("/settings", { load: L("misc"), fn: "settings", guard: "public", title: "Cài đặt", needs: ["theme"] });
  define("/profile", { load: L("profile"), fn: "index", guard: "auth", title: "Hồ sơ tài khoản" });
  define("/404", notFoundDef);

  const family = (prefix, extra) => {
    const needs = catNeeds(extra);
    define(prefix, { load: L("category"), fn: "list", guard: "public", needs, ...extra });
    define(prefix + "/create", { load: L("category"), fn: "form", guard: "dev", mode: "create", needs, ...extra });
    define(prefix + "/:id", { load: L("category"), fn: "detail", guard: "public", needs, ...extra });
    define(prefix + "/:id/edit", { load: L("category"), fn: "form", guard: "dev", mode: "edit", needs, ...extra });
  };
  BASE_PATHS.forEach(([seg, catId]) => family("/" + seg, { catId }));
  family("/c/:node", { custom: true });

  define("/dev", { load: L("dev"), fn: "index", guard: "dev", title: "Dev Panel", needs: [...ALL, "users", "maint"] });
  define("/dev/data", { load: L("dev"), fn: "data", guard: "dev", title: "Quản lý dữ liệu", needs: ALL });
  BASE_PATHS.forEach(([seg, catId]) => define("/dev/data/" + seg, { load: L("dev"), fn: "dataCat", guard: "dev", catId, needs: catNeeds({ catId }) }));
  define("/dev/data/c/:node", { load: L("dev"), fn: "dataCat", guard: "dev", custom: true, needs: catNeeds({ custom: true }) });
  define("/dev/categories", { load: L("dev"), fn: "categories", guard: "dev", title: "Danh mục", needs: ["cats"] });
  define("/dev/users", { load: L("dev"), fn: "users", guard: "dev", title: "Quản lý người dùng", needs: ["users"] });
  define("/dev/theme", { load: L("dev"), fn: "theme", guard: "dev", title: "Quản lý giao diện", needs: ["theme"] });
  define("/dev/system", { load: L("dev"), fn: "system", guard: "dev", title: "Hệ thống", needs: ["maint", "notice"] });
}
