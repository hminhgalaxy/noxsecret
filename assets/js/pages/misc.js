import { esc, fmtTime, vi, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { session, onAuth, resendVerification, signOut } from "../lib/auth.js";
import { getThemePref, setThemePref, isMuted } from "../lib/prefs.js";
import { hasMusic, toggleSound } from "../lib/media.js";
import { cardHTML, observeAnim, emptyHTML } from "../lib/ui.js";
import { fillTiles } from "./home.js";

export function notFound(ctx) {
  ctx.setPage({ title: "404 — Không tìm thấy trang", crumbs: [] });
  const p = location.pathname !== "/404" ? location.pathname : "";
  ctx.el.innerHTML = `<div class="statebox nf"><div class="nf404" aria-hidden="true">404</div><p>Trang bạn tìm không tồn tại${p ? ": <code>" + esc(p) + "</code>" : ""}.</p>
    <div class="uprow"><a class="btn btn-p" href="/" style="--cat:var(--accent-primary)">${ICO.home}Về trang chủ</a><button class="btn btn-g" type="button" id="bk">${ICO.back}Quay lại</button></div></div>`;
  ctx.el.querySelector("#bk").onclick = () => history.length > 1 ? history.back() : ctx.navigate("/");
}
export function categories(ctx) {
  ctx.setPage({ title: "Danh mục", sub: "Tất cả danh mục dữ liệu của website.", count: S.store.cats.length + " danh mục" });
  ctx.el.innerHTML = `<div class="cattiles" id="tiles"></div>`; const box = ctx.el.querySelector("#tiles"); let k = "";
  const draw = () => { const nk = S.store.cats.map(c => c.id).join(); if (nk !== k) { k = nk; fillTiles(box); } ctx.setPage({ count: S.store.cats.length + " danh mục" }); };
  draw(); return S.subscribe(t => { if (t === "cats" || t === "data") draw(); });
}
export function search(ctx) {
  const q0 = (ctx.query.get("q") || "").trim(), q = vi(q0);
  ctx.setPage({ title: q0 ? `Tìm kiếm: "${q0}"` : "Tìm kiếm", sub: "Lọc theo tên, mô tả, code · hỗ trợ tiếng Việt không dấu.", crumbs: [] });
  ctx.el.innerHTML = `<div class="grid" id="grid"></div>`; const grid = ctx.el.querySelector("#grid");
  const draw = () => {
    if (!q) { grid.innerHTML = emptyHTML("Nhập từ khóa vào ô tìm kiếm."); ctx.setPage({ count: "0 kết quả" }); return; }
    const res = []; S.store.cats.forEach(c => (S.items(c.id) || []).forEach(it => { if (vi(it.name).includes(q) || vi(it.desc).includes(q) || vi(it.code).includes(q)) res.push({ ...it, cat: c.id }); }));
    res.sort((a, b) => (b.ts || 0) - (a.ts || 0)); ctx.setPage({ count: res.length + " kết quả" });
    grid.innerHTML = res.length ? res.map((it, i) => cardHTML(it, it.cat, i, true)).join("") : emptyHTML("Không tìm thấy kết quả.");
    observeAnim(grid);
  };
  draw(); const u1 = S.subscribe(t => { if (t === "data" || t === "cats") draw(); }), u2 = onAuth(draw); return () => { u1(); u2(); };
}
export function notifications(ctx) {
  ctx.setPage({ title: "Thông báo", sub: "Thông báo từ quản trị viên." });
  const draw = () => {
    const n = S.store.notice, has = n && n.enabled !== false && ((n.body || "").trim() || (n.title || "").trim());
    ctx.el.innerHTML = has ? `<article class="noticecard"><span class="nt-badge">${ICO.bell}THÔNG BÁO</span><h2>${esc((n.title || "").trim() || "Thông báo")}</h2>
        <p class="ntbody">${esc((n.body || "").trim())}</p>${n.updatedAt ? `<small class="muted">Cập nhật ${esc(fmtTime(n.updatedAt))}</small>` : ""}</article>`
      : `<div class="statebox">${ICO.bell}<p>Hiện chưa có thông báo nào.</p></div>`;
    if (session.isDev) ctx.el.insertAdjacentHTML("beforeend", `<p class="devhint"><a class="btn btn-g" href="/dev/system#notice">${ICO.pencil}Chỉnh sửa thông báo</a></p>`);
  };
  draw(); const u1 = S.subscribe(t => { if (t === "notice") draw(); }), u2 = onAuth(draw); return () => { u1(); u2(); };
}
export function settings(ctx) {
  ctx.setPage({ title: "Cài đặt", sub: "Giao diện, âm thanh và tài khoản." });
  const draw = () => {
    const pref = getThemePref(), u = session.user;
    ctx.el.innerHTML = `<div class="setgrid">
      <section class="setcard"><h3>${ICO.paint}Giao diện</h3><p class="muted">Chọn chế độ hiển thị. Lưu trên trình duyệt này.</p>
        <div class="seg" role="radiogroup" aria-label="Giao diện">${[["dark", "Tối"], ["light", "Sáng"], ["system", "Theo hệ thống"]].map(([v, l]) => `<button type="button" role="radio" aria-checked="${pref === v}" data-theme="${v}" class="${pref === v ? "on" : ""}" style="--sc:var(--accent-primary)">${l}</button>`).join("")}</div></section>
      <section class="setcard"><h3>${ICO.music}Âm thanh</h3><p class="muted">${hasMusic() ? "Nhạc nền do quản trị viên cấu hình." : "Hiện chưa có nhạc nền."}</p>
        <div class="switch-row"><span>Phát nhạc nền</span><label class="sw"><input type="checkbox" id="snd" ${!isMuted() ? "checked" : ""}><i></i></label></div></section>
      <section class="setcard wide"><h3>${ICO.users}Tài khoản</h3>${u ? `<div class="acc-card"><span class="mail">${esc(u.displayName ? u.displayName + " · " : "")}${esc(u.email || "")}</span>${session.isDev ? '<span class="devtag">DEV</span>' : ""}</div>
        <p class="muted">Email: ${u.emailVerified ? "đã xác minh" : "<b>chưa xác minh</b>"}</p>
        ${session.devBlocked ? `<p class="form-err">${esc(session.devBlocked)}</p>` : ""}
        <div class="uprow">${!u.emailVerified ? `<button class="btn btn-g" id="verify" type="button">Gửi lại email xác minh</button>` : ""}${session.isDev ? `<a class="btn btn-p" href="/dev" style="--cat:var(--accent-primary)">Bảng quản trị</a>` : ""}<button class="btn btn-g" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div>`
        : `<p class="muted">Bạn chưa đăng nhập.</p><div class="uprow"><a class="btn btn-p" href="/login?next=/settings" style="--cat:var(--accent-primary)">Đăng nhập</a><a class="btn btn-g" href="/register">Đăng ký</a></div>`}</section></div>`;
    ctx.el.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => { setThemePref(b.dataset.theme); draw(); }));
    const s = ctx.el.querySelector("#snd"); if (s) s.addEventListener("change", () => { toggleSound(); s.checked = !isMuted(); });
    const v = ctx.el.querySelector("#verify"); if (v) v.addEventListener("click", () => resendVerification().then(() => toast("Đã gửi email xác minh.")).catch(e => toast(e.message || "Gửi thất bại.", "err")));
  };
  draw(); const u1 = onAuth(draw), u2 = S.subscribe(t => { if (t === "theme") draw(); }); return () => { u1(); u2(); };
}
