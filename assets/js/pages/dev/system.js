/* Bảo trì & thông báo: bật/tắt chế độ bảo trì và đăng thông báo hiện khi mọi người vào web. */
import { fmtTime, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";
import { confirmDialog } from "../../lib/confirm.js";
import { openPopup } from "../../lib/popup.js";
import { esc } from "../../lib/util.js";
import { armDelete } from "../../lib/ui.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Bảo trì & thông báo", crumbs: devCrumb, sub: "Tạm đóng website để nâng cấp và gửi thông báo tới mọi người.", noindex: true });
  ctx.el.innerHTML = `<div class="formcard"><span class="dsec">Kết nối</span><div class="status"><span class="dot" id="cDot"></span><span id="cTxt"></span></div>
    <span class="dsec" id="maintsec">Chế độ bảo trì</span><div class="status"><span class="dot" id="mDot"></span><span id="mTxt">Đang kiểm tra…</span><button class="btn ghost sm" id="mBtn" type="button">—</button></div>
    <div class="mins"><div class="field"><label for="mins">Tự mở lại sau (phút)</label><input id="mins" type="number" min="1" step="1" placeholder="1"></div><span class="field-hint">Để trống nghĩa là 1 phút.</span></div></div>
    <div class="formcard"><span class="dsec" id="notice">Thông báo khi vào web</span>
    <div class="switch-row"><span>Hiển thị thông báo</span><label class="sw"><input type="checkbox" id="nOn" aria-label="Hiển thị thông báo"><i></i></label></div>
    <form id="nf" class="form" novalidate><div class="field"><label for="nT">Tiêu đề</label><input id="nT" autocomplete="off" placeholder="Thông báo" maxlength="120"></div>
      <div class="field"><label for="nB">Nội dung</label><textarea id="nB" rows="4" maxlength="2000" placeholder="Bạn muốn nhắn gì tới mọi người?"></textarea></div><p class="form-error" id="nE" role="alert"></p>
      <div class="form-acts"><button class="btn primary" type="submit">${ICO.bell}Cập nhật thông báo</button></div></form></div>
    <div class="formcard" id="maintnotes"><span class="dsec">Thông báo bảo trì (hiện ở chuông Thông báo và dải trên cùng)</span><p class="sub-note">Báo trước lịch bảo trì, cập nhật tiến độ và thông báo khi đã xong. Mọi người đều thấy.</p>
      <div class="mn-admin" id="mnList"></div><div class="form-acts"><button class="btn primary" id="mnAdd" type="button">${ICO.plus}Thêm thông báo bảo trì</button></div></div>`;
  const $ = s => ctx.el.querySelector(s); let filled = false;
  const conn = () => { $("#cDot").className = "dot " + (S.store.connected ? "ok" : "warn"); $("#cTxt").textContent = S.store.connected ? "Kết nối ổn định" : "Đang chờ kết nối…"; };
  const maint = () => { const m = S.store.maint, on = !!(m && m.enabled); $("#mDot").className = "dot " + (on ? "warn" : "ok");
    $("#mTxt").textContent = (on ? "Đang bảo trì" : "Website đang hoạt động") + (on && m.until ? " · tự mở lại lúc " + fmtTime(m.until) : ""); const b = $("#mBtn"); b.textContent = on ? "Mở lại website" : "Bật bảo trì"; b.className = "btn sm " + (on ? "primary" : "ghost"); };
  const notice = () => { const n = S.store.notice; $("#nOn").checked = !!(n && n.enabled !== false); if (!filled && n) { filled = true; $("#nT").value = n.title || ""; $("#nB").value = n.body || ""; } };
  conn(); maint(); notice();
  const u1 = S.subscribe(t => { if (t === "conn") conn(); else if (t === "maint") maint(); else if (t === "notice") notice(); else if (t === "maintnotes") drawNotes(); });
  $("#mBtn").onclick = async () => { const on = !!(S.store.maint && S.store.maint.enabled); let m = parseInt($("#mins").value, 10); if (!isFinite(m) || m < 1) m = 1;
    if (!on && !(await confirmDialog({ kind: "maint", title: "Bật chế độ bảo trì?", message: "Toàn bộ website sẽ đóng với mọi người cho tới khi hết " + m + " phút hoặc bạn mở lại.", ok: "Bật bảo trì", danger: true }))) return;
    S.setMaintenance(!on, m).then(() => toast(on ? "Website đã mở lại." : "Đã bật bảo trì (tự mở lại sau " + m + " phút).")).catch(x => toast(friendly(x), "err")); };
  $("#nOn").onchange = e => { const v = e.target.checked; S.setNotice({ enabled: v }).then(() => toast(v ? "Đã bật thông báo." : "Đã tắt thông báo.")).catch(x => { e.target.checked = !v; toast(friendly(x), "err"); }); };
  $("#nf").addEventListener("submit", e => { e.preventDefault(); $("#nE").textContent = ""; const title = $("#nT").value.trim(), body = $("#nB").value.trim();
    if (!body) return ($("#nE").textContent = "Vui lòng nhập nội dung thông báo.");
    S.setNotice({ title, body, enabled: !(S.store.notice && S.store.notice.enabled === false) }).then(() => toast("Đã cập nhật thông báo.")).catch(x => ($("#nE").textContent = friendly(x))); });
  /* Thông báo bảo trì: danh sách + cửa sổ thêm/sửa riêng */
  const toLocal = ms => { if (!ms) return ""; const d = new Date(ms), z = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes()); };
  const drawNotes = () => { const l = S.store.maintNotes; $("#mnList").innerHTML = l.length ? l.map(n => `<div class="mn-row mn-${esc(n.level)}"><span class="badge mn-tag">${esc(S.MNOTE_LEVELS[n.level])}</span><span class="mn-t" translate="no"><b>${esc(n.title)}</b>${n.start ? `<small>${esc(fmtTime(n.start))}${n.end ? " → " + esc(fmtTime(n.end)) : ""}</small>` : ""}</span>
      <button class="btn ghost sm" type="button" data-e="${esc(n.key)}">${ICO.pencil}Sửa</button><button class="ib del" type="button" data-d="${esc(n.key)}" aria-label="Xóa">${ICO.trash}</button></div>`).join("") : `<div class="statebox sm"><p>Chưa có thông báo bảo trì nào.</p></div>`; };
  const editNote = n => {
    const lv = n ? n.level : "planned";
    const h = openPopup({ id: "mnedit", variant: "sheet", title: n ? "Sửa thông báo bảo trì" : "Thông báo bảo trì mới", icon: "wrench", tone: "maint",
      html: `<form class="pk-form" id="mnf" novalidate><div class="field"><span class="lbl">Tình trạng</span><div class="seg wrap" id="mnLv" role="radiogroup">${Object.keys(S.MNOTE_LEVELS).map(k => `<button type="button" role="radio" aria-checked="${k === lv}" data-lv="${k}" class="${k === lv ? "on" : ""}">${S.MNOTE_LEVELS[k]}</button>`).join("")}</div></div>
        <div class="field"><label for="mnT">Tiêu đề</label><input id="mnT" maxlength="120" autocomplete="off" value="${esc(n ? n.title : "")}" placeholder="Ví dụ: Bảo trì máy chủ lúc 22:00"></div>
        <div class="field"><label for="mnB">Nội dung</label><textarea id="mnB" rows="4" maxlength="2000" placeholder="Ảnh hưởng gì, kéo dài bao lâu…">${esc(n ? n.body : "")}</textarea></div>
        <div class="two"><div class="field"><label for="mnS">Bắt đầu</label><input id="mnS" type="datetime-local" value="${toLocal(n && n.start)}"></div><div class="field"><label for="mnE">Kết thúc</label><input id="mnE" type="datetime-local" value="${toLocal(n && n.end)}"></div></div>
        <p class="form-error" id="mnX" role="alert"></p><div class="form-acts"><button class="btn ghost" type="button" id="mnC">Hủy</button><button class="btn primary" type="submit">${ICO.check}Lưu</button></div></form>` });
    const f = h.el.querySelector("#mnf"); let cur = lv;
    f.querySelector("#mnLv").addEventListener("click", e => { const b = e.target.closest("[data-lv]"); if (!b) return; cur = b.dataset.lv; f.querySelectorAll("[data-lv]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); }); });
    f.querySelector("#mnC").addEventListener("click", () => h.close());
    f.addEventListener("submit", async e => { e.preventDefault(); const er = f.querySelector("#mnX"); er.textContent = "";
      const ms = id => { const v = f.querySelector(id).value; return v ? new Date(v).getTime() : 0; };
      try { await S.saveMaintNote(n && n.key, { title: f.querySelector("#mnT").value, body: f.querySelector("#mnB").value, level: cur, start: ms("#mnS"), end: ms("#mnE") }); toast("Đã lưu thông báo bảo trì."); h.close(); } catch (x) { er.textContent = friendly(x); } });
  };
  $("#mnAdd").onclick = () => editNote(null);
  $("#mnList").addEventListener("click", e => { const b = e.target.closest("[data-e],[data-d]"); if (!b) return;
    if (b.dataset.e) editNote(S.store.maintNotes.find(x => x.key === b.dataset.e));
    else armDelete(b, () => S.deleteMaintNote(b.dataset.d).then(() => toast("Đã xóa.")).catch(x => toast(friendly(x), "err")), { title: "Xóa thông báo bảo trì?", message: "Thông báo sẽ biến mất khỏi website của mọi người.", kind: "delete" }); });
  drawNotes();
  if (location.hash) setTimeout(() => { try { const t = ctx.el.querySelector(location.hash); t && t.scrollIntoView(); } catch (_) {} }, 100);
  return u1;
}
