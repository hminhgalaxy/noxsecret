/* Dev · Nạp tiền: nhận yêu cầu nạp của khách → gửi mã QR → khi khách gửi bill thì "Nhập tiền" bằng mã code + mã bảo mật.
   Số tiền và id của hóa đơn do máy chủ giữ: dev không thể nhập số khác hay đổi id, và tiền được trừ từ chính ví dev. */
import { esc, toast, fmtTime, copyText, copyFx } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { db } from "../../lib/firebase.js";
import { shop, subscribeShop, startShop, startDevInv, loadWalletInfo, money, balance, readInvFile, devInvAccept, devInvReject, devInvCredit } from "../../lib/shop.js";
import { fileToBill } from "../../lib/billimg.js";
import { openPopup } from "../../lib/popup.js";
import { popConfirm, popForm } from "../../lib/shoppop.js";
import { locked, devCrumb } from "./shared.js";

const ST = { creating: ["Chờ nhận", "warn"], ready: ["Chờ khách chuyển", "warn"], bill: ["Có bill, chờ nhập tiền", "bad"], crediting: ["Đang gửi tiền", "warn"], done: ["Hoàn tất", "ok"], rejected: ["Đã từ chối", ""], cancelled: ["Khách đã hủy", ""], expired: ["Hết hạn", ""] };
const userLabel = uid => { const u = (S.store.users || []).find(x => x.uid === uid); return u ? (u.email || u.name || uid) : uid; };
const short = id => String(id).slice(-6).toUpperCase();

export function mount(ctx) {
  if (locked(ctx)) return;
  startShop(); startDevInv(); loadWalletInfo().catch(() => {});
  ctx.setPage({ title: "Nạp tiền", sub: "Nhận yêu cầu nạp của khách, gửi mã QR và nhập tiền khi có bill.", crumbs: devCrumb, noindex: true });
  let tab = ctx.query.get("t") === "pay" ? "pay" : "req", flt = "todo", pick = ctx.query.get("i") || "", done = null, dead = false;
  ctx.el.innerHTML = `<section class="dv-card tpd-bal"><div><small>Số dư ví dev</small><b id="tdB">…</b></div><p>Tiền nạp cho khách được trừ từ ví này. Bạn không thể gửi quá số dư và không thể sửa số tiền của hóa đơn.</p></section>
    <div class="chips dv-tabs" id="tdT" role="tablist"><button type="button" role="tab" data-t="req">Yêu cầu nạp<span class="cnt" id="tdN" hidden></span></button><button type="button" role="tab" data-t="pay">Nhập tiền</button></div><div id="tdBody"></div>`;
  const $ = s => ctx.el.querySelector(s), body = $("#tdBody");
  const bal = () => { $("#tdB").textContent = shop.wallet ? money(balance()) : "…"; const n = (shop.devq || []).filter(r => r.status === "creating" || r.status === "bill").length, c = $("#tdN"); c.hidden = !n; c.textContent = n; };

  /* ───── Yêu cầu ───── */
  const drawReq = () => {
    const L = shop.devq;
    const rows = (L || []).filter(r => flt === "all" || ["creating", "ready", "bill", "crediting"].includes(r.status));
    body.innerHTML = `<div class="chips" id="tdF"><button type="button" data-f="todo" class="${flt === "todo" ? "on" : ""}">Đang mở</button><button type="button" data-f="all" class="${flt === "all" ? "on" : ""}">Tất cả</button></div>
      <div class="dlist" id="tdL">${L === null ? '<div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang tải…</span></div>' : rows.length ? rows.map(r => { const [lab, tone] = ST[r.status] || [r.status, ""];
        return `<button type="button" class="drow tpd-row" data-id="${esc(r.id)}"><span class="nm"><span translate="no">${esc(userLabel(r.uid))}</span><small>#${esc(short(r.id))} · ${esc(fmtTime(r.ts))}</small></span><span class="od-st ${tone}">${lab}</span><b>${money(r.amount)}</b></button>`; }).join("") : `<div class="statebox sm">${ICO.wallet}<p>${flt === "todo" ? "Chưa có yêu cầu nạp nào đang mở." : "Chưa có yêu cầu nào."}</p></div>`}</div>`;
    body.querySelector("#tdF").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { flt = b.dataset.f; drawReq(); } });
    body.querySelector("#tdL").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b) openReq(b.dataset.id); });
  };
  const openReq = async id => {
    const q = (shop.devq || []).find(r => r.id === id); if (!q) return;
    const [lab, tone] = ST[q.status] || [q.status, ""];
    const h = openPopup({ id: "tdreq", variant: "sheet", wide: true, title: "Yêu cầu nạp #" + short(id), icon: "receipt" });
    h.setBody(`<div class="tpd-pop"><dl class="sp-dl"><div><dt>Khách</dt><dd translate="no">${esc(userLabel(q.uid))}</dd></div><div><dt>Số tiền</dt><dd class="strong" translate="no">${money(q.amount)}</dd></div><div><dt>Trạng thái</dt><dd><span class="od-st ${tone}">${lab}</span></dd></div><div><dt>Thời gian</dt><dd>${esc(fmtTime(q.ts))}</dd></div></dl><div id="tdX"><div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang tải…</span></div></div></div>`);
    const X = h.body.querySelector("#tdX");
    const rej = () => popForm({ title: "Từ chối yêu cầu", headIcon: "x", icon: "warn", tone: "warn", message: "Khách sẽ thấy lý do này.", ok: "Từ chối", fields: [{ id: "reason", label: "Lý do", type: "textarea", max: 200, rows: 3, required: true }], check: x => (!String(x.reason).trim() ? "Hãy nhập lý do." : ""), submit: async x => { await devInvReject(id, String(x.reason).trim()); } }).then(v => { if (v) { toast("Đã từ chối yêu cầu."); h.close(true); } });
    if (q.status === "creating" || q.status === "ready") {
      let qr = "";
      X.innerHTML = `<form class="tpf" id="tdA" novalidate><p class="tpf-lead">${q.status === "creating" ? "Chấp nhận yêu cầu bằng cách gửi mã QR để khách chuyển tiền." : "Đã gửi QR. Bạn có thể gửi lại QR khác nếu cần."}</p>
        <label class="tp-drop" for="tdQ" id="tdQL">${ICO.upload}<span>Chọn ảnh mã QR</span><small>JPG, PNG hoặc WebP</small></label><input id="tdQ" type="file" accept="image/jpeg,image/png,image/webp" hidden>
        <div class="field"><label for="tdNote">Ghi chú cho khách (không bắt buộc)</label><input id="tdNote" maxlength="200" autocomplete="off" placeholder="Ví dụ: chuyển đúng số tiền, ghi mã hóa đơn"></div>
        <p class="form-error" id="tdE" role="alert"></p><div class="form-acts"><button class="btn danger" type="button" id="tdR">Từ chối</button><button class="btn primary" type="submit" id="tdG" disabled>Chấp nhận &amp; gửi QR</button></div></form>`;
      const f = X.querySelector("#tdQ"), err = X.querySelector("#tdE"), go = X.querySelector("#tdG");
      f.addEventListener("change", async () => { err.textContent = ""; const file = f.files && f.files[0]; if (!file) return; try { qr = await fileToBill(file, [900, 720, 560, 420]); X.querySelector("#tdQL").classList.add("has"); X.querySelector("#tdQL").innerHTML = `<img src="${qr}" alt="Ảnh QR đã chọn">`; go.disabled = false; } catch (e) { qr = ""; go.disabled = true; err.textContent = e.message; } });
      X.querySelector("#tdR").addEventListener("click", rej);
      X.querySelector("#tdA").addEventListener("submit", async e => { e.preventDefault(); if (!qr) return; go.disabled = true; go.textContent = "Đang gửi…"; try { await devInvAccept(id, qr, X.querySelector("#tdNote").value.trim()); toast("Đã gửi mã QR cho khách."); h.close(true); } catch (x) { go.disabled = false; go.textContent = "Chấp nhận & gửi QR"; err.textContent = x.message; } });
    } else if (q.status === "bill" || q.status === "crediting") {
      const img = await readInvFile(q.uid, id, "bill");
      X.innerHTML = `<div class="tpd-bill">${img ? `<img src="${img}" alt="Ảnh bill khách gửi">` : '<p class="sub-note">Không đọc được ảnh bill.</p>'}</div><div class="form-acts"><button class="btn danger" type="button" id="tdR">Từ chối</button><button class="btn primary" type="button" id="tdP">${ICO.wallet}Nhập tiền</button></div>`;
      X.querySelector("#tdR").addEventListener("click", rej);
      X.querySelector("#tdP").addEventListener("click", () => { pick = id; h.close(true); setTab("pay"); });
    } else X.innerHTML = `<p class="sub-note">Yêu cầu này đã kết thúc.</p>`;
  };

  /* ───── Nhập tiền ───── */
  const drawPay = async () => {
    const L = (shop.devq || []).filter(r => r.status === "bill" || r.status === "crediting");
    if (shop.devq === null) { body.innerHTML = '<div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang tải…</span></div>'; return; }
    if (done) { const d = done; body.innerHTML = `<section class="dv-card tpd-ok"><span class="tp-done" aria-hidden="true">${ICO.check}</span><h3>Đã gửi tiền thành công</h3><p><b>${money(d.amount)}</b> đã được chuyển vào ví của <b translate="no">${esc(d.user)}</b>. Số dư ví dev còn lại: <b>${d.balance == null ? "…" : money(d.balance)}</b>.</p><button class="btn primary" id="tdAgain" type="button">Nhập tiền tiếp</button></section>`; body.querySelector("#tdAgain").addEventListener("click", () => { done = null; drawPay(); }); return; }
    if (!L.length) { body.innerHTML = `<div class="statebox sm">${ICO.wallet}<p>Chưa có hóa đơn nào đã có bill. Khi khách gửi ảnh bill, hóa đơn sẽ xuất hiện ở đây.</p></div>`; return; }
    if (!L.some(r => r.id === pick)) pick = L[0].id;
    const q = L.find(r => r.id === pick); let inv = null, sec = "";
    body.innerHTML = `<section class="dv-card tpd-pay"><h3>Nhập tiền</h3><form class="pf tpd-form" id="tdF" novalidate autocomplete="off">
      <div class="field"><label for="tdSel">Hóa đơn</label><select id="tdSel">${L.map(r => `<option value="${esc(r.id)}"${r.id === pick ? " selected" : ""}>#${esc(short(r.id))} — ${esc(userLabel(r.uid))} — ${money(r.amount)}</option>`).join("")}</select></div>
      <div class="pf-2"><div class="field"><label for="tdId">ID hóa đơn <i class="lock">${ICO.shield}khóa</i></label><input id="tdId" readonly value="${esc(q.id)}" translate="no"></div>
        <div class="field"><label for="tdAm">Số tiền <i class="lock">${ICO.shield}khóa</i></label><input id="tdAm" readonly value="${money(q.amount)}" translate="no"></div></div>
      <div class="tpd-have" id="tdH"><div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang lấy mã…</span></div></div>
      <div class="pf-2"><div class="field"><label for="tdC">Mã code</label><input id="tdC" autocomplete="off" spellcheck="false" placeholder="Nhập mã code" translate="no"></div>
        <div class="field"><label for="tdS">Mã bảo mật</label><input id="tdS" autocomplete="off" spellcheck="false" placeholder="Nhập mã bảo mật" translate="no"></div></div>
      <p class="form-error" id="tdE" role="alert"></p>
      <div class="form-acts"><button class="btn primary" type="submit" id="tdGo">${ICO.arrow}Chuyển tiền cho khách</button></div></form></section>`;
    const sel = body.querySelector("#tdSel"); sel.addEventListener("change", () => { pick = sel.value; drawPay(); });
    (async () => { try { inv = (await db.ref("nox_inv/" + q.uid + "/" + q.id).once("value")).val(); sec = (await db.ref("nox_invsec/" + q.id + "/sec").once("value")).val() || ""; } catch (_) {}
      if (dead || pick !== q.id) return; const H = body.querySelector("#tdH"); if (!H) return;
      H.innerHTML = inv ? `<div><small>Mã code</small><code translate="no">${esc(inv.code)}</code><button class="btn soft sm" data-cp="${esc(inv.code)}" type="button">${ICO.copy}</button></div><div><small>Mã bảo mật</small><code translate="no">${esc(sec)}</code><button class="btn soft sm" data-cp="${esc(sec)}" type="button">${ICO.copy}</button></div>` : '<p class="sub-note">Không đọc được mã của hóa đơn này.</p>';
      H.addEventListener("click", e => { const b = e.target.closest("[data-cp]"); if (b) copyText(b.dataset.cp).then(() => { copyFx(b); toast("Đã sao chép."); }); }); })();
    body.querySelector("#tdF").addEventListener("submit", async e => {
      e.preventDefault(); const err = body.querySelector("#tdE"); err.textContent = "";
      const code = body.querySelector("#tdC").value.trim(), sc = body.querySelector("#tdS").value.trim();
      if (!code || !sc) { err.textContent = "Hãy nhập cả mã code và mã bảo mật."; return; }
      if ((shop.wallet ? balance() : 0) < q.amount) { err.textContent = "Số dư ví dev không đủ để gửi " + money(q.amount) + "."; return; }
      if (!(await popConfirm({ tone: "warn", icon: "wallet", title: "Chuyển tiền cho khách?", message: "Tiền được trừ từ ví dev và cộng vào ví khách. Không thể hoàn tác.", details: [["Khách", userLabel(q.uid)], ["Hóa đơn", "#" + short(q.id)], ["Số tiền", money(q.amount), "strong"]], ok: "Chuyển tiền" }))) return;
      const go = body.querySelector("#tdGo"); go.disabled = true;
      try { const r = await devInvCredit(q.id, q.amount, code, sc); done = { amount: q.amount, user: userLabel(q.uid), balance: r.balance }; toast("Đã gửi tiền thành công.", "ok"); drawPay(); }
      catch (x) { go.disabled = false; err.textContent = x.message; }
    });
  };

  const setTab = t => { tab = t; ctx.el.querySelectorAll("#tdT [data-t]").forEach(b => { b.classList.toggle("on", b.dataset.t === t); b.setAttribute("aria-selected", String(b.dataset.t === t)); }); draw(); };
  const draw = () => (tab === "pay" ? drawPay() : drawReq());
  $("#tdT").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (b) setTab(b.dataset.t); });
  setTab(tab); bal();
  const off = subscribeShop(t => { if (t === "wallet") bal(); else if (t === "devq") { bal(); if (tab === "req" || (tab === "pay" && !done && !document.activeElement?.closest?.("#tdF"))) draw(); } });
  return () => { dead = true; off(); };
}
