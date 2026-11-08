/* Gọi /api/account (thư HTML riêng, xác minh 2 bước, email khôi phục, đổi email, quản trị).
   Nếu máy chủ chưa cấu hình (thiếu Brevo / khoá Firebase Admin) thì mọi hàm báo "không khả dụng"
   và website tự dùng thư mặc định của Firebase — đăng nhập/đăng ký/quên mật khẩu vẫn chạy bình thường. */
import { auth } from "./firebase.js";

const MSG = {
  too_fast: "Vui lòng đợi vài giây rồi hãy yêu cầu mã mới.", rate_limited: "Bạn thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.",
  wrong_code: "Mã chưa đúng. Hãy kiểm tra lại rồi thử lại.", code_expired: "Mã đã hết hạn. Hãy yêu cầu mã mới.", too_many_tries: "Bạn nhập sai quá nhiều lần. Hãy yêu cầu mã mới.",
  recent_login: "Vì lý do an toàn, hãy đăng nhập lại rồi thử lại.", email_taken: "Email này đã được dùng bởi tài khoản khác.", same_email: "Hãy nhập một email khác.",
  invalid_email: "Email không hợp lệ.", twofa_required: "Hãy nhập mã xác minh 2 bước trước.", no_recovery: "Bạn chưa thêm email khôi phục.", unverified: "Hãy xác minh email của bạn trước.",
  not_configured: "Tính năng này chưa được bật trên website.", mail_failed: "Chưa gửi được thư lúc này. Quản trị viên cần kiểm tra cấu hình gửi thư (Dev → Gửi thư → Kiểm tra gửi thư).", not_password: "Tài khoản này đăng nhập bằng Google nên không dùng được tính năng này.",
  already_on: "Xác minh 2 bước đã được bật.", not_on: "Xác minh 2 bước chưa được bật.", forbidden: "Bạn không có quyền thực hiện thao tác này.", guest: "Tài khoản khách không dùng được tính năng này.",
  wrong_password: "Mật khẩu hiện tại không đúng.", weak_password: "Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số.", same_password: "Hãy chọn mật khẩu khác với mật khẩu hiện tại.", unauthenticated: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.", network: "Lỗi kết nối mạng. Vui lòng thử lại.", not_found: "Không tìm thấy mục này.", bad_request: "Yêu cầu không hợp lệ."
};
export const apiMessage = r => MSG[r && r.code] || "Có lỗi xảy ra. Vui lòng thử lại.";

let down = 0; /* thời điểm máy chủ báo chưa cấu hình / không có API → tạm không gọi lại */
export async function api(action, body = {}, { token = true } = {}) {
  try {
    const h = { "content-type": "application/json" };
    if (token) { const u = auth && auth.currentUser; if (!u) return { ok: false, status: 401, code: "unauthenticated" }; h.authorization = "Bearer " + await u.getIdToken(); }
    const r = await fetch("/api/account", { method: "POST", headers: h, body: JSON.stringify({ ...body, action })});
    let j = null; try { j = await r.json(); } catch (_) {}
    if (r.status === 404 || r.status === 501 || (j && j.code === "not_configured")) { down = Date.now(); return { ok: false, status: r.status, code: "not_configured" }; }
    return j && typeof j === "object" ? { ...j, ok: !!j.ok, status: r.status } : { ok: false, status: r.status, code: "server_error" };
  } catch (_) { return { ok: false, status: 0, code: "network" }; }
}
/* true nếu máy chủ đã cấu hình thư + Firebase Admin (kết quả nhớ 5 phút) */
let st = null, stAt = 0;
export async function serverReady() {
  if (st !== null && Date.now() - stAt < 5 * 60 * 1000) return st;
  const r = await api("status", {}, { token: false }); st = !!(r.ok && r.mail); stAt = Date.now(); return st;
}
/* Các vấn đề cấu hình máy chủ (chỉ tên biến thiếu/sai, không lộ giá trị) */
export async function serverProblems() { const r = await api("status", {}, { token: false }); return { ok: !!r.ok, ready: !!(r.ok && r.mail), problems: (r && r.problems) || [], code: r && r.code }; }
export const apiDownRecently = () => Date.now() - down < 60 * 1000;
