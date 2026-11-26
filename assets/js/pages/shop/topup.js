/* Trang nạp tiền: theo dõi một hóa đơn nạp từ lúc tạo đến khi tiền vào ví.
   Các bước: Tạo hóa đơn → Chuyển tiền → Gửi bill → Hoàn tất. Mọi trạng thái cập nhật trực tiếp, không cần tải lại trang. */
import { esc, fmtTime, toast, copyText, copyFx } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { shop, subscribeShop, startShop, money, INV_ST, invState, invOpen, openInvoice, cancelInvoice, sendBill, readInvFile, canUseWallet } from "../../lib/shop.js";
import { session } from "../../lib/auth.js";
import { fileToBill } from "../../lib/billimg.js";
import { popConfirm } from "../../lib/shoppop.js";

const STEPS = ["Tạo hóa đơn", "Chuyển tiền", "Gửi bill", "Hoàn tất"];
const STEP_OF = { creating: 0, ready: 1, bill: 2, crediting: 2, done: 3 };
export function mount(ctx) {
  startShop();
  ctx.setPage({ title: "Nạp tiền", sub: "Theo dõi hóa đơn nạp tiền của bạn.", noindex: true, crumbs: [{ label: "Ví của tôi", href: "/wallet" }] });
  ctx.el.innerHTML = `<div class="tp-page" id="tpP"><div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang tải…</span></div></div>`;
  const root = ctx.el.querySelector("#tpP");
  const want = ctx.query.get("i") || "";
  let qr = {}, bill = null, billBusy = false, billErr = "", lastKey = "";
  const uid = () => (session.user && session.user.uid) || "";
  const find = () => (shop.invs || []).find(x => x.id === want) || (want ? null : openInvoice() || (shop.invs || [])[0] || null);
  const stepper = st => { const at = STEP_OF[st] ?? -1, dead = at < 0;
    return `<ol class="tp-steps${dead ? " dead" : ""}" aria-label="Các bước">${STEPS.map((l, i) => `<li class="${!dead && i < at ? "done" : !dead && i === at ? "now" : ""}"><span>${!dead && i < at ? ICO.check : i + 1}</span><b>${l}</b></li>`).join("")}</ol>`; };
  const head = (v, st) => { const [lab, tone] = INV_ST[st]; return `<header class="tp-head"><div><small>Hóa đơn #${esc(String(v.id).slice(-6).toUpperCase())}</small><b class="tp-amt" translate="no">${money(v.amount)}</b></div><span class="od-st ${tone}">${esc(lab)}</span></header>`; };
  const body = (v, st) => {
    if (st === "creating") return `<div class="tp-msg"><span class="tp-spin" aria-hidden="true"></span><h3>Hóa đơn đang được tạo</h3><p>Chúng tôi đã nhận yêu cầu nạp <b>${money(v.amount)}</b>. Vui lòng <b>quay lại sau ít tiếng</b> — khi hóa đơn sẵn sàng, mã QR chuyển tiền sẽ xuất hiện ngay tại trang này và trong mục Ví của tôi.</p></div>
      <div class="tp-acts"><a class="btn soft" href="/wallet">${ICO.wallet}Về ví của tôi</a><button class="btn ghost" id="tpCancel" type="button">Hủy hóa đơn</button></div>`;
    if (st === "ready") return `<div class="tp-pay"><div class="tp-qr">${qr[v.id] ? `<img src="${qr[v.id]}" alt="Mã QR chuyển tiền cho hóa đơn này">` : `<span class="tp-spin" aria-hidden="true"></span>`}</div>
        <div class="tp-info"><h3>Quét mã QR để chuyển tiền</h3><p>Chuyển <b>đúng ${money(v.amount)}</b>. Nếu có ô nội dung chuyển khoản, hãy ghi mã bên dưới để chúng tôi đối chiếu nhanh hơn.</p>
          <div class="tp-code"><div><small>Mã hóa đơn</small><code translate="no">${esc(v.code)}</code></div><button class="btn soft sm" id="tpCp" type="button">${ICO.copy}<span>Sao chép</span></button></div>${v.note ? `<p class="tp-note">${esc(v.note)}</p>` : ""}</div></div>
      <section class="tp-bill" aria-labelledby="tpBq"><h3 id="tpBq">Chuyển tiền thành công?</h3><p>Vui lòng gửi <b>hình ảnh bill chuyển tiền</b> để chúng tôi xử lý hóa đơn cho bạn.</p>
        <label class="tp-drop${bill ? " has" : ""}" for="tpFile">${bill ? `<img src="${bill}" alt="Ảnh bill đã chọn">` : `${ICO.upload}<span>Chọn ảnh bill chuyển tiền</span><small>JPG, PNG hoặc WebP</small>`}</label><input type="file" id="tpFile" accept="image/jpeg,image/png,image/webp" hidden>
        <p class="form-error" role="alert">${esc(billErr)}</p>
        <div class="tp-acts"><button class="btn primary" id="tpSend" type="button"${bill && !billBusy ? "" : " disabled"}>${billBusy ? "Đang gửi…" : "Gửi ảnh bill"}</button><button class="btn ghost" id="tpCancel" type="button">Hủy hóa đơn</button></div></section>`;
    if (st === "bill" || st === "crediting") return `<div class="tp-msg ok"><span class="tp-spin" aria-hidden="true"></span><h3>Đã nhận ảnh bill của bạn</h3><p>Hóa đơn của bạn sẽ được xử lý trong ít phút. Bạn có thể rời trang này, số dư sẽ tự cập nhật khi tiền vào ví.</p></div><div class="tp-acts"><a class="btn soft" href="/wallet">${ICO.wallet}Về ví của tôi</a></div>`;
    if (st === "done") return `<div class="tp-msg ok"><span class="tp-done" aria-hidden="true">${ICO.check}</span><h3>Nạp tiền thành công</h3><p><b>${money(v.amount)}</b> đã được cộng vào ví của bạn.</p></div><div class="tp-acts"><a class="btn primary" href="/shop">${ICO.bag}Mua sắm ngay</a><a class="btn soft" href="/wallet">${ICO.wallet}Xem ví</a></div>`;
    if (st === "rejected") return `<div class="tp-msg bad"><span class="tp-done bad" aria-hidden="true">${ICO.x}</span><h3>Hóa đơn chưa được chấp nhận</h3><p>${v.reason ? esc(v.reason) : "Rất tiếc, hóa đơn này chưa được chấp nhận."} Nếu bạn đã chuyển tiền, hãy nhắn tin cho chúng tôi để được hỗ trợ.</p></div><div class="tp-acts"><button class="btn primary" id="tpNew" type="button">${ICO.plus}Tạo hóa đơn mới</button><a class="btn soft" href="/?chat=1">Nhắn tin hỗ trợ</a></div>`;
    return `<div class="tp-msg"><h3>${st === "expired" ? "Hóa đơn đã hết hạn" : "Hóa đơn đã được hủy"}</h3><p>Bạn có thể tạo một hóa đơn nạp mới bất cứ lúc nào.</p></div><div class="tp-acts"><button class="btn primary" id="tpNew" type="button">${ICO.plus}Tạo hóa đơn mới</button><a class="btn soft" href="/wallet">${ICO.wallet}Về ví</a></div>`;
  };
  const draw = () => {
    if (!canUseWallet()) { root.innerHTML = `<div class="statebox sm">${ICO.wallet}<p>Hãy xác minh email để dùng ví.</p></div>`; return; }
    if (shop.invs === null) return;
    const v = find();
    if (!v) { root.innerHTML = `<div class="statebox sm">${ICO.wallet}<p>Không tìm thấy hóa đơn nạp tiền.</p><button class="btn primary" id="tpNew" type="button">${ICO.plus}Nạp tiền</button><a class="btn ghost" href="/wallet">Về ví</a></div>`; wire(null); return; }
    const st = invState(v);
    if (st === "ready" && !qr[v.id]) { qr[v.id] = ""; readInvFile(uid(), v.id, "qr").then(d => { qr[v.id] = d; draw(); }); }
    const key = v.id + "|" + st + "|" + (v.upd || 0);
    if (key !== lastKey) { lastKey = key; if (st !== "ready") { bill = null; billErr = ""; } }
    root.innerHTML = `<article class="tp-card tp-${st}">${head(v, st)}${stepper(st)}<div class="tp-body">${body(v, st)}</div><footer class="tp-foot"><small>${esc(fmtTime(v.ts))}</small></footer></article>`;
    wire(v);
  };
  const wire = v => {
    const $ = s => root.querySelector(s);
    const nw = $("#tpNew"); if (nw) nw.addEventListener("click", () => import("../../lib/topup.js").then(m => m.openTopup()));
    if (!v) return;
    const cp = $("#tpCp"); if (cp) cp.addEventListener("click", () => copyText(v.code).then(() => { copyFx(cp); toast("Đã sao chép."); }).catch(() => toast("Không sao chép được.", "err")));
    const cc = $("#tpCancel"); if (cc) cc.addEventListener("click", async () => {
      if (!(await popConfirm({ tone: "warn", icon: "x", title: "Hủy hóa đơn này?", message: "Nếu bạn đã chuyển tiền, đừng hủy — hãy gửi ảnh bill. Bạn có thể tạo hóa đơn mới sau.", details: [["Số tiền", money(v.amount), "strong"]], ok: "Hủy hóa đơn", cancel: "Giữ lại" }))) return;
      cc.disabled = true; try { await cancelInvoice(v.id); toast("Đã hủy hóa đơn."); } catch (e) { cc.disabled = false; toast(e.message, "err"); }
    });
    const f = $("#tpFile"); if (f) f.addEventListener("change", async () => {
      const file = f.files && f.files[0]; if (!file) return; billErr = "";
      try { bill = await fileToBill(file); } catch (e) { bill = null; billErr = e.message; }
      draw();
    });
    const sd = $("#tpSend"); if (sd) sd.addEventListener("click", async () => {
      if (!bill || billBusy) return; billBusy = true; billErr = ""; draw();
      try { await sendBill(v.id, bill); bill = null; toast("Đã gửi ảnh bill.", "ok"); } catch (e) { billErr = e.message; }
      billBusy = false; draw();
    });
  };
  draw();
  const off = subscribeShop(t => { if (t === "invs" || t === "wallet") draw(); });
  return () => off();
}
