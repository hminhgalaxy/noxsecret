/* Dev: liên kết ngân hàng nhận tiền + tạo mã QR bằng ngân hàng đã liên kết. */
import { openPopup } from "./popup.js";
import { popForm, popConfirm } from "./shoppop.js";
import { esc, toast, copyText, copyFx } from "./util.js";
import { ICO } from "./icons.js";
import { qrSvg } from "./qr.js";
import { BANKS, devBankSet, devBankReset, devBankQr, money } from "./shop.js";

/* cur = { bank, account, name, bin?, short? } (ngân hàng đang dùng) */
export function openBankLink(cur, onDone) {
  const known = BANKS.find(b => b[1] === (cur && cur.bin) || b[0] === (cur && cur.bank));
  const opts = BANKS.map(b => [b[1], b[0]]).concat([["other", "Ngân hàng khác (nhập mã BIN)"]]);
  return popForm({
    title: "Liên kết ngân hàng nhận tiền", headIcon: "bank", icon: "bank", tone: "info", ok: "Lưu & liên kết", okIcon: "check",
    message: "Mã QR nạp tiền của mọi người dùng sẽ trỏ vào tài khoản này. Nhập đúng thông tin — sai số tài khoản thì tiền sẽ chuyển nhầm nơi.",
    fields: [
      { id: "sel", label: "Ngân hàng", options: opts, value: known ? known[1] : "other" },
      { id: "bank", label: "Tên ngân hàng", value: cur && cur.bank || "", max: 40, required: true },
      { id: "bin", label: "Mã BIN (6 số)", value: cur && cur.bin || "", max: 6, inputmode: "numeric", hint: "Có sẵn khi chọn ngân hàng ở trên.", required: true },
      { id: "account", label: "Số tài khoản", value: cur && cur.account || "", max: 24, inputmode: "numeric", required: true },
      { id: "name", label: "Tên chủ tài khoản (không dấu)", value: cur && cur.name || "", max: 40, required: true, hint: "Ví dụ: NGUYEN VAN A. Phải trùng tên trên ngân hàng." }
    ],
    onMount: f => {
      const sel = f.querySelector('[data-f="sel"]'), bank = f.querySelector('[data-f="bank"]'), bin = f.querySelector('[data-f="bin"]');
      const sync = () => { const b = BANKS.find(x => x[1] === sel.value); if (b) { bank.value = b[0]; bin.value = b[1]; bin.readOnly = true; } else bin.readOnly = false; };
      sel.addEventListener("change", sync); if (known) { bin.readOnly = true; }
    },
    check: v => (!/^\d{6}$/.test(v.bin.trim()) ? "Mã BIN gồm đúng 6 chữ số." : !/^\d[\d .-]{4,24}$/.test(v.account.trim()) ? "Số tài khoản chỉ gồm chữ số (6–19 số)." : v.name.trim().length < 3 ? "Hãy nhập tên chủ tài khoản." : !v.bank.trim() ? "Hãy nhập tên ngân hàng." : ""),
    submit: async v => { const b = BANKS.find(x => x[1] === v.bin.trim()); const r = await devBankSet({ bin: v.bin.trim(), account: v.account, name: v.name, bank: v.bank, short: b ? b[2] : "" }); if (onDone) onDone(r); toast("Đã liên kết ngân hàng."); }
  });
}
export async function resetBank(onDone) {
  if (!(await popConfirm({ tone: "warn", title: "Gỡ liên kết ngân hàng?", message: "Hệ thống sẽ quay về tài khoản mặc định trong cấu hình máy chủ.", ok: "Gỡ liên kết" }))) return;
  try { const r = await devBankReset(); if (onDone) onDone(r); toast("Đã gỡ liên kết."); } catch (e) { toast(e.message, "err"); }
}

/* Tạo mã QR (số tiền tuỳ chọn + nội dung) bằng ngân hàng đã liên kết */
export function openDevQr() {
  const h = openPopup({ id: "devqr", variant: "sheet", wide: true, title: "Tạo mã QR chuyển khoản", icon: "qr" });
  h.setBody(`<div class="dq"><form class="dq-f" novalidate><div class="pf-2"><div class="field"><label for="dqA">Số tiền (₫)</label><span class="sp-in"><input id="dqA" inputmode="numeric" autocomplete="off" placeholder="Để trống = khách tự nhập"><i>₫</i></span></div>
      <div class="field"><label for="dqC">Nội dung chuyển khoản</label><input id="dqC" maxlength="25" autocomplete="off" placeholder="Ví dụ: DH0012"></div></div>
      <p class="form-error" id="dqE" role="alert"></p><div class="form-acts"><button class="btn primary" type="submit">${ICO.qr}Tạo mã QR</button></div></form><div class="dq-out" id="dqO" aria-live="polite"></div></div>`);
  const f = h.body.querySelector("form"), out = h.body.querySelector("#dqO"), er = h.body.querySelector("#dqE"), A = h.body.querySelector("#dqA");
  A.addEventListener("input", () => { const d = A.value.replace(/\D/g, "").slice(0, 11); A.value = d ? new Intl.NumberFormat("vi-VN").format(+d) : ""; });
  f.addEventListener("submit", async e => {
    e.preventDefault(); er.textContent = ""; const b = f.querySelector("[type=submit]"); b.disabled = true;
    try {
      const r = await devBankQr(A.value.replace(/\D/g, "") || 0, h.body.querySelector("#dqC").value);
      out.innerHTML = `<div class="tp-qr">${qrSvg(r.qr, { label: "Mã QR chuyển khoản" })}</div><dl class="tp-dl"><div><dt>Ngân hàng</dt><dd>${esc(r.bank.bank)}</dd></div><div><dt>Chủ tài khoản</dt><dd translate="no">${esc(r.bank.name)}</dd></div><div><dt>Số tài khoản</dt><dd translate="no"><code>${esc(r.bank.account)}</code></dd></div>${r.amount ? `<div><dt>Số tiền</dt><dd>${money(r.amount)}</dd></div>` : ""}${r.content ? `<div class="hot"><dt>Nội dung</dt><dd translate="no"><code>${esc(r.content)}</code></dd></div>` : ""}</dl>
        <div class="form-acts"><button class="btn soft sm" type="button" data-cp>${ICO.copy}<span>Sao chép chuỗi QR</span></button><button class="btn soft sm" type="button" data-svg>${ICO.download2}Tải ảnh QR</button></div>`;
      out.querySelector("[data-cp]").addEventListener("click", ev => copyText(r.qr).then(() => { copyFx(ev.currentTarget); toast("Đã sao chép chuỗi QR."); }));
      out.querySelector("[data-svg]").addEventListener("click", () => { const sv = out.querySelector(".tp-qr svg"); if (!sv) return; const x = new XMLSerializer().serializeToString(sv), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([x.includes("xmlns") ? x : x.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')], { type: "image/svg+xml" })); a.download = "qr-" + (r.content || "bank") + ".svg"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); });
    } catch (x) { er.textContent = x.message; } finally { b.disabled = false; }
  });
  return h;
}
