/* Dev → Duyệt bài: mục / danh mục do người dùng gửi. Chỉ khi DEV bấm Duyệt thì mới xuất hiện công khai. */
import { esc, fmtTime, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import * as H from "../../lib/help.js";
import { friendly } from "../../lib/messages.js";
import { formDialog, confirmDialog } from "../../lib/confirm.js";
import { locked, devCrumb } from "./shared.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Duyệt bài", crumbs: devCrumb, sub: "Xem kỹ link, mô tả và code trước khi duyệt. Bài chưa duyệt không bao giờ hiện công khai.", noindex: true });
  let all = [];
  ctx.el.innerHTML = `<div class="dlist" id="pl"></div>`; const box = ctx.el.querySelector("#pl");
  const who = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return u ? (u.name || u.email || uid) + (u.email && u.name ? " · " + u.email : "") : uid; };
  const draw = () => {
    box.innerHTML = all.length ? all.map(p => { const cat = S.catById(p.catId); return `<article class="rv${p.status === "rejected" ? " rej" : ""}" data-k="${esc(p.uid)}|${esc(p.pid)}">
      <header><span class="ci">${ICO[p.kind === "category" ? "grid" : "box"]}</span><span class="nm"><b translate="no">${esc(p.name)}</b><small translate="no">${p.kind === "category" ? "Danh mục mới" : "Mục → " + esc(cat ? cat.label : p.catId + " (không còn)")} · ${esc(who(p.uid))} · ${esc(fmtTime(p.createdAt))}</small></span>${p.status === "rejected" ? '<span class="badge strong">Đã từ chối</span>' : '<span class="badge review">' + ICO.clock + 'Chờ duyệt</span>'}</header>
      ${p.img ? `<img class="card-thumb" src="${esc(p.img)}" alt="">` : ""}
      ${p.desc || p.sub ? `<p translate="no">${esc(p.desc || p.sub)}</p>` : ""}
      ${p.url ? `<p class="rv-url" translate="no">${ICO.ext}<span>${esc(p.url)}</span></p>` : ""}
      ${p.code ? `<pre class="card-code" translate="no">${esc(String(p.code).slice(0, 600))}${p.code.length > 600 ? "\n…" : ""}</pre>` : ""}
      ${p.note ? `<p class="sub-note" translate="no">Lý do từ chối: ${esc(p.note)}</p>` : ""}
      <div class="form-acts"><button class="btn primary sm" type="button" data-a="ok">Duyệt &amp; đăng</button><button class="btn ghost sm" type="button" data-a="no">Từ chối</button></div></article>`; }).join("")
      : `<div class="statebox">${ICO.check}<p>Không có bài nào đang chờ duyệt.</p></div>`;
  };
  box.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]"); if (!b) return; const [uid, pid] = b.closest("[data-k]").dataset.k.split("|"), p = all.find(x => x.uid === uid && x.pid === pid); if (!p) return;
    try {
      if (b.dataset.a === "no") { const v = await formDialog({ kind: "reject", title: "Từ chối bài này?", message: "Người gửi sẽ thấy lý do bên dưới.", ok: "Từ chối", danger: true, fields: [{ id: "note", label: "Lý do (không bắt buộc)", max: 300 }] }); if (v) { await H.rejectPending(p, v.note); toast("Đã từ chối."); } }
      else if (p.kind === "category") { const v = await formDialog({ kind: "approve", title: "Duyệt danh mục này?", message: "Danh mục sẽ hiện công khai. Hãy chọn phân loại phù hợp.", ok: "Duyệt & đăng", fields: [{ id: "risk", label: "Phân loại", value: "", options: Object.entries(S.RISKS) }] }); if (v) { await H.approvePending(p, { risk: v.risk }); toast("Đã duyệt và đăng danh mục."); } }
      else { if (await confirmDialog({ kind: "approve", title: "Duyệt và đăng mục này?", message: "Mục sẽ hiện công khai trong danh mục đã chọn.", ok: "Duyệt & đăng" })) { await H.approvePending(p); toast("Đã duyệt và đăng."); } }
    } catch (x) { toast(friendly(x), "err"); }
  });
  const offs = [H.listenAllPending(v => { all = v; draw(); }), S.subscribe(t => { if (t === "users" || t === "cats") draw(); })];
  return () => offs.forEach(f => f());
}
