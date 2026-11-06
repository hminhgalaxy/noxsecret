/* Cấu hình GỐC — giữ nguyên Firebase project, node dữ liệu và email DEV của website hiện tại. */
export const firebaseConfig = {
  apiKey: "AIzaSyDNGa1YNLJk1n5C_cxCqsGlx7_hP7DjetA",
  authDomain: "noxgalaxy-2cd71.firebaseapp.com",
  databaseURL: "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "noxgalaxy-2cd71",
  appId: "1:632801709671:web:d239eb4bc8e0f7acab4ec2"
};
export const GOOGLE_CLIENT_ID = "971947846929-as186hmb8lmv293t79fgf4lrhp215kka.apps.googleusercontent.com";
/* Chỉ dùng để hiển thị UI. Quyền thật do database.rules.json kiểm tra phía Firebase. */
export const DEV_EMAIL = "hminhgalaxy@gmail.com";
export const DATA_ROOT = "nox_data";
export const CATS_NODE = "nox_categories";
export const MAINT_NODE = "nox_maintenance";
export const NOTICE_NODE = "nox_notice";
export const THEME_NODE = "nox_theme";
export const UPDATES_NODE = "nox_updates"; // MỚI (additive): bài đăng "Cập nhật này có gì?" — ai cũng đọc được, chỉ DEV ghi
export const USERS_NODE = "nox_users"; // MỚI (additive): hồ sơ đăng nhập, phục vụ /dev/users
export const MAX_DATA_LEN = 9 * 1024 * 1024;
export const THEME_PUBLIC_KEYS = ["bgType", "bgData", "audioData", "audioName"];
