/* Đăng nội dung: người dùng gửi mục / danh mục để DEV duyệt. Cần đủ 3 điều kiện; không có gì lên công khai khi chưa được duyệt. */
import { esc, toast, fmtTime } from "../../lib/util.js";
import { ICO, PICK_ICONS } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import * as H from "../../lib/help.js";
import { session, onAuth } from "../../lib/auth.js";
import { friendly } from "../../lib/messages.js";
import { fileToItemImage } from "../../lib/avatar.js";
import { armDelete } from "../../lib/ui.js";
import { sendVerification } from "../../lib/auth.js";

export function mount(ctx) {
  ctx.setPage({ title: "Đăng nội dung", sub: "Gửi danh mục hoặc mục mới. Mọi bài đều được quản trị viên xem xét trước khi hiển thị công khai.", crumbs: [{ label: "Trợ giúp", href: "/help" }], noindex: true });
  let perm = false, lastCan = null, mine = [], mode = ctx.query.get("k") === "category" ? "category" : "item", img = "";
  ctx.el.innerHTML = `<div id="cond"></div><div id="formBox"></div><span class="dsec" style="margin-top:26px">Bài của tôi</span><div class="dlist" id="mine"></div>`;
  const cond = ctx.el.querySelector("#cond"), formBox = ctx.el.querySelector("#formBox"), list = ctx.el.querySelector("#mine");
  const row = (ok, label, action) => `<li class="${ok ? "good" : "bad"}"><span class="mk" aria-hidden="true">${ok ? ICO.check : ICO.x}</span><span class="tx">${label}</span>${!ok && action ? action : ""}</li>`;
  const drawCond = () => {
    const c = H.postConditions(perm);
    cond.innerHTML = `<div class="formcard"><span class="dsec">3 điều kiện để đăng bài</span><ul class="conds">
      ${row(c.email, "Email đã được xác minh", `<button class="btn ghost sm" type="button" data-a="verify">Gửi thư xác minh</button>`)}
      ${row(c.twofa, "Đã bật xác minh 2 bước", `<a class="btn ghost sm" href="/profile?tab=security">Bật ngay</a>`)}
      ${row(c.perm, "Được quản trị viên cấp phép đăng bài", `<a class="btn ghost sm" href="/help/support?post=1">Xin cấp phép</a>`)}</ul>
      <p class="sub-note">Nội dung gửi lên sẽ hiện nhãn "Đang xem xét" và chỉ được đăng công khai khi quản trị viên phê duyệt. Chỉ nhận link https://, ảnh chọn từ máy. Không gửi mã độc, hack, mod hay phần mềm vi phạm điều khoản.</p></div>`;
    const can = H.canPost(perm); if (can !== lastCan) { lastCan = can; drawForm(); }
  };
  const drawForm = () => {
    if (!H.canPost(perm)) { formBox.innerHTML = ""; return; }
    const cats = S.store.cats;
    formBox.innerHTML = `<div class="seg" role="tablist"><button type="button" role="tab" class="${mode === "item" ? "on" : ""}" aria-selected="${mode === "item"}" data-m="item">Gửi mục</button><button type="button" role="tab" class="${mode === "category" ? "on" : ""}" aria-selected="${mode === "category"}" data-m="category">Gửi danh mục mới</button></div>
    <form class="formcard" id="pf" novalidate>${mode === "item" ? `
      <div class="field"><label for="pc">Danh mục <b class="req" aria-hidden="true">*</b></label><select id="pc" name="catId">${cats.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join("")}</select></div>
      <div class="field"><label for="pn">Tên <b class="req" aria-hidden="true">*</b></label><input id="pn" name="name" maxlength="200" autocomplete="off"></div>
      <div class="field"><label for="pd">Mô tả</label><textarea id="pd" name="desc" rows="3" maxlength="2000"></textarea></div>
      <div class="field"><label for="pu">Link https://</label><input id="pu" name="url" type="url" inputmode="url" maxlength="2048" placeholder="https://…" autocomplete="off"></div>
      <div class="field"><label for="pk">Code (nếu có)</label><textarea id="pk" name="code" rows="6" maxlength="50000" class="mono"></textarea></div>
      <div class="field imgf"><span class="label">Ảnh minh họa (chọn từ máy, không bắt buộc)</span><div class="imgf-prev" id="ip" hidden></div><div class="acts"><label class="btn ghost upbtn">${ICO.eye}Chọn ảnh từ máy<input type="file" id="ipick" accept="image/jpeg,image/png,image/webp" hidden></label><button class="btn ghost" type="button" id="idel" hidden>${ICO.trash}Xóa ảnh</button></div></div>`
    : `
      <div class="field"><label for="pn">Tên danh mục <b class="req" aria-hidden="true">*</b></label><input id="pn" name="name" maxlength="60" autocomplete="off"></div>
      <div class="field"><label for="ps">Mô tả ngắn</label><input id="ps" name="sub" maxlength="120" autocomplete="off"></div>
      <div class="field"><label for="pi">Biểu tượng</label><select id="pi" name="icon">${PICK_ICONS.map(k => `<option value="${k}">${k}</option>`).join("")}</select></div>
      <div class="field"><label for="pe">Mục trong danh mục cần có</label><select id="pe" name="need">${Object.entries(S.NEEDS).map(([v, l]) => `<option value="${v}"${v === "any" ? " selected" : ""}>${l}</option>`).join("")}</select></div>`}
      <p class="form-error" id="pe2" role="alert"></p><div class="form-acts"><button class="btn primary" type="submit">${ICO.arrow}Gửi để duyệt</button></div></form>`;
    wireForm();
  };
  const wireForm = () => {
    const f = formBox.querySelector("#pf"), er = formBox.querySelector("#pe2"); img = "";
    if (mode === "item") {
      const prev = f.querySelector("#ip"), del = f.querySelector("#idel"), pick = f.querySelector("#ipick");
      const show = d => { img = d || ""; prev.hidden = del.hidden = !d; prev.innerHTML = d ? `<img src="${d}" alt="">` : ""; };
      pick.addEventListener("change", async () => { const file = pick.files && pick.files[0]; pick.value = ""; if (!file) return; er.textContent = ""; try { show(await fileToItemImage(file)); } catch (x) { er.textContent = x.message; } });
      del.addEventListener("click", () => show(""));
    }
    f.addEventListener("submit", async e => {
      e.preventDefault(); er.textContent = ""; const b = f.querySelector("button[type=submit]"); b.classList.add("busy");
      try {
        await H.submitPending(mode === "item" ? { kind: "item", catId: f.catId.value, name: f.name.value, desc: f.desc.value, url: f.url.value, code: f.code.value, img } : { kind: "category", name: f.name.value, sub: f.sub.value, icon: f.icon.value, need: f.need.value });
        toast("Đã gửi. Bài của bạn đang chờ quản trị viên xem xét."); f.reset(); img = "";
        const prev = f.querySelector("#ip"); if (prev) { prev.hidden = true; prev.innerHTML = ""; }
      } catch (x) { er.textContent = friendly(x); }
      b.classList.remove("busy");
    });
  };
  const drawMine = () => {
    list.innerHTML = mine.length ? mine.map(p => `<div class="drow sub-row"><span class="ci">${ICO[p.kind === "category" ? "grid" : "box"]}</span><span class="nm"><b translate="no">${esc(p.name)}</b><small>${p.kind === "category" ? "Danh mục" : "Mục"} · ${esc(fmtTime(p.createdAt))}${p.note ? ` · Lý do: <span translate="no">${esc(p.note)}</span>` : ""}</small></span>
      ${p.status === "pending" ? `<span class="badge review">${ICO.clock}Đang xem xét</span>` : `<span class="badge strong">Bị từ chối</span>`}<button class="ib del" type="button" data-w="${esc(p.key)}" aria-label="Rút bài ${esc(p.name)}">${ICO.trash}</button></div>`).join("")
      : `<div class="statebox"><p>Bạn chưa gửi bài nào.</p></div>`;
  };
  cond.addEventListener("click", async e => { if (e.target.closest('[data-a="verify"]')) { try { await sendVerification(); toast("Đã gửi thư xác minh. Hãy kiểm tra hộp thư."); } catch (x) { toast(friendly(x), "err"); } } });
  formBox.addEventListener("click", e => { const m = e.target.closest("[data-m]"); if (m && m.dataset.m !== mode) { mode = m.dataset.m; drawForm(); } });
  list.addEventListener("click", e => { const w = e.target.closest("[data-w]"); if (w) armDelete(w, () => H.withdrawPending(w.dataset.w).then(() => toast("Đã rút bài.")).catch(x => toast(friendly(x), "err")), { title: "Rút bài này?", message: "Bài sẽ bị xóa khỏi danh sách chờ duyệt.", ok: "Rút bài" }); });
  drawCond(); drawMine();
  const offs = [H.listenMyPerm(v => { perm = v; drawCond(); }), H.listenMyPending(v => { mine = v; drawMine(); }), onAuth(drawCond)];
  return () => offs.forEach(f => f && f());
}
