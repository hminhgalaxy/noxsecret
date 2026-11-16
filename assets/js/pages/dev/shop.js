/* Dev · Cửa hàng: hàng hóa (ảnh, giá, số lượng, mục lục, nội dung giao), mục lục, đơn hàng, nạp tiền & ví. */
import { esc, toast, fmtTime, copyText } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { db } from "../../lib/firebase.js";
import { shop, subscribeShop, startShop, money, signedMoney, MODES, normProduct, catList, catName, devAdjust, devAssign, devRefund, devDeliver, devShopStatus } from "../../lib/shop.js";
import { fileToItemImage } from "../../lib/avatar.js";
import { openPopup } from "../../lib/popup.js";
import { popConfirm, popForm } from "../../lib/shoppop.js";
import { openBankLink, resetBank, openDevQr } from "../../lib/bankpop.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";

const TABS = [["items", "Sản phẩm"], ["cats", "Mục lục"], ["orders", "Đơn hàng"], ["money", "Nạp tiền & ví"]];
const HOOK_ST = { credited: ["Đã cộng", "ok"], unmatched: ["Chưa khớp", "warn"], processing: ["Đang xử lý", "warn"], ignored: ["Bỏ qua", ""] };
const MAXIMG = 4;
const ref = p => db.ref(p);
const userOf = uid => (S.store.users || []).find(u => u.uid === uid);
const userLabel = uid => { const u = userOf(uid); return u ? (u.email || u.name || uid) : uid; };

export function mount(ctx) {
  if (locked(ctx)) return;
  startShop();
  ctx.setPage({ title: "Cửa hàng", sub: "Thêm hàng, ảnh, số lượng, giá; quản lý mục lục, đơn hàng và tiền nạp.", crumbs: devCrumb, noindex: true });
  let tab = "items", orders = null, hooks = null, status = null;
  ctx.el.innerHTML = `<div class="chips dv-tabs" id="dvT" role="tablist">${TABS.map(([v, l]) => `<button type="button" role="tab" data-t="${v}" class="${v === tab ? "on" : ""}" aria-selected="${v === tab}">${l}</button>`).join("")}</div><div id="dvB"></div>`;
  const body = ctx.el.querySelector("#dvB");
  const offs = [];
  const listen = (path, cb) => { const r = ref(path), h = r.on("value", s => cb(s.val()), () => cb({})); offs.push(() => r.off("value", h)); };
  listen("nox_orders", v => { orders = []; Object.keys(v || {}).forEach(u => Object.keys(v[u] || {}).forEach(o => orders.push({ uid: u, id: o, ...v[u][o] }))); orders.sort((a, b) => (b.ts || 0) - (a.ts || 0)); if (tab === "orders") draw(); });
  listen("nox_bankhook", v => { hooks = Object.keys(v || {}).map(k => ({ key: k, ...v[k] })).sort((a, b) => (b.ts || 0) - (a.ts || 0)); if (tab === "money") draw(); });
  devShopStatus().then(r => { status = r; if (tab === "money") draw(); }).catch(e => { status = { err: e.message }; if (tab === "money") draw(); });

  /* ───── Sản phẩm ───── */
  const drawItems = () => {
    const L = shop.items;
    body.innerHTML = `<div class="dv-bar"><span class="dsec">${L ? L.length : 0} sản phẩm</span><button class="btn primary sm" id="addP" type="button">${ICO.plus}Thêm sản phẩm</button></div>
      <div class="dlist" id="pl">${L === null ? '<p class="sub-note">Đang tải…</p>' : L.length ? L.map(p => `<div class="drow dv-p${p.active ? "" : " off"}" data-id="${esc(p.id)}"><span class="dv-th">${p.img ? `<img src="${esc(p.img)}" alt="">` : ICO.bag}</span>
        <span class="nm"><span translate="no">${esc(p.name)}</span> ${p.active ? "" : '<span class="badge">Đang ẩn</span>'}<small>${money(p.price)} · ${p.stock === null ? "Không giới hạn" : "Kho " + p.stock} · Đã bán ${p.sold}${p.cat && catName(p.cat) ? " · " + esc(catName(p.cat)) : ""}</small></span>
        <button class="ib" type="button" data-vis aria-label="${p.active ? "Ẩn sản phẩm" : "Hiện sản phẩm"}">${p.active ? ICO.eye : ICO.eyeOff}</button><button class="ib" type="button" data-ed aria-label="Sửa sản phẩm">${ICO.pencil}</button><button class="ib del" type="button" data-del aria-label="Xóa sản phẩm">${ICO.trash}</button></div>`).join("") : `<div class="statebox sm">${ICO.bag}<p>Chưa có sản phẩm. Bấm “Thêm sản phẩm” để bắt đầu.</p></div>`}</div>`;
    body.querySelector("#addP").addEventListener("click", () => productForm(null));
    body.querySelector("#pl").addEventListener("click", e => {
      const row = e.target.closest(".dv-p"); if (!row) return; const p = (shop.items || []).find(x => x.id === row.dataset.id); if (!p) return;
      if (e.target.closest("[data-ed]")) productForm(p);
      else if (e.target.closest("[data-vis]")) ref("nox_shop/items/" + p.id + "/active").set(!p.active).then(() => toast(p.active ? "Đã ẩn sản phẩm." : "Đã hiện sản phẩm.")).catch(x => toast(friendly(x), "err"));
      else if (e.target.closest("[data-del]")) popConfirm({ tone: "danger", title: "Xóa sản phẩm này?", message: "Sản phẩm biến khỏi cửa hàng. Đơn hàng đã bán vẫn được giữ trong lịch sử của khách.", details: [["Sản phẩm", p.name], ["Giá", money(p.price)], ["Đã bán", String(p.sold)]], ok: "Xóa sản phẩm" }).then(y => y && Promise.all([ref("nox_shop/items/" + p.id).remove(), ref("nox_shopsecret/" + p.id).remove()]).then(() => toast("Đã xóa sản phẩm.")).catch(x => toast(friendly(x), "err")));
    });
  };

  const productForm = async (p) => {
    let secret = {}; if (p) { try { secret = (await ref("nox_shopsecret/" + p.id).once("value")).val() || {}; } catch (_) {} }
    let imgs = p ? p.gallery.slice(0, MAXIMG) : [];
    const lines = secret.lines ? Object.keys(secret.lines).sort().map(k => secret.lines[k]).join("\n") : "";
    const cats = catList();
    const h = openPopup({ id: "pform", variant: "sheet", wide: true, title: p ? "Sửa sản phẩm" : "Thêm sản phẩm", icon: "bag" });
    h.setBody(`<form class="pf" id="pf" novalidate>
      <div class="field"><label for="pfN">Tên sản phẩm <b class="req" aria-hidden="true">*</b></label><input id="pfN" maxlength="120" autocomplete="off" value="${esc(p ? p.name : "")}"></div>
      <div class="pf-2"><div class="field"><label for="pfP">Giá (₫) <b class="req" aria-hidden="true">*</b></label><input id="pfP" inputmode="numeric" autocomplete="off" value="${p ? p.price : ""}" placeholder="50000"></div>
        <div class="field"><label for="pfC">Mục lục</label><select id="pfC"><option value="">— Không thuộc mục nào —</option>${cats.map(c => `<option value="${esc(c.id)}"${p && p.cat === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div></div>
      <div class="field"><label for="pfM">Cách giao hàng</label><select id="pfM">${Object.entries(MODES).map(([v, l]) => `<option value="${v}"${(p ? p.mode : "text") === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="field" id="pfSecW"><label for="pfS" id="pfSL"></label><textarea id="pfS" rows="5" maxlength="20000" spellcheck="false" autocomplete="off"></textarea><p class="field-hint" id="pfSH"></p></div>
      <div class="field" id="pfStW"><label for="pfSt">Số lượng trong kho</label><input id="pfSt" inputmode="numeric" autocomplete="off" value="${p && p.stock !== null ? p.stock : ""}" placeholder="Để trống = không giới hạn"></div>
      <div class="field"><label for="pfD">Mô tả</label><textarea id="pfD" rows="4" maxlength="2000">${esc(p ? p.desc : "")}</textarea></div>
      <div class="field"><span class="label">Hình ảnh (tối đa ${MAXIMG}; ảnh đầu tiên là ảnh bìa)</span><div class="pf-imgs" id="pfI"></div><input id="pfF" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></div>
      <label class="switch-row pf-act"><span>Đang bán (hiện trên cửa hàng)</span><span class="sw"><input type="checkbox" id="pfA" ${!p || p.active ? "checked" : ""}><i></i></span></label>
      <p class="form-error" id="pfE" role="alert"></p>
      <div class="form-acts"><button class="btn ghost" type="button" id="pfX">Hủy</button><button class="btn primary" type="submit" id="pfOk">${ICO.check}${p ? "Lưu thay đổi" : "Thêm sản phẩm"}</button></div></form>`);
    const $ = s => h.body.querySelector(s), mode = () => $("#pfM").value;
    $("#pfS").value = mode() === "lines" ? lines : (secret.text || "");
    const sync = () => {
      const m = mode(); $("#pfSecW").hidden = m === "manual"; $("#pfStW").hidden = m === "lines";
      $("#pfSL").textContent = m === "lines" ? "Danh sách sản phẩm (mỗi dòng là một sản phẩm)" : "Nội dung giao cho khách";
      $("#pfSH").textContent = m === "lines" ? "Mỗi dòng sẽ giao cho một lượt mua (key, tài khoản…). Số lượng kho tự tính theo số dòng. Chỉ bạn (dev) thấy được phần này." : "Link, mã hoặc hướng dẫn khách nhận được sau khi thanh toán. Chỉ bạn (dev) thấy được trước khi bán.";
    };
    $("#pfM").addEventListener("change", () => { const m = mode(); if (m === "lines" && !$("#pfS").value && secret.lines) $("#pfS").value = lines; sync(); }); sync();
    const drawImgs = () => {
      $("#pfI").innerHTML = imgs.map((g, i) => `<div class="pf-img"><img src="${esc(g)}" alt="Ảnh ${i + 1}">${i === 0 ? "<em>Bìa</em>" : `<button type="button" data-first="${i}" aria-label="Đặt làm ảnh bìa">${ICO.sparkles}</button>`}<button type="button" class="x" data-rm="${i}" aria-label="Xóa ảnh">${ICO.x}</button></div>`).join("")
        + (imgs.length < MAXIMG ? `<button type="button" class="pf-add" id="pfAdd" aria-label="Thêm ảnh">${ICO.plus}<span>Thêm ảnh</span></button>` : "");
    };
    drawImgs();
    $("#pfI").addEventListener("click", e => {
      if (e.target.closest("#pfAdd")) { $("#pfF").click(); return; }
      const rm = e.target.closest("[data-rm]"), fi = e.target.closest("[data-first]");
      if (rm) { imgs.splice(+rm.dataset.rm, 1); drawImgs(); } else if (fi) { const [x] = imgs.splice(+fi.dataset.first, 1); imgs.unshift(x); drawImgs(); }
    });
    $("#pfF").addEventListener("change", async e => {
      const files = [...e.target.files].slice(0, MAXIMG - imgs.length); e.target.value = "";
      for (const f of files) { try { imgs.push(await fileToItemImage(f)); } catch (ex) { $("#pfE").textContent = (ex && ex.message) || "Không đọc được ảnh này."; } }
      drawImgs();
    });
    $("#pfX").addEventListener("click", () => h.close());
    $("#pf").addEventListener("submit", async e => {
      e.preventDefault(); const err = $("#pfE"); err.textContent = "";
      const name = $("#pfN").value.trim(), price = Number($("#pfP").value.replace(/\D/g, "")), m = mode(), now = Date.now();
      const stRaw = $("#pfSt").value.trim(), st = stRaw === "" ? null : Number(stRaw.replace(/\D/g, ""));
      if (!name) { err.textContent = "Vui lòng nhập tên sản phẩm."; return; }
      if (!(price >= 0 && price <= 1e9) || $("#pfP").value.trim() === "") { err.textContent = "Giá không hợp lệ (0 đến 1.000.000.000 ₫)."; return; }
      if (st !== null && !(st >= 0 && st <= 99999)) { err.textContent = "Số lượng từ 0 đến 99.999, hoặc để trống nếu không giới hạn."; return; }
      const id = p ? p.id : ref("nox_shop/items").push().key, item = { name, price, mode: m, active: $("#pfA").checked, desc: $("#pfD").value.trim(), createdAt: p && p.createdAt ? p.createdAt : now, updatedAt: now, sold: p ? p.sold : 0 };
      if ($("#pfC").value) item.cat = $("#pfC").value;
      if (imgs[0]) item.img = imgs[0]; if (imgs.length > 1) { item.imgs = {}; imgs.slice(1).forEach((g, i) => { item.imgs["abc"[i]] = g; }); }
      const sec = {}; const txt = $("#pfS").value;
      if (m === "lines") { const ls = txt.split(/\r?\n/).map(x => x.trim()).filter(Boolean); if (ls.length > 2000 || ls.some(x => x.length > 5000)) { err.textContent = "Tối đa 2.000 dòng, mỗi dòng không quá 5.000 ký tự."; return; } if (ls.length) { sec.lines = {}; ls.forEach((x, i) => { sec.lines["l" + String(i).padStart(5, "0")] = x; }); } item.stock = ls.length; }
      else { if (st !== null) item.stock = st; if (m === "text" && txt.trim()) sec.text = txt; }
      const ok = $("#pfOk"); ok.disabled = true;
      try { await Promise.all([ref("nox_shop/items/" + id).set(item), Object.keys(sec).length ? ref("nox_shopsecret/" + id).set(sec) : ref("nox_shopsecret/" + id).remove()]); toast(p ? "Đã lưu sản phẩm." : "Đã thêm sản phẩm."); h.close(); }
      catch (ex) { ok.disabled = false; err.textContent = friendly(ex); }
    });
  };

  /* ───── Mục lục ───── */
  const drawCats = () => {
    const L = shop.cats || [];
    body.innerHTML = `<div class="dv-bar"><span class="dsec">${L.length} mục</span><button class="btn primary sm" id="addC" type="button">${ICO.plus}Thêm mục lục</button></div>
      <div class="dlist">${L.length ? L.map(c => `<div class="drow" data-id="${esc(c.id)}"><span class="ci">${ICO.tag}</span><span class="nm">${esc(c.name)}<small>Thứ tự ${c.sort} · ${(shop.items || []).filter(p => p.cat === c.id).length} sản phẩm</small></span><button class="ib" data-ed type="button" aria-label="Sửa mục">${ICO.pencil}</button><button class="ib del" data-del type="button" aria-label="Xóa mục">${ICO.trash}</button></div>`).join("") : `<div class="statebox sm">${ICO.tag}<p>Chưa có mục lục. Thêm mục để khách lọc sản phẩm dễ hơn.</p></div>`}</div>`;
    const edit = async c => {
      const id = c ? c.id : ref("nox_shop/cats").push().key;
      await popForm({ title: c ? "Sửa mục lục" : "Thêm mục lục", headIcon: "tag", icon: "tag", tone: "info", ok: "Lưu mục lục", okIcon: "check", pair: true,
        fields: [{ id: "name", label: "Tên mục", value: c ? c.name : "", max: 60, required: true }, { id: "sort", label: "Thứ tự (số nhỏ hiện trước)", value: String(c ? c.sort : (L.length + 1) * 10), max: 6, inputmode: "numeric" }],
        check: v => (!String(v.name).trim() ? "Vui lòng nhập tên mục." : ""),
        submit: v => ref("nox_shop/cats/" + id).set({ name: String(v.name).trim(), sort: Number(String(v.sort).replace(/\D/g, "")) || 0 }).then(() => toast("Đã lưu mục lục.")) });
    };
    body.querySelector("#addC").addEventListener("click", () => edit(null));
    body.querySelector(".dlist").addEventListener("click", e => { const row = e.target.closest(".drow[data-id]"); if (!row) return; const c = L.find(x => x.id === row.dataset.id); if (!c) return;
      if (e.target.closest("[data-ed]")) edit(c); else if (e.target.closest("[data-del]")) popConfirm({ tone: "danger", title: "Xóa mục lục này?", message: "Sản phẩm trong mục vẫn còn, chỉ không thuộc mục nào.", details: [["Mục lục", c.name]], ok: "Xóa mục lục" }).then(y => y && ref("nox_shop/cats/" + c.id).remove().then(() => toast("Đã xóa mục lục.")).catch(x => toast(friendly(x), "err"))); });
  };

  /* ───── Đơn hàng ───── */
  const drawOrders = () => {
    if (orders === null) { body.innerHTML = '<p class="sub-note">Đang tải…</p>'; return; }
    const pend = orders.filter(o => o.status === "pending" && Date.now() - (o.ts || 0) > 5 * 60000).length, man = orders.filter(o => o.status === "paid" && o.manual && !o.delivered).length;
    body.innerHTML = `<div class="dv-bar"><span class="dsec">${orders.length} đơn</span>${man ? `<span class="badge strong">${man} đơn giao tay</span>` : ""}${pend ? `<span class="badge">${pend} đơn kẹt cần kiểm tra</span>` : ""}</div>
      <div class="dlist">${orders.length ? orders.slice(0, 200).map(o => `<div class="drow dv-o" data-uid="${esc(o.uid)}" data-id="${esc(o.id)}"><span class="nm"><span translate="no">#${esc(o.id.slice(-8).toUpperCase())} · ${esc(userLabel(o.uid))}</span><small translate="no">${esc((o.items || []).map(i => i.name + " ×" + i.qty).join(", "))} · ${esc(fmtTime(o.ts))}</small></span>
        <span class="od-st ${o.status === "paid" ? "ok" : o.status === "refunded" ? "bad" : "warn"}">${o.status === "paid" ? (o.manual ? (o.delivered ? "Đã giao tay" : "Cần giao tay") : "Hoàn tất") : o.status === "refunded" ? "Đã hoàn" : "Đang xử lý"}</span><b>${money(o.total)}</b>${o.status === "paid" && o.manual && !o.delivered ? `<button class="btn soft sm" data-dv type="button">Đã giao</button>` : ""}${o.status === "paid" ? `<button class="btn ghost sm" data-rf type="button">Hoàn tiền</button>` : ""}</div>`).join("") : `<div class="statebox sm">${ICO.receipt}<p>Chưa có đơn hàng nào.</p></div>`}</div>`;
    body.querySelector(".dlist").addEventListener("click", async e => {
      const rf = e.target.closest("[data-rf]"), dv = e.target.closest("[data-dv]"), b = rf || dv; if (!b) return; const row = b.closest(".dv-o"), o = orders.find(x => x.id === row.dataset.id && x.uid === row.dataset.uid); if (!o) return;
      if (dv) { b.disabled = true; devDeliver(o.uid, o.id).then(() => toast("Đã đánh dấu đã giao.")).catch(x => { b.disabled = false; toast(x.message, "err"); }); return; }
      if (!(await popConfirm({ tone: "warn", icon: "back", title: "Hoàn tiền đơn này?", message: "Tiền sẽ được cộng lại vào ví của khách. Hàng đã giao không tự thu hồi.", details: [["Đơn", "#" + o.id.slice(-8).toUpperCase()], ["Khách", userLabel(o.uid)], ["Hoàn lại", money(o.total), "strong"]], ok: "Hoàn tiền" }))) return;
      b.disabled = true; devRefund(o.uid, o.id).then(() => toast("Đã hoàn tiền.")).catch(x => { b.disabled = false; toast(x.message, "err"); }); });
  };

  /* ───── Nạp tiền & ví ───── */
  const drawMoney = () => {
    const url = location.origin + "/api/bank-webhook", on = status && !status.err && (status.hook.sepayKey || status.hook.sepaySecret || status.hook.casso);
    const bk = status && !status.err ? status.bank : null;
    body.innerHTML = `<section class="dv-card dv-bank"><h3>Ngân hàng nhận tiền</h3>${!bk ? '<p class="sub-note">Đang tải…</p>' : `<div class="bk"><span class="bk-ico">${ICO.bank}</span><div class="bk-m"><b translate="no">${esc(bk.bank)}</b><span translate="no">${esc(bk.account)} · ${esc(bk.name)}</span><span class="od-st ${status.linked ? "ok" : "warn"}">${status.linked ? "Đã liên kết bởi dev" : "Đang dùng mặc định của máy chủ"}</span></div></div>
        <p class="sub-note">Mã QR nạp tiền của mọi người dùng được tạo từ tài khoản này, kèm số tiền và mã riêng của từng tài khoản.</p>
        <div class="dv-bar"><button class="btn primary sm" id="bkLink" type="button">${ICO.bank}${status.linked ? "Đổi ngân hàng" : "Liên kết ngân hàng"}</button><button class="btn soft sm" id="bkQr" type="button">${ICO.qr}Tạo mã QR</button>${status.linked ? `<button class="btn ghost sm" id="bkReset" type="button">Gỡ liên kết</button>` : ""}</div>`}</section>
      <section class="dv-card"><h3>Nhận tiền tự động</h3>
      ${!status ? '<p class="sub-note">Đang kiểm tra…</p>' : status.err ? `<p class="form-error">${esc(status.err)}</p>` : `<p class="dv-st ${on ? "ok" : "bad"}">${on ? ICO.checkCircle : ICO.warn}<span>${on ? "Máy chủ đã có khoá bảo mật cho webhook." : "Chưa đặt khoá webhook trên Vercel — tiền chuyển vào sẽ KHÔNG tự cộng."}</span></p>
        <dl class="dv-dl"><div><dt>Địa chỉ webhook</dt><dd><code translate="no">${esc(url)}</code> <button class="btn soft sm" id="cpU" type="button">${ICO.copy}<span>Sao chép</span></button></dd></div></dl>`}</section>
      <section class="dv-card"><h3>Cộng / trừ tiền thủ công</h3><form class="pf pf-line" id="adj" novalidate><div class="field"><label for="adE">Email tài khoản</label><input id="adE" type="email" autocomplete="off" placeholder="khach@gmail.com"></div><div class="field"><label for="adA">Số tiền (₫, số âm để trừ)</label><input id="adA" inputmode="numeric" autocomplete="off" placeholder="50000"></div><div class="field"><label for="adN">Ghi chú</label><input id="adN" maxlength="120" autocomplete="off" placeholder="Bù tiền / sửa lỗi…"></div><button class="btn primary" type="submit">Áp dụng</button></form><p class="form-error" id="adErr" role="alert"></p></section>
      <section class="dv-card"><h3>Giao dịch ngân hàng nhận được</h3><div class="dlist">${hooks === null ? '<p class="sub-note">Đang tải…</p>' : hooks.length ? hooks.slice(0, 100).map(x => { const [lab, tone] = HOOK_ST[x.status] || [x.status, ""]; return `<div class="drow" data-k="${esc(x.key)}"><span class="nm"><span translate="no">${esc(x.content || "(không nội dung)")}</span><small>${esc(fmtTime(x.ts))}${x.uid ? " · " + esc(userLabel(x.uid)) : ""}</small></span><span class="od-st ${tone}">${lab}</span><b>${money(x.amount)}</b>${x.status === "unmatched" ? '<button class="btn ghost sm" data-as type="button">Gán cho tài khoản</button>' : ""}</div>`; }).join("") : `<div class="statebox sm">${ICO.bank}<p>Chưa nhận giao dịch nào.</p></div>`}</div></section>`;
    const refresh = () => devShopStatus().then(r => { status = r; if (tab === "money") draw(); }).catch(() => {});
    const bl = body.querySelector("#bkLink"); if (bl) bl.addEventListener("click", () => openBankLink(bk, refresh));
    const bq = body.querySelector("#bkQr"); if (bq) bq.addEventListener("click", () => openDevQr());
    const br = body.querySelector("#bkReset"); if (br) br.addEventListener("click", () => resetBank(refresh));
    const cp = body.querySelector("#cpU"); if (cp) cp.addEventListener("click", () => copyText(url).then(() => toast("Đã sao chép.")));
    body.querySelector("#adj").addEventListener("submit", async e => { e.preventDefault(); const err = body.querySelector("#adErr"); err.textContent = "";
      const email = body.querySelector("#adE").value.trim().toLowerCase(), amt = Number(body.querySelector("#adA").value.replace(/[^\d-]/g, "")), u = (S.store.users || []).find(x => String(x.email || "").toLowerCase() === email);
      if (!u) { err.textContent = "Không tìm thấy tài khoản có email này."; return; } if (!amt) { err.textContent = "Nhập số tiền khác 0."; return; }
      if (!(await popConfirm({ tone: amt > 0 ? "ok" : "warn", icon: amt > 0 ? "plus" : "minus", title: "Điều chỉnh số dư?", message: "Thao tác được ghi vào lịch sử giao dịch của khách.", details: [["Tài khoản", u.email], [amt > 0 ? "Cộng" : "Trừ", money(Math.abs(amt)), "strong"]], ok: "Áp dụng" }))) return;
      devAdjust(u.uid, amt, body.querySelector("#adN").value.trim()).then(r => { toast("Số dư mới: " + money(r.balance)); e.target.reset(); }).catch(x => { err.textContent = x.message; }); });
    body.querySelector(".dlist")?.addEventListener("click", async e => { const b = e.target.closest("[data-as]"); if (!b) return; const key = b.closest("[data-k]").dataset.k;
      const v = await popForm({ title: "Gán giao dịch cho tài khoản", headIcon: "users", icon: "info", tone: "warn", message: "Chỉ dùng khi khách chuyển sai nội dung. Tiền sẽ được cộng vào ví tài khoản này.", ok: "Gán & cộng tiền", fields: [{ id: "email", label: "Email tài khoản", type: "email", max: 120, required: true }], check: x => (!String(x.email).trim() ? "Hãy nhập email tài khoản." : "") }); if (!v) return;
      const u = (S.store.users || []).find(x => String(x.email || "").toLowerCase() === String(v.email).trim().toLowerCase()); if (!u) { toast("Không tìm thấy tài khoản có email này.", "err"); return; }
      devAssign(key, u.uid).then(() => toast("Đã cộng tiền cho " + u.email + ".")).catch(x => toast(x.message, "err")); });
  };

  const draw = () => { ({ items: drawItems, cats: drawCats, orders: drawOrders, money: drawMoney })[tab](); };
  ctx.el.querySelector("#dvT").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b) return; tab = b.dataset.t; ctx.el.querySelectorAll("#dvT [data-t]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); draw(); });
  draw();
  const off = subscribeShop(t => { if ((t === "items" && (tab === "items" || tab === "cats")) || (t === "cats" && (tab === "cats" || tab === "items"))) draw(); });
  return () => { off(); offs.forEach(f => f()); };
}
