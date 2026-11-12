/* Gửi yêu cầu hỗ trợ cho dev (kèm lựa chọn xin cấp phép đăng bài) */
import { ICO } from "../../lib/icons.js";
import * as H from "../../lib/help.js";
import { friendly } from "../../lib/messages.js";
import { toast } from "../../lib/util.js";

export function mount(ctx) {
  ctx.setPage({ title: "Hỗ trợ", sub: "Gửi yêu cầu cho quản trị viên: hỏi đáp, xin cấp phép đăng bài, báo lỗi.", crumbs: [{ label: "Trợ giúp", href: "/help" }], noindex: true });
  const wantPost = ctx.query.get("post") === "1";
  ctx.el.innerHTML = `<form class="formcard" id="sf" novalidate>
    <div class="field"><label for="ss">Chủ đề <b class="req" aria-hidden="true">*</b></label><input id="ss" name="subject" maxlength="120" autocomplete="off" value="${wantPost ? "Xin cấp phép đăng bài" : ""}" placeholder="Bạn cần hỗ trợ về điều gì?"><p class="field-error" data-err="subject" role="alert"></p></div>
    <div class="field"><label for="sm">Nội dung <b class="req" aria-hidden="true">*</b></label><textarea id="sm" name="text" rows="6" maxlength="2000" placeholder="Mô tả càng rõ càng tốt…">${wantPost ? "Mình muốn được đăng danh mục / nội dung lên website. Mình đã xác minh email và bật xác minh 2 bước." : ""}</textarea><p class="field-error" data-err="text" role="alert"></p></div>
    <label class="check"><input type="checkbox" name="wantPost"${wantPost ? " checked" : ""}> <span>Đây là yêu cầu xin quyền đăng bài (cần email đã xác minh và đã bật xác minh 2 bước)</span></label>
    <p class="form-error" id="se" role="alert"></p><div class="form-acts"><button class="btn primary" type="submit">${ICO.arrow}Gửi yêu cầu</button></div></form>`;
  const f = ctx.el.querySelector("#sf"), se = ctx.el.querySelector("#se");
  f.addEventListener("submit", async e => {
    e.preventDefault(); se.textContent = ""; f.querySelectorAll(".field-error").forEach(x => { x.textContent = ""; });
    if (!f.subject.value.trim()) { f.querySelector('[data-err="subject"]').textContent = "Hãy nhập chủ đề."; f.subject.focus(); return; }
    if (!f.text.value.trim()) { f.querySelector('[data-err="text"]').textContent = "Hãy nhập nội dung."; f.text.focus(); return; }
    const b = f.querySelector("button[type=submit]"); b.classList.add("busy");
    try { const tid = await H.createThread({ type: "support", subject: f.subject.value, text: f.text.value, wantPost: f.wantPost.checked }); toast("Đã gửi yêu cầu. Quản trị viên sẽ trả lời trong Hộp thư."); ctx.navigate("/inbox/" + tid); }
    catch (x) { se.textContent = friendly(x); b.classList.remove("busy"); }
  });
}
