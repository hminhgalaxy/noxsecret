/* Chi tiết đơn hàng: mã đơn, thời gian mua, số tiền, trạng thái, và với từng món: Xem trực tiếp · Tải file về · Chia sẻ. */
import { openPopup } from "./popup.js";
import { esc, toast, copyText, copyFx, fmtTime } from "./util.js";
import { ICO } from "./icons.js";
import { money } from "./shop.js";
import { deliveryHTML, wireCopy } from "./cart.js";

export const ORDER_ST = { paid: ["Thành công", "ok"], pending: ["Đang xử lý", "warn"], refunded: ["Đã hoàn tiền", "bad"] };
export const orderCode = o => "#" + String(o.id).slice(-8).toUpperCase();
const slug = s => String(s || "file").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "file";
const deliveryOf = (o, itemId) => (o.delivery || []).find(d => d.id === itemId) || null;
export const contentOf = d => (!d ? "" : d.lines ? d.lines.join("\n") : d.text ? String(d.text) : "");
export const canOpen = (o, it) => o.status === "paid" && !!contentOf(deliveryOf(o, it.id));
export function receiptText(o, it) {
  const [st] = ORDER_ST[o.status] || [""];
  return ["Đơn hàng " + orderCode(o) + " — SKIBIDI SCRIPT WEB", (it ? it.name + " × " + it.qty + " — " + money(it.price * it.qty) : (o.items || []).map(i => i.name + " × " + i.qty).join(", ") + " — " + money(o.total)), "Thời gian: " + fmtTime(o.paidAt || o.ts), "Trạng thái: " + st, location.origin + "/"].join("\n");
}
export function downloadItem(o, it) {
  const c = contentOf(deliveryOf(o, it.id)); if (!c) return false;
  const blob = new Blob([c + "\n"], { type: "text/plain;charset=utf-8" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = slug(it.name) + "-" + orderCode(o).slice(1) + ".txt"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
/* Chia sẻ BIÊN LAI (không kèm nội dung bí mật như key / tài khoản) */
export async function shareReceipt(o, it) {
  const text = receiptText(o, it), title = "Đơn hàng " + orderCode(o);
  try { if (navigator.share) { await navigator.share({ title, text }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await copyText(text); toast("Đã sao chép biên lai đơn hàng."); } catch (_) { toast("Không sao chép được.", "err"); }
}
export function openLive(o, it) {
  const d = deliveryOf(o, it.id);
  const h = openPopup({ id: "live", variant: "sheet", wide: true, title: it.name, icon: "eye" });
  h.setBody(`<div class="ol"><div class="ol-meta"><span class="od-st ok">Thành công</span><small translate="no">${esc(orderCode(o))} · ${esc(fmtTime(o.paidAt || o.ts))}</small></div>${deliveryHTML(d ? [d] : [])}
    <p class="ol-warn">${ICO.info}<span>Đây là nội dung riêng của bạn — đừng gửi cho người lạ.</span></p>
    <div class="form-acts"><button class="btn soft" type="button" data-dl>${ICO.download2}Tải file về</button><button class="btn primary" type="button" data-x>Đóng</button></div></div>`);
  wireCopy(h.body); h.body.querySelector("[data-x]").addEventListener("click", () => h.close());
  h.body.querySelector("[data-dl]").addEventListener("click", () => { if (!downloadItem(o, it)) toast("Món này chưa có nội dung để tải.", "err"); });
  return h;
}
export function openOrder(o) {
  const [lab, tone] = ORDER_ST[o.status] || ["", ""];
  const h = openPopup({ id: "order", variant: "sheet", wide: true, title: "Đơn hàng " + orderCode(o), icon: "receipt" });
  const row = it => { const ok = canOpen(o, it), manual = o.status === "paid" && (deliveryOf(o, it.id) || {}).manual;
    return `<li class="oi" data-id="${esc(it.id)}"><div class="oi-h"><b translate="no">${esc(it.name)}</b><em>× ${it.qty}</em><span>${money(it.price * it.qty)}</span></div>
      <div class="oi-acts">${ok ? `<button class="btn primary sm" type="button" data-live>${ICO.eye}Xem trực tiếp</button><button class="btn soft sm" type="button" data-dl>${ICO.download2}Tải file về</button>` : manual ? `<span class="oi-wait">${ICO.info}Dev sẽ giao tay qua Hộp thư</span>` : ""}<button class="btn ghost sm" type="button" data-share>${ICO.share}Chia sẻ</button></div></li>`; };
  h.setBody(`<div class="od-pop"><div class="od-sum"><div><small>Mã đơn hàng</small><b translate="no">${esc(orderCode(o))}</b><button class="btn soft sm tp-copy" type="button" data-code>${ICO.copy}<span>Sao chép</span></button></div>
      <div><small>Thời gian mua</small><b>${esc(fmtTime(o.paidAt || o.ts))}</b></div><div><small>Số tiền</small><b>${money(o.total)}</b></div><div><small>Trạng thái</small><span class="od-st ${tone}">${lab}</span></div></div>
    <ul class="oi-list">${(o.items || []).map(row).join("")}</ul>
    <div class="form-acts"><button class="btn ghost" type="button" data-sh>${ICO.share}Chia sẻ biên lai</button><button class="btn primary" type="button" data-x>Xong</button></div></div>`);
  const b = h.body, it = id => (o.items || []).find(x => x.id === id);
  b.addEventListener("click", e => {
    const li = e.target.closest(".oi"), item = li && it(li.dataset.id);
    if (e.target.closest("[data-live]") && item) openLive(o, item);
    else if (e.target.closest("[data-dl]") && item) { if (!downloadItem(o, item)) toast("Món này chưa có nội dung để tải.", "err"); }
    else if (e.target.closest("[data-share]") && item) shareReceipt(o, item);
    else if (e.target.closest("[data-sh]")) shareReceipt(o, null);
    else if (e.target.closest("[data-code]")) { const bt = e.target.closest("[data-code]"); copyText(orderCode(o).slice(1)).then(() => { copyFx(bt); toast("Đã sao chép mã đơn hàng."); }).catch(() => toast("Không sao chép được.", "err")); }
    else if (e.target.closest("[data-x]")) h.close();
  });
  return h;
}
