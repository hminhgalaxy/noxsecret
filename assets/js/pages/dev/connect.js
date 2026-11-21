/* Dev Panel → Kết nối máy chủ: dán khóa Firebase Admin → tự kiểm tra/sửa định dạng → ra giá trị để dán vào Vercel → kiểm tra máy chủ đã nhận chưa.
   Khóa chỉ được xử lý TRONG TRÌNH DUYỆT này: không gửi đi đâu, không lưu vào database/localStorage/cookie. */
import { esc, toast, copyText } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { firebaseConfig } from "../../lib/config.js";
import { api } from "../../lib/account.js";
import { parseServiceAccount, toEnvValues } from "../../lib/sa.js";
import { locked, devCrumb } from "./shared.js";

const PROJECT = firebaseConfig.projectId;
const FB_LINK = "https://console.firebase.google.com/project/" + PROJECT + "/settings/serviceaccounts/adminsdk";
const row = (ok, text, extra = "") => `<li class="${ok === true ? "good" : ok === false ? "bad" : ""}" translate="no">${ok === true ? "✓" : ok === false ? "✗" : "•"} ${esc(text)}${extra}</li>`;

/* Kiểm tra khóa riêng bằng WebCrypto (đúng định dạng PKCS#8 RSA, không thiếu/cụt ký tự) */
export async function checkPrivateKey(pem) {
  try {
    const b = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, ""); const bin = atob(b), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    await crypto.subtle.importKey("pkcs8", buf, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]); return { ok: true };
  } catch (e) { return { ok: false, msg: String((e && e.message) || e).slice(0, 120) }; }
}

export async function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Kết nối máy chủ", crumbs: devCrumb, sub: "Bật Firebase Admin (ví, cửa hàng, nạp tiền) và các dịch vụ khác cho website.", noindex: true });
  ctx.el.innerHTML = `
    <section class="formcard" id="cnStat"><span class="dsec">Máy chủ đang thấy gì?</span><div id="cnSt"><p class="sub-note">Đang kiểm tra…</p></div>
      <div class="form-acts"><button class="btn ghost" id="cnRe" type="button">Kiểm tra lại</button></div></section>
    <section class="formcard" id="cnForm"><span class="dsec">Bước 1 · Lấy khóa từ Firebase</span>
      <ol class="cn-steps"><li>Mở <a href="${esc(FB_LINK)}" target="_blank" rel="noopener noreferrer">Firebase → Cài đặt dự án → Tài khoản dịch vụ</a>.</li>
        <li>Bấm <b>Generate new private key</b> (Tạo khóa riêng tư mới) → tải về file <code translate="no">.json</code>.</li>
        <li>Mở file đó bằng Notepad, <b>chọn tất cả</b> và <b>dán vào ô dưới</b>. Không cần sửa gì — trang sẽ tự sửa lỗi định dạng.</li></ol>
      <div class="field"><label for="cnIn">Nội dung file khóa (JSON)</label><textarea id="cnIn" rows="7" spellcheck="false" autocomplete="off" autocapitalize="off" translate="no" placeholder='{ "type": "service_account", "project_id": "…", … }'></textarea>
        <p class="sub-note">Xử lý ngay trong trình duyệt này, không gửi đi đâu và không lưu lại. Khóa này là chìa khóa quản trị toàn bộ database: chỉ dán vào đây và vào Vercel, <b>không gửi cho ai</b> (kể cả vào khung chat).</p></div>
      <ul class="diag-l" id="cnRes" aria-live="polite"></ul></section>
    <section class="formcard" id="cnOut" hidden><span class="dsec">Bước 2 · Dán vào Vercel</span>
      <ol class="cn-steps"><li>Mở <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Vercel</a> → dự án của bạn → <b>Settings → Environment Variables</b>.</li>
        <li>Tên biến (gõ đúng): <code translate="no" id="cnName">FIREBASE_SERVICE_ACCOUNT</code> <button class="btn ghost sm" id="cnCopyName" type="button">Sao chép tên</button></li>
        <li>Giá trị: bấm <b>Sao chép giá trị</b> bên dưới rồi dán vào ô Value. Tick <b>Production</b> (nên tick cả Preview/Development). Bấm Save.</li></ol>
      <div class="field"><label>Kiểu giá trị</label><div class="seg" role="radiogroup" aria-label="Kiểu giá trị"><label><input type="radio" name="cnKind" value="b64" checked> Base64 <small>(khuyên dùng, không dính xuống dòng/nháy)</small></label><label><input type="radio" name="cnKind" value="json"> JSON một dòng</label></div></div>
      <div class="field"><textarea id="cnVal" rows="4" readonly spellcheck="false" translate="no" aria-label="Giá trị cần dán vào Vercel"></textarea></div>
      <div class="form-acts"><button class="btn ghost" id="cnClear" type="button">Xóa khỏi trang này</button><button class="btn primary" id="cnCopy" type="button">${ICO.copy || ""}Sao chép giá trị</button></div></section>
    <section class="formcard" id="cnGo" hidden><span class="dsec">Bước 3 · Redeploy rồi kiểm tra</span>
      <ol class="cn-steps"><li>Vercel → <b>Deployments</b> → bản mới nhất → dấu <b>⋯</b> → <b>Redeploy</b> (biến mới chỉ có hiệu lực sau khi deploy lại).</li>
        <li>Chờ deploy xong rồi bấm nút dưới — trang sẽ tự kiểm tra lại vài lần.</li></ol>
      <div class="form-acts"><button class="btn primary" id="cnWait" type="button">Tôi đã Redeploy xong — kiểm tra</button></div>
      <p class="sub-note">Nếu trước đây bạn lỡ dán khóa vào chat, ảnh chụp hay mã nguồn: vào Firebase → Tài khoản dịch vụ → <b>Quản lý quyền</b> → tab <b>Keys</b> → xóa khóa cũ.</p></section>`;
  const $ = s => ctx.el.querySelector(s);
  let alive = true, sa = null, vals = null, timer = 0; ctx.cleanup(() => { alive = false; clearTimeout(timer); const t = $("#cnIn"); if (t) t.value = ""; const v = $("#cnVal"); if (v) v.value = ""; });

  /* ── Trạng thái máy chủ ── */
  async function status() {
    const box = $("#cnSt"); if (!box) return null;
    const r = await api("status", {}, { token: false }); if (!alive) return null;
    if (!r.ok && r.code !== "not_configured") { box.innerHTML = `<ul class="diag-l">${row(false, "Không gọi được máy chủ (/api). Đang chạy thử cục bộ hay chưa deploy thư mục api/?")}</ul>`; return null; }
    if (!r.ok) { box.innerHTML = `<ul class="diag-l">${row(false, "Máy chủ chưa phản hồi đúng. Hãy Redeploy rồi thử lại.")}</ul>`; return null; }
    const items = [[!!r.admin, "Firebase Admin — ví, cửa hàng, đơn hàng, cộng tiền tự động"], [!!r.mail, "Gửi thư & xác minh 2 bước (cần Firebase Admin + BREVO_API_KEY + MAIL_FROM_EMAIL)"], [!!r.hook, "Webhook ngân hàng (SEPAY_API_KEY hoặc SEPAY_SECRET / CASSO_SECURE_TOKEN)"]];
    box.innerHTML = `<ul class="diag-l">${items.map(([ok, t]) => row(ok, t)).join("")}</ul>${(r.problems || []).length ? `<p class="sub-note"><b>Lý do máy chủ phát hiện:</b></p><ul class="diag-l">${r.problems.map(m => row(false, m)).join("")}</ul>` : ""}`;
    return r;
  }
  $("#cnRe").addEventListener("click", async e => { const b = e.currentTarget; b.disabled = true; await status(); b.disabled = false; toast("Đã kiểm tra lại."); });
  status();

  /* ── Phân tích khóa dán vào ── */
  let seq = 0, pt = 0;
  async function analyze() {
    const my = ++seq, text = $("#cnIn").value, res = $("#cnRes"), out = $("#cnOut"), go = $("#cnGo");
    sa = null; vals = null; out.hidden = true; go.hidden = true; $("#cnVal").value = "";
    if (!text.trim()) { res.innerHTML = ""; return; }
    const r = parseServiceAccount(text);
    if (!r.ok) { res.innerHTML = row(false, r.error.msg); return; }
    const lines = [row(true, "Đọc được khóa của dự án \"" + r.sa.project_id + "\" (" + r.sa.client_email + ")")];
    r.fixes.forEach(f => lines.push(row(true, f)));
    if (r.sa.project_id !== PROJECT) lines.push(row(false, "Khóa này thuộc dự án \"" + r.sa.project_id + "\" nhưng website dùng dự án \"" + PROJECT + "\". Hãy tải khóa từ đúng dự án."));
    const kc = await checkPrivateKey(r.sa.private_key); if (my !== seq || !alive) return;
    lines.push(kc.ok ? row(true, "Khóa riêng đúng định dạng (đã thử nạp thật bằng WebCrypto)") : row(false, "Khóa riêng không nạp được (" + (kc.msg || "hỏng") + "). Có thể bị cụt hoặc sửa nhầm — hãy dán lại nguyên file gốc."));
    res.innerHTML = lines.join("");
    if (!kc.ok || r.sa.project_id !== PROJECT) return;
    sa = r.sa; vals = toEnvValues(sa); out.hidden = false; go.hidden = false; showVal();
  }
  const kind = () => (ctx.el.querySelector('input[name="cnKind"]:checked') || {}).value || "b64";
  function showVal() { if (vals) $("#cnVal").value = kind() === "b64" ? vals.base64 : vals.json; }
  $("#cnIn").addEventListener("input", () => { clearTimeout(pt); pt = setTimeout(analyze, 250); });
  ctx.el.querySelectorAll('input[name="cnKind"]').forEach(r => r.addEventListener("change", showVal));
  $("#cnCopyName").addEventListener("click", () => copyText("FIREBASE_SERVICE_ACCOUNT").then(() => toast("Đã sao chép tên biến."), () => toast("Không sao chép được — hãy tự gõ tên biến.", "err")));
  $("#cnCopy").addEventListener("click", () => { if (!vals) return; copyText($("#cnVal").value).then(() => toast("Đã sao chép. Giờ dán vào ô Value trên Vercel."), () => { $("#cnVal").select(); toast("Hãy bấm Ctrl+C để sao chép.", "err"); }); });
  $("#cnClear").addEventListener("click", () => { $("#cnIn").value = ""; $("#cnVal").value = ""; sa = null; vals = null; $("#cnRes").innerHTML = ""; $("#cnOut").hidden = true; $("#cnGo").hidden = true; toast("Đã xóa khóa khỏi trang."); });

  /* ── Sau khi Redeploy: tự kiểm tra lại tối đa ~3 phút ── */
  $("#cnWait").addEventListener("click", async e => {
    const b = e.currentTarget; b.disabled = true; let n = 0;
    const tick = async () => { if (!alive) return; n++; b.textContent = "Đang kiểm tra… (" + n + ")"; const r = await status(); if (!alive) return;
      if (r && r.admin) { b.textContent = "Máy chủ đã nhận Firebase Admin ✓"; toast("Firebase Admin đã bật."); b.disabled = false; return; }
      if (n >= 12) { b.disabled = false; b.textContent = "Kiểm tra lại"; toast("Máy chủ chưa nhận. Xem mục \"Lý do máy chủ phát hiện\" ở trên.", "err"); return; }
      timer = setTimeout(tick, 15000); };
    tick();
  });
}
