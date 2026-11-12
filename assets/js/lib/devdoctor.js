/* Chẩn đoán "DEV không có quyền ghi": kiểm tra email đã xác minh, thẻ phiên (2 bước) và thử ghi thật vào nox_probe.
   Có thể tự sửa: tải lại hồ sơ, làm mới token, xin lại thẻ phiên từ máy chủ; nếu vẫn thiếu thì đưa tới trang nhập mã. */
import { auth, db, TS } from "./firebase.js";
import { session, refreshSession, forceTwofa, computeDev } from "./auth.js";
import { api, serverReady } from "./account.js";
import { DEV_EMAIL } from "./config.js";

export async function diagnose({ fix = false } = {}) {
  const out = [], add = (id, ok, label, detail = "", how = "") => out.push({ id, ok, label, detail, how });
  const u = auth && auth.currentUser;
  if (!u || u.isAnonymous) { add("login", false, "Đã đăng nhập tài khoản thật", "Bạn chưa đăng nhập.", "Đăng nhập bằng email quản trị."); return { ok: false, checks: out }; }
  const mail = String(u.email || "").toLowerCase();
  add("email", mail === DEV_EMAIL.toLowerCase(), "Đúng email quản trị", mail === DEV_EMAIL.toLowerCase() ? mail : "Đang đăng nhập bằng " + (mail || "tài khoản không có email") + ".", "Đăng xuất rồi đăng nhập bằng đúng email quản trị.");
  if (fix) { try { await u.reload(); } catch (_) {} }
  add("verified", !!u.emailVerified, "Email đã được xác minh", u.emailVerified ? "" : "Email quản trị chưa xác minh nên Rules từ chối mọi thao tác ghi.", "Mở thư xác minh trong hộp thư (hoặc gửi lại ở Hồ sơ), bấm liên kết rồi quay lại đây.");
  let claims = {};
  try { claims = (await u.getIdTokenResult(!!fix)).claims || {}; } catch (_) {}
  add("claim", claims.email_verified === true, "Token có xác nhận email", claims.email_verified === true ? "" : "Phiên đăng nhập này còn mang trạng thái email chưa xác minh.", "Bấm “Kiểm tra & sửa” để làm mới token.");
  let gate = false; try { gate = ((await db.ref("nox_security/" + u.uid + "/gate").once("value")).val()) === true; } catch (_) {}
  const hasTf = [claims.tf1, claims.tf2, claims.tf3].includes(claims.auth_time);
  add("tf", !gate || hasTf, "Phiên có thẻ xác minh (nếu tài khoản đã bật cổng 2 bước)", !gate ? "Tài khoản chưa bật cổng 2 bước — không cần thẻ." : hasTf ? "" : "Tài khoản có cổng 2 bước nhưng phiên này chưa được cấp thẻ nên các thao tác ghi bị từ chối.", "Bấm “Kiểm tra & sửa”; nếu máy chủ không cấp được, hệ thống sẽ đưa bạn tới trang nhập mã.");
  let probe = false, perr = "";
  try { await db.ref("nox_probe/last").set(TS()); await db.ref("nox_probe/last").remove(); probe = true; } catch (e) { perr = e && e.code ? String(e.code) : String(e && e.message || e); }
  add("probe", probe, "Thử ghi dữ liệu quản trị", probe ? "Ghi và xóa thử thành công." : "Firebase từ chối (" + perr + ").", "Xem các mục phía trên; đảm bảo đã dán file database.rules.json mới nhất vào Firebase → Realtime Database → Rules → Publish.");
  return { ok: out.every(c => c.ok), checks: out, gate, hasTf };
}
/* Tự sửa rồi kiểm tra lại. needCode = true nghĩa là phải nhập mã 2 bước mới xong. */
export async function repair() {
  const u = auth && auth.currentUser; if (!u) return { ok: false, needCode: false, checks: [] };
  try { await u.reload(); await u.getIdToken(true); } catch (_) {}
  try { if (await serverReady()) await api("login-check"); } catch (_) {}
  try { await refreshSession(); } catch (_) {}
  let r = await diagnose({ fix: true });
  const tfBad = r.checks.some(c => c.id === "tf" && !c.ok);
  if (!r.ok && tfBad) { forceTwofa(); return { ...r, needCode: true }; }
  return { ...r, needCode: false };
}
