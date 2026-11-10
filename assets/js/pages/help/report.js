/* Báo cáo nội dung xấu / có hại. Mở từ nút "Báo cáo" ở trang chi tiết thì tự điền sẵn mục bị báo cáo. */
import { esc, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import * as H from "../../lib/help.js";
import { friendly } from "../../lib/messages.js";

export function mount(ctx) {
  ctx.setPage({ title: "Báo cáo", sub: "Báo cho quản trị viên nội dung có mã độc, lừa đảo, vi phạm hoặc link hỏng.", crumbs: [{ label: "Trợ giúp", href: "/help" }], noindex: true });
  const cid = ctx.query.get("cat") || "", key = ctx.query.get("key") || "", it = cid && key ? S.item(cid, key) : null, cat = S.catById(cid);
  const title = it ? it.name : "";
  ctx.el.innerHTML = `<form class="formcard" id="rf" novalidate>
    ${it ? `<div class="reported"><span class="ci">${ICO.flag}</span><span><small>Mục bị báo cáo</small><b translate="no">${esc(it.name)}</b></span></div>` : `<div class="field"><label for="rt">Bạn báo cáo điều gì? <b class="req" aria-hidden="true">*</b></label><input id="rt" name="title" maxlength="120" autocomplete="off" placeholder="Tên mục hoặc đường dẫn trang"><p class="field-error" data-err="title" role="alert"></p></div>`}
    <div class="field"><label for="rr">Lý do</label><select id="rr" name="reason">${Object.entries(H.REPORT_REASONS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
    <div class="field"><label for="rd">Chi tiết <b class="req" aria-hidden="true">*</b></label><textarea id="rd" name="text" rows="5" maxlength="2000" placeholder="Vì sao mục này có vấn đề?"></textarea><p class="field-error" data-err="text" role="alert"></p></div>
    <p class="sub-note">Đừng gửi mật khẩu hay thông tin cá nhân. Quản trị viên sẽ xem và gỡ nội dung nếu vi phạm.</p>
    <p class="form-error" id="re" role="alert"></p><div class="form-acts"><button class="btn primary" type="submit">${ICO.flag}Gửi báo cáo</button></div></form>`;
  const f = ctx.el.querySelector("#rf"), re = ctx.el.querySelector("#re");
  f.addEventListener("submit", async e => {
    e.preventDefault(); re.textContent = ""; f.querySelectorAll(".field-error").forEach(x => { x.textContent = ""; });
    const t = it ? title : (f.title.value || "").trim();
    if (!t) { f.querySelector('[data-err="title"]').textContent = "Hãy nhập mục bạn muốn báo cáo."; f.title.focus(); return; }
    if (!f.text.value.trim()) { f.querySelector('[data-err="text"]').textContent = "Hãy mô tả vấn đề."; f.text.focus(); return; }
    const ref = { kind: it ? "item" : "other", title: t.slice(0, 120), reason: f.reason.value, ...(it ? { catId: cat ? cat.id : cid, key } : {}) };
    const b = f.querySelector("button[type=submit]"); b.classList.add("busy");
    try { const tid = await H.createThread({ type: "report", subject: "Báo cáo: " + t, text: f.text.value, ref }); toast("Đã gửi báo cáo. Cảm ơn bạn!"); ctx.navigate("/help/messages/" + tid); }
    catch (x) { re.textContent = friendly(x); b.classList.remove("busy"); }
  });
}
