/* Popup "Nạp tiền": chọn số tiền cố định → tạo mã VietQR kèm số tiền + nội dung → chờ tiền vào ví (cộng tự động qua webhook). */
import { openPopup } from "./popup.js";
import { esc, toast, copyText, copyFx } from "./util.js";
import { ICO } from "./icons.js";
import { qrSvg } from "./qr.js";
import { session } from "./auth.js";
import { shop, subscribeShop, balance, canUseWallet, loadWalletInfo, createTopup, money } from "./shop.js";
import { navigate } from "./router.js";

const PRESETS = [20000, 50000, 100000, 200000, 500000, 1000000];
const copyBtn = (v, label = "Sao chép") => `<button class="btn soft sm tp-copy" type="button" data-copy="${esc(v)}">${ICO.copy}<span>${label}</span></button>`;

export async function openTopup(opts = {}) {
  if (!session.user || session.isGuest) { toast("Hãy đăng nhập để nạp tiền.", "err"); navigate("/login?next=" + encodeURIComponent(location.pathname)); return null; }
  if (!canUseWallet()) { toast("Hãy xác minh email trước khi nạp tiền.", "err"); return null; }
  let off = () => {}, amount = Math.max(0, Math.floor(opts.amount || 0)), info = null, base = 0, stop = false;
  const h = openPopup({ id: "topup", variant: "sheet", wide: true, title: "Nạp tiền vào ví", icon: "wallet", onClose: () => { stop = true; off(); } });

  const step1 = (err = "") => {
    h.setBody(`<div class="tp">
      <button class="tp-method on" type="button" aria-pressed="true"><span class="tp-m-ico">${ICO.bank}</span><span class="tp-m-txt"><b>Chuyển khoản ngân hàng</b><small>${esc(info ? info.bank.bank : "Techcombank")} · Quét mã QR · Tiền vào ví sau khoảng 30–60 giây</small></span><span class="tp-m-tick">${ICO.check}</span></button>
      <p class="tp-lab">Chọn số tiền</p>
      <div class="tp-amts" role="group" aria-label="Số tiền">${PRESETS.map(v => `<button class="tp-amt${v === amount ? " on" : ""}" type="button" data-v="${v}">${money(v)}</button>`).join("")}</div>
      <label class="tp-inp"><span class="tp-lab">Hoặc nhập số tiền khác</span><span class="tp-box"><input id="tpA" inputmode="numeric" autocomplete="off" placeholder="Ví dụ 150.000" value="${amount && !PRESETS.includes(amount) ? new Intl.NumberFormat("vi-VN").format(amount) : ""}"><i>₫</i></span></label>
      <p class="tp-hint">Từ ${money(info ? info.min : 10000)} đến ${money(info ? info.max : 50000000)}, làm tròn đến nghìn đồng.</p>
      <p class="form-error tp-err" id="tpE" role="alert">${esc(err)}</p>
      <div class="form-acts"><button class="btn primary" id="tpGo" type="button">${ICO.qr}Tạo mã QR</button></div>
    </div>`);
    const box = h.body, inp = box.querySelector("#tpA");
    box.querySelectorAll(".tp-amt").forEach(b => b.addEventListener("click", () => { amount = +b.dataset.v; inp.value = ""; box.querySelectorAll(".tp-amt").forEach(x => x.classList.toggle("on", x === b)); box.querySelector("#tpE").textContent = ""; }));
    inp.addEventListener("input", () => { const d = inp.value.replace(/\D/g, "").slice(0, 9); amount = +d || 0; inp.value = d ? new Intl.NumberFormat("vi-VN").format(+d) : ""; box.querySelectorAll(".tp-amt").forEach(x => x.classList.toggle("on", +x.dataset.v === amount)); box.querySelector("#tpE").textContent = ""; });
    const go = box.querySelector("#tpGo");
    go.addEventListener("click", async () => {
      const lo = info ? info.min : 10000, hi = info ? info.max : 50000000;
      if (!(amount >= lo && amount <= hi) || amount % 1000) { box.querySelector("#tpE").textContent = "Số tiền từ " + money(lo) + " đến " + money(hi) + ", làm tròn đến nghìn đồng."; return; }
      go.disabled = true; go.classList.add("busy");
      try { const r = await createTopup(amount); step2(r); } catch (e) { go.disabled = false; go.classList.remove("busy"); box.querySelector("#tpE").textContent = e.message; }
    });
  };

  const step2 = r => {
    base = balance();
    h.setBody(`<div class="tp tp2">
      <div class="tp-qrwrap"><div class="tp-qr" aria-live="polite">${qrSvg(r.qr, { label: "Mã QR chuyển khoản " + money(r.amount) })}</div><p class="tp-scan">Mở app ngân hàng → Quét mã QR</p></div>
      <div class="tp-info">
        <div class="tp-amount"><small>Số tiền</small><b>${money(r.amount)}</b></div>
        <dl class="tp-dl">
          <div><dt>Ngân hàng</dt><dd>${esc(r.bank.bank)}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd translate="no">${esc(r.bank.name)}</dd></div>
          <div><dt>Số tài khoản</dt><dd translate="no"><code>${esc(r.bank.account)}</code>${copyBtn(r.bank.account)}</dd></div>
          <div class="hot"><dt>Nội dung chuyển khoản</dt><dd translate="no"><code>${esc(r.code)}</code>${copyBtn(r.code)}</dd></div>
        </dl>
      </div>
      <p class="tp-wait" id="tpW" role="status"><i class="tp-spin" aria-hidden="true"></i><span>Đang chờ tiền vào ví… thường mất 30–60 giây sau khi chuyển.</span></p>
      <p class="tp-note">${ICO.info}<span>Nội dung chuyển khoản đã được điền sẵn khi quét QR. Nếu chuyển tay, hãy nhập <b>đúng mã ở trên</b>, không thêm bớt ký tự — mã này là của riêng tài khoản bạn.</span></p>
      <div class="form-acts"><button class="btn ghost" id="tpBack" type="button">Đổi số tiền</button><button class="btn soft" id="tpClose" type="button">Đóng</button></div>
    </div>`);
    const box = h.body;
    box.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", () => copyText(b.dataset.copy).then(() => { copyFx(b); toast("Đã sao chép."); }).catch(() => toast("Không sao chép được.", "err"))));
    box.querySelector("#tpBack").addEventListener("click", () => { off(); step1(); });
    box.querySelector("#tpClose").addEventListener("click", () => h.close());
    off(); off = subscribeShop(t => { if (stop || t !== "wallet" || !shop.wallet) return; const got = balance() - base; if (got > 0) { off(); done(got); } });
  };

  const done = got => {
    h.setBody(`<div class="tp tp-ok"><span class="tp-okico">${ICO.check}</span><h3>Nạp tiền thành công</h3><p class="tp-got">+${money(got)}</p><p>Số dư hiện tại: <b>${money(balance())}</b></p>
      <div class="form-acts"><a class="btn ghost" href="/wallet" data-link>Xem ví</a><button class="btn primary" id="tpOk" type="button">Xong</button></div></div>`);
    h.body.querySelector("#tpOk").addEventListener("click", () => h.close());
    h.body.querySelector("[data-link]").addEventListener("click", () => h.close(true));
    toast("Đã cộng " + money(got) + " vào ví.");
  };

  h.setBody('<div class="tp"><p class="tp-wait"><i class="tp-spin" aria-hidden="true"></i><span>Đang tải…</span></p></div>');
  try { info = await loadWalletInfo(); } catch (e) { h.setBody(`<div class="tp"><div class="statebox err">${ICO.warn}<p>${esc(e.message)}</p></div><div class="form-acts"><button class="btn soft" id="tpClose" type="button">Đóng</button></div></div>`); h.body.querySelector("#tpClose").addEventListener("click", () => h.close()); return h; }
  /* chờ số dư tải xong để tính đúng "tiền vừa vào" */
  for (let i = 0; i < 40 && !shop.wallet && !stop; i++) await new Promise(r => setTimeout(r, 100));
  if (!stop) step1();
  return h;
}
