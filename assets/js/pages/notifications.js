import { esc, fmtTime } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { session, onAuth } from "../lib/auth.js";

export function mount(ctx) {
  ctx.setPage({ title: "Thông báo", sub: "Tin mới nhất từ đội ngũ quản trị.", desc: "Thông báo mới nhất từ SKIBIDI SCRIPT WEB." });
  const draw = () => {
    const n = S.store.notice, has = n && n.enabled !== false && ((n.body || "").trim() || (n.title || "").trim());
    ctx.el.innerHTML = has ? `<article class="notice-card"><span class="badge strong" style="align-self:flex-start">${ICO.bell}Thông báo</span><h2>${esc((n.title || "").trim() || "Thông báo")}</h2>
        <p class="notice-body">${esc((n.body || "").trim())}</p>${n.updatedAt ? `<small class="faint">Cập nhật ${esc(fmtTime(n.updatedAt))}</small>` : ""}</article>`
      : `<div class="statebox">${ICO.bell}<p>Hiện chưa có thông báo nào.</p></div>`;
    if (session.isDev) ctx.el.insertAdjacentHTML("beforeend", `<p><a class="btn ghost" href="/dev/system#notice">${ICO.pencil}Chỉnh sửa thông báo</a></p>`);
  };
  draw(); const u1 = S.subscribe(t => { if (t === "notice") draw(); }), u2 = onAuth(draw); return () => { u1(); u2(); };
}
