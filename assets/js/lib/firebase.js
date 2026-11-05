/* MỘT kết nối Firebase duy nhất cho toàn bộ ứng dụng (app, auth, database). */
import { firebaseConfig } from "./config.js";
import { dlog } from "./log.js";
const fb = window.firebase;
export const FB_OK = !!fb;
export let db = null, auth = null, initError = null;
if (FB_OK) {
  try {
    if (!fb.apps.length) fb.initializeApp(firebaseConfig);
    db = fb.database(); auth = fb.auth();
    try { auth.setPersistence(fb.auth.Auth.Persistence.LOCAL).catch(() => {}); } catch (_) {}
  } catch (e) { initError = e; dlog("er", "Firebase init: " + (e.message || e)); }
} else dlog("er", "Firebase SDK không tải được.");
export const TS = () => fb.database.ServerValue.TIMESTAMP;
export const GoogleProvider = () => fb.auth.GoogleAuthProvider;
