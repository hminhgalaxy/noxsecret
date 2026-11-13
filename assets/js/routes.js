/* Bảng route duy nhất. Route tĩnh luôn khai báo TRƯỚC route có :tham-số để không bị che. */
import { define } from "./lib/router.js";
import { session } from "./lib/auth.js";
const L = p => () => import("./pages/" + p + ".js");
export const BASE_PATHS = [["scripts", "script"], ["apk", "apk"], ["ios", "ios"], ["links", "link"]];
export const notFoundDef = { load: L("notfound"), title: "Không tìm thấy trang", guard: "public", noindex: true };
/* needs = dữ liệu phải về đủ thì trang mới hiện (xem store.waitFor) */
const ALL = ["cats", "data:*"];
const catNeeds = extra => p => extra.catId ? ["data:" + extra.catId] : ["cats", "data:" + String(p.node || "").toLowerCase()];

/* Tải sẵn các trang hay dùng lúc trình duyệt rảnh, để bấm vào là mở ngay (không chờ tải mã) */
export function prefetchPages(devToo = false) {
  const go = () => ["auth/login", "auth/register", "settings", "inbox", "categories", "items/list", "items/detail", "search", "profile", "shop/home", "shop/product", "shop/wallet"].concat(devToo ? ["dev/index", "dev/updates", "dev/records", "dev/system", "dev/test"] : [])
    .forEach((p, i) => setTimeout(() => import("./pages/" + p + ".js").catch(() => {}), i * 120));
  "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 2000);
}

export function registerRoutes() {
  define("/", { load: L("shop/home"), guard: "public", needs: [] });
  define("/library", { load: L("home"), guard: "public", title: "Kho nội dung", desc: "Kho script, APK, iOS và liên kết đã được kiểm duyệt trên SKIBIDI SCRIPT WEB.", needs: [...ALL, "updates"] });
  define("/shop/:id", { load: L("shop/product"), guard: "public", needs: [] });
  define("/wallet", { load: L("shop/wallet"), guard: "real", title: "Ví của tôi", noindex: true, needs: [] });
  define("/orders", { load: L("shop/orders"), guard: "real", title: "Lịch sử mua hàng", noindex: true, needs: [] });
  define("/login", { load: L("auth/login"), guard: "guest", title: "Đăng nhập", desc: "Đăng nhập để dùng đầy đủ tính năng của SKIBIDI SCRIPT WEB." });
  define("/register", { load: L("auth/register"), guard: "guest", title: "Đăng ký", desc: "Tạo tài khoản miễn phí trên SKIBIDI SCRIPT WEB." });
  define("/forgot-password", { load: L("auth/forgot"), guard: "guest", title: "Quên mật khẩu", desc: "Đặt lại mật khẩu tài khoản của bạn." });
  define("/two-step", { load: L("auth/twofa"), guard: "twofa", title: "Xác minh 2 bước", noindex: true });
  define("/auth/action", { load: L("auth/action"), guard: "open", title: "Xác nhận từ email", noindex: true });
  define("/profile", { load: L("profile"), guard: "auth", title: "Hồ sơ", needs: [] });
  define("/search", { load: L("search"), guard: "public", title: "Tìm kiếm", noindex: true, needs: ALL });
  define("/categories", { load: L("categories"), guard: "public", title: "Danh mục", desc: "Tất cả danh mục nội dung đã được kiểm duyệt trên SKIBIDI SCRIPT WEB.", needs: ALL });
  define("/notifications", { load: L("redirect"), guard: "public", to: "/", open: "updates", title: "Thông báo", noindex: true, needs: ["notice", "updates"] });
  [["skibidiscript", "/skibidiscript"], ["about", "/about"], ["guide", "/guide"], ["apk-safety", "/apk-safety"], ["security", "/security"], ["terms", "/terms"], ["privacy", "/privacy"]].forEach(([k, p]) => define(p, { load: L("info"), guard: "public", info: k, needs: [] }));
  define("/favorites", { load: L("favorites"), guard: "public", title: "Yêu thích", noindex: true, needs: ALL });
  define("/help", { load: L("help"), guard: "public", title: "Câu hỏi thường gặp", desc: "Câu hỏi thường gặp về tài khoản, bảo mật, nội dung và cài đặt của SKIBIDI SCRIPT WEB.", needs: [] });
  define("/help/support", { load: L("help/support"), guard: "real", title: "Hỗ trợ", needs: [] });
  define("/help/report", { load: L("help/report"), guard: "real", title: "Báo cáo", needs: ["cats", "data:*"] });
  define("/help/chat", { load: L("redirect"), guard: "real", to: "/", open: "chat", title: "Nhắn tin với dev", needs: [] });
  define("/help/messages", { load: L("redirect"), guard: "real", to: "/inbox", title: "Hộp thư", needs: [] });
  define("/inbox", { load: L("inbox"), guard: "real", title: "Hộp thư", noindex: true, needs: () => (session.isDev ? ["users"] : []) });
  define("/inbox/:tid", { load: L("inbox"), guard: "real", title: "Hộp thư", noindex: true, needs: () => (session.isDev ? ["users"] : []) });
  define("/help/messages/:tid", { load: L("redirect"), guard: "real", to: "/inbox/:tid", title: "Hộp thư", needs: [] });
  define("/help/submit", { load: L("help/submit"), guard: "real", title: "Đăng nội dung", needs: ["cats"] });
  define("/settings", { load: L("settings"), guard: "public", title: "Cài đặt", noindex: true, needs: ["theme"] });
  define("/404", notFoundDef);

  const family = (prefix, extra) => {
    const needs = catNeeds(extra);
    define(prefix, { load: L("items/list"), guard: "public", needs, ...extra });
    define(prefix + "/create", { load: L("items/form"), guard: "staff", mode: "create", needs, ...extra });
    define(prefix + "/:id", { load: L("items/detail"), guard: "public", needs, ...extra });
    define(prefix + "/:id/edit", { load: L("items/form"), guard: "staff", mode: "edit", needs, ...extra });
  };
  BASE_PATHS.forEach(([seg, catId]) => family("/" + seg, { catId }));
  family("/c/:node", { custom: true });

  define("/dev", { load: L("dev/index"), guard: "dev", title: "Dev Panel", needs: [...ALL, "users", "maint"] });
  define("/dev/data", { load: L("dev/data"), guard: "dev", title: "Quản lý dữ liệu", needs: ALL });
  BASE_PATHS.forEach(([seg, catId]) => define("/dev/data/" + seg, { load: L("dev/records"), guard: "dev", catId, needs: catNeeds({ catId }) }));
  define("/dev/data/c/:node", { load: L("dev/records"), guard: "dev", custom: true, needs: catNeeds({ custom: true }) });
  define("/dev/shop", { load: L("dev/shop"), guard: "dev", title: "Quản lý cửa hàng", needs: ["users"] });
  define("/dev/categories", { load: L("dev/categories"), guard: "dev", title: "Danh mục", needs: ["cats"] });
  define("/dev/inbox", { load: L("redirect"), guard: "dev", to: "/inbox", title: "Hộp thư", needs: [] });
  define("/dev/review", { load: L("dev/review"), guard: "dev", title: "Duyệt bài", needs: ["cats", "users"] });
  define("/dev/users", { load: L("dev/users"), guard: "dev", title: "Người dùng", needs: ["users"] });
  define("/dev/mail", { load: L("dev/mail"), guard: "dev", title: "Gửi thư", needs: ["users"] });
  define("/dev/theme", { load: L("dev/theme"), guard: "dev", title: "Giao diện", needs: ["theme"] });
  define("/dev/updates", { load: L("dev/updates"), guard: "dev", title: "Cập nhật", needs: ["updates"] });
  define("/dev/test", { load: L("dev/test"), guard: "dev", title: "Kiểm tra hệ thống", needs: [] });
  define("/dev/system", { load: L("dev/system"), guard: "dev", title: "Bảo trì & thông báo", needs: ["maint", "notice"] });
}
