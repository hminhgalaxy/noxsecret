/* Lời nhắn hiển thị cho người dùng: luôn bằng tiếng Việt dễ hiểu, không lộ thuật ngữ kỹ thuật. */
const HAS_VI = /[^\x00-\x7F]/;
const BY_CODE = {
  "PERMISSION_DENIED": "Bạn không có quyền thực hiện thao tác này.", "permission-denied": "Bạn không có quyền thực hiện thao tác này.",
  "NETWORK_ERROR": "Lỗi kết nối mạng. Vui lòng thử lại.", "unavailable": "Lỗi kết nối mạng. Vui lòng thử lại.",
  "auth/network-request-failed": "Lỗi kết nối mạng. Vui lòng thử lại."
};
export const GENERIC = "Có lỗi xảy ra. Vui lòng thử lại.";
/* Chuyển mọi lỗi (kể cả lỗi kỹ thuật tiếng Anh) thành câu thân thiện */
export function friendly(e, fallback = GENERIC) {
  if (!e) return fallback;
  if (typeof e === "string") return HAS_VI.test(e) ? e : fallback;
  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];
  const m = String(e.message || "");
  return HAS_VI.test(m) ? m : fallback;
}
/* Lỗi đăng nhập / đăng ký */
const AUTH = {
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.", "auth/wrong-password": "Email hoặc mật khẩu không đúng.",
  "auth/user-not-found": "Không tìm thấy tài khoản với email này.", "auth/invalid-email": "Email không hợp lệ.",
  "auth/email-already-in-use": "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
  "auth/weak-password": "Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự gồm chữ và số.",
  "auth/too-many-requests": "Bạn thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.",
  "auth/network-request-failed": "Lỗi kết nối mạng. Vui lòng thử lại.",
  "auth/user-disabled": "Tài khoản này đã bị khóa.", "auth/missing-password": "Vui lòng nhập mật khẩu.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập.", "auth/requires-recent-login": "Vì lý do an toàn, hãy đăng nhập lại rồi thử lại.",
  "auth/operation-not-allowed": "Cách đăng nhập này đang tạm thời không khả dụng.",
  "auth/unauthorized-domain": "Cách đăng nhập này đang tạm thời không khả dụng.",
  "auth/configuration-not-found": "Đăng nhập đang tạm thời không khả dụng. Vui lòng thử lại sau.",
  "auth/api-key-not-valid": "Đăng nhập đang tạm thời không khả dụng. Vui lòng thử lại sau.",
  "auth/expired-action-code": "Liên kết này đã hết hạn hoặc đã được dùng. Hãy yêu cầu một liên kết mới.", "auth/invalid-action-code": "Liên kết này không hợp lệ hoặc đã được dùng. Hãy yêu cầu một liên kết mới.",
  "auth/wrong-password-reauth": "Mật khẩu hiện tại không đúng.",
  "app/no-sdk": "Không kết nối được tới hệ thống đăng nhập. Vui lòng tải lại trang.",
  "app/captcha": "Xác minh không thành công. Vui lòng thử lại.", "app/captcha-missing": "Vui lòng xác minh bạn không phải người máy."
};
export const authMessage = e => AUTH[(e && e.code) || ""] || (e && e.code && String(e.code).startsWith("auth/") ? GENERIC : friendly(e));
