import { esc, toast } from "../lib/util.js";
import { session, updateAccountProfile } from "../lib/auth.js";
export function index(ctx) {
  ctx.setPage({ title: "Hồ sơ tài khoản", sub: "Quản lý thông tin hiển thị của bạn" });
  const u = session.user;
  if (!u) { ctx.el.innerHTML = ""; return; }
  const avatar = u.photoURL || "";
  ctx.el.innerHTML = `<section class="profile-layout">
    <div class="profile-card profile-summary">
      <div class="profile-avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : `<span>${esc((u.displayName || u.email || "U").slice(0,1).toUpperCase())}</span>`}</div>
      <h2>${esc(u.displayName || "Thành viên")}</h2><p>${esc(u.email || "")}</p>
      <span class="profile-status">Tài khoản đang hoạt động</span>
    </div>
    <form id="profileForm" class="profile-card stack">
      <div><h2>Thông tin cá nhân</h2><p class="muted">Tên và ảnh đại diện sẽ hiển thị trên tài khoản của bạn.</p></div>
      <div class="fld"><label for="displayName">Tên hiển thị</label><input id="displayName" name="displayName" maxlength="48" value="${esc(u.displayName || "")}" placeholder="Tên của bạn"></div>
      <div class="fld"><label for="photoURL">Đường dẫn ảnh đại diện</label><input id="photoURL" name="photoURL" type="url" value="${esc(avatar)}" placeholder="https://..."></div>
      <p id="profileError" class="form-err" role="alert"></p>
      <button class="btn btn-p btn-wide" type="submit"><span>Lưu thay đổi</span></button>
    </form>
    <div class="profile-card profile-meta"><h2>Tài khoản</h2><div><span>Email</span><b>${esc(u.email || "—")}</b></div><div><span>Phương thức đăng nhập</span><b>${esc((u.providerData[0] && u.providerData[0].providerId) || "Email")}</b></div><div><span>Xác minh email</span><b>${u.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</b></div></div>
  </section>`;
  const form = ctx.el.querySelector("#profileForm"), error = ctx.el.querySelector("#profileError"), btn = form.querySelector("button");
  form.addEventListener("submit", async e => {
    e.preventDefault(); error.textContent = "";
    const name = form.displayName.value.trim(), photo = form.photoURL.value.trim();
    if (photo && !/^https:\/\/.+/i.test(photo)) { error.textContent = "Ảnh đại diện cần là đường dẫn HTTPS."; return; }
    btn.disabled = true; btn.querySelector("span").textContent = "Đang lưu…";
    try { await updateAccountProfile({ displayName: name, photoURL: photo }); toast("Đã cập nhật hồ sơ."); index(ctx); }
    catch (ex) { error.textContent = ex.message || "Không thể lưu thay đổi."; btn.disabled = false; btn.querySelector("span").textContent = "Lưu thay đổi"; }
  });
}
