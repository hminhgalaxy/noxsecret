/* Điểm khởi động: nối các mô-đun lại với nhau. Mỗi việc cụ thể nằm trong file riêng ở lib/. */
import { applyThemePref, applyAllPrefs } from "./lib/prefs.js";
applyThemePref(); applyAllPrefs();
import { $, safeNext } from "./lib/util.js";
import { dlog } from "./lib/log.js";
import * as router from "./lib/router.js";
import { onAuth } from "./lib/auth.js";
import * as S from "./lib/store.js";
import { initLayout, setPage } from "./lib/layout.js";
import { initNav, renderNav, renderCounts, renderNotifDot, renderAccount, markActive, closeDrawer } from "./lib/nav.js";
import { initHeader } from "./lib/header.js";
import { initMedia, applyMedia, renderSound } from "./lib/media.js";
import { initSplash } from "./lib/splash.js";
import { applyMaint, resetMaintClock } from "./lib/maint.js";
import { initNotice, maybeNotice, allowNotice } from "./lib/notice.js";
import { initActions } from "./lib/actions.js";
import { markSeen } from "./lib/updates.js";
import { toast } from "./lib/util.js";
import { initI18n } from "./lib/i18n.js";
import { registerRoutes, notFoundDef, prefetchPages } from "./routes.js";

/* Bộ định tuyến */
registerRoutes();
router.configure({
  view: $("#view"), setPage, notFound: notFoundDef, safeNext, waitFor: S.waitFor,
  onRoute(cur) {
    document.body.dataset.route = cur.pattern || cur.path;
    maybeNotice(); markActive(true); applyMaint(); renderAccount(); closeDrawer();
  }
});

/* Dữ liệu / tài khoản → giao diện */
S.subscribe((type) => {
  if (type === "cats") renderNav();
  else if (type === "data") renderCounts();
  else if (type === "maint") { resetMaintClock(); applyMaint(); }
  else if (type === "notice") { renderNotifDot(); maybeNotice(); }
  else if (type === "updates") { const grew = renderNotifDot(); if (grew && updEmits > 0 && location.pathname !== "/notifications") toast("Có cập nhật mới.", "ok"); updEmits++; if (location.pathname === "/notifications") markSeen(); }
  else if (type === "theme") applyMedia();
});
let updEmits = 0;
onAuth(() => { S.syncDevListeners(); renderNav(); renderAccount(); applyMaint(); });

/* Khởi động */
import { initGfx } from "./lib/gfx.js"; initGfx();
initLayout(); initNav(); initHeader(); initMedia(); initNotice(); initActions();
renderNav(true); renderSound(); renderNotifDot();
S.start();
const first = initI18n().then(() => router.render({ pop: false }));
initSplash(first).then(allowNotice);
first.then(() => prefetchPages());
dlog("ok", "Ứng dụng khởi động.");
