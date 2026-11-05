/* Cài đặt: giao diện sáng/tối, nhạc nền và tài khoản. */
import { esc, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { session, onAuth, resendVerification } from "../lib/auth.js";
import { getThemePref, setThemePref, isMuted } from "../lib/prefs.js";
import { hasMusic, toggleSound } from "../lib/media.js";
import { friendly } from "../lib/messages.js";

export function mount(ctx) {
  ctx.setPage({ title: "Cài đặt", sub: "Tùy chỉnh giao diện, âm thanh và tài khoản.", noindex: true });
  const draw = () => {
    const pref = getThemePref(), u = session.user;
    ctx.el.innerHTML = `<div class="set-grid">
      <section class="set-card"><h3>${ICO.paint}Giao diện</h3><p class="muted">Chọn chế độ hiển thị. Lựa chọn được lưu trên thiết bị này.</p>
        <div class="seg" role="radiogroup" aria-label="Giao diện">${[["dark", "Tối"], ["light", "Sáng"], ["system", "Theo thiết bị"]].map(([v, l]) => `<button type="button" role="radio" aria-checked="${pref === v}" data-theme="${v}" class="${pref === v ? "on" : ""}">${l}</button>`).join("")}</div></section>
      <section class="set-card"><h3>${ICO.music}Âm thanh</h3><p class="muted">${hasMusic() ? "Website có nhạc nền. Bạn có thể bật hoặc tắt tại đây." : "Hiện website chưa có nhạc nền."}</p>
        <div class="switch-row"><span>Phát nhạc nền</span><label class="sw"><input type="checkbox" id="snd" ${!isMuted() ? "checked" : ""} aria-label="Phát nhạc nền"><i></i></label></div></section>
      <section class="set-card wide"><h3>${ICO.user}Tài khoản</h3>${u ? `<p class="muted">Đang đăng nhập với <b>${esc(u.email || "")}</b>${u.emailVerified ? "" : " · email chưa được xác minh"}.</p>
        ${session.devBlocked ? `<p class="form-error">${esc(session.devBlocked)}</p>` : ""}
        <div class="acts"><a class="btn primary" href="/profile">Xem hồ sơ</a>${!u.emailVerified ? `<button class="btn ghost" id="verify" type="button">Gửi lại email xác minh</button>` : ""}<button class="btn ghost" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div>`
        : `<p class="muted">Bạn chưa đăng nhập.</p><div class="acts"><a class="btn primary" href="/login?next=/settings">Đăng nhập</a><a class="btn ghost" href="/register">Tạo tài khoản</a></div>`}</section></div>`;
    ctx.el.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => { setThemePref(b.dataset.theme); draw(); }));
    const s = ctx.el.querySelector("#snd"); if (s) s.addEventListener("change", () => { toggleSound(); s.checked = !isMuted(); });
    const v = ctx.el.querySelector("#verify"); if (v) v.addEventListener("click", () => resendVerification().then(() => toast("Đã gửi email xác minh. Hãy kiểm tra hộp thư.")).catch(e => toast(friendly(e), "err")));
  };
  draw(); const u1 = onAuth(draw), u2 = S.subscribe(t => { if (t === "theme") draw(); }); return () => { u1(); u2(); };
}
