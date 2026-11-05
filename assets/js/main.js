/* Điểm khởi động: nối các mô-đun lại với nhau. Mỗi việc cụ thể nằm trong file riêng ở lib/. */
import { applyThemePref } from "./lib/prefs.js";
applyThemePref();
import { $, safeNext } from "./lib/util.js";
import { dlog } from "./lib/log.js";
import * as router from "./lib/router.js";
import { onAuth } from "./lib/auth.js";
import * as S from "./lib/store.js";
import { initLayout, setPage } from "./lib/layout.js";
import { initNav, renderNav, renderCounts, renderNotifDot, renderAccount, markActive, closeDrawer } from "./lib/nav.js";
import { initHeader, setSearchValue } from "./lib/header.js";
import { initMedia, applyMedia, renderSound } from "./lib/media.js";
import { initSplash } from "./lib/splash.js";
import { applyMaint, resetMaintClock } from "./lib/maint.js";
import { initNotice, maybeNotice, allowNotice } from "./lib/notice.js";
import { initActions } from "./lib/actions.js";
import { registerRoutes, notFoundDef } from "./routes.js";

/* Bộ định tuyến */
registerRoutes();
router.configure({
  view: $("#view"), setPage, notFound: notFoundDef, safeNext, waitFor: S.waitFor,
  onRoute(cur) {
    document.body.dataset.route = cur.pattern || cur.path;
    maybeNotice(); markActive(true); applyMaint(); renderAccount(); closeDrawer();
    const isSearch = cur.path === "/search";
    setSearchValue(isSearch ? new URL(location.href).searchParams.get("q") || "" : "", isSearch);
  }
});

/* Dữ liệu / tài khoản → giao diện */
S.subscribe((type) => {
  if (type === "cats") renderNav();
  else if (type === "data") renderCounts();
  else if (type === "maint") { resetMaintClock(); applyMaint(); }
  else if (type === "notice") { renderNotifDot(); maybeNotice(); }
  else if (type === "theme") applyMedia();
});
onAuth(() => { S.syncDevListeners(); renderNav(); renderAccount(); applyMaint(); });

/* Khởi động */
initLayout(); initNav(); initHeader(); initMedia(); initNotice(); initActions();
renderNav(true); renderSound();
S.start();
const first = router.render({ pop: false });
initSplash(first).then(allowNotice);
dlog("ok", "Ứng dụng khởi động.");
