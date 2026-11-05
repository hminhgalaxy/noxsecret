/* Bảo trì & thông báo: bật/tắt chế độ bảo trì và đăng thông báo hiện khi mọi người vào web. */
import { fmtTime, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";

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
      <div class="form-acts"><button class="btn primary" type="submit">${ICO.bell}Cập nhật thông báo</button></div></form></div>`;
  const $ = s => ctx.el.querySelector(s); let filled = false;
  const conn = () => { $("#cDot").className = "dot " + (S.store.connected ? "ok" : "warn"); $("#cTxt").textContent = S.store.connected ? "Kết nối ổn định" : "Đang chờ kết nối…"; };
  const maint = () => { const m = S.store.maint, on = !!(m && m.enabled); $("#mDot").className = "dot " + (on ? "warn" : "ok");
    $("#mTxt").textContent = (on ? "Đang bảo trì" : "Website đang hoạt động") + (on && m.until ? " · tự mở lại lúc " + fmtTime(m.until) : ""); const b = $("#mBtn"); b.textContent = on ? "Mở lại website" : "Bật bảo trì"; b.className = "btn sm " + (on ? "primary" : "ghost"); };
  const notice = () => { const n = S.store.notice; $("#nOn").checked = !!(n && n.enabled !== false); if (!filled && n) { filled = true; $("#nT").value = n.title || ""; $("#nB").value = n.body || ""; } };
  conn(); maint(); notice();
  const u1 = S.subscribe(t => { if (t === "conn") conn(); else if (t === "maint") maint(); else if (t === "notice") notice(); });
  $("#mBtn").onclick = () => { const on = !!(S.store.maint && S.store.maint.enabled); let m = parseInt($("#mins").value, 10); if (!isFinite(m) || m < 1) m = 1;
    S.setMaintenance(!on, m).then(() => toast(on ? "Website đã mở lại." : "Đã bật bảo trì (tự mở lại sau " + m + " phút).")).catch(x => toast(friendly(x), "err")); };
  $("#nOn").onchange = e => { const v = e.target.checked; S.setNotice({ enabled: v }).then(() => toast(v ? "Đã bật thông báo." : "Đã tắt thông báo.")).catch(x => { e.target.checked = !v; toast(friendly(x), "err"); }); };
  $("#nf").addEventListener("submit", e => { e.preventDefault(); $("#nE").textContent = ""; const title = $("#nT").value.trim(), body = $("#nB").value.trim();
    if (!body) return ($("#nE").textContent = "Vui lòng nhập nội dung thông báo.");
    S.setNotice({ title, body, enabled: !(S.store.notice && S.store.notice.enabled === false) }).then(() => toast("Đã cập nhật thông báo.")).catch(x => ($("#nE").textContent = friendly(x))); });
  if (location.hash) setTimeout(() => { try { const t = ctx.el.querySelector(location.hash); t && t.scrollIntoView(); } catch (_) {} }, 100);
  return u1;
}
