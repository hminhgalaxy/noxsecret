/* Dev › Skliquid: hình nền (ảnh/video) và nhạc nền RIÊNG cho giao diện Skliquid Glass. Không đụng tới nền/nhạc chung của website. */
import { esc, toast, compressImage, readAsDataURL } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { MAX_DATA_LEN } from "../../lib/config.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";
import { confirmDialog } from "../../lib/confirm.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Skliquid Glass", crumbs: devCrumb, sub: "Hình nền và nhạc nền riêng cho giao diện kính lỏng.", noindex: true });
  ctx.el.innerHTML = `<div class="formcard"><span class="dsec">Hình nền Skliquid (ảnh hoặc video)</span><div class="status"><span class="dot" id="lqDot"></span><span id="lqS">Đang dùng nền chất lỏng mặc định</span></div>
    <p class="muted" style="font-size:13px">Chỉ hiện khi người dùng bật Skliquid Glass. Nền sẽ nằm phía sau các khối kính nên ảnh nhiều màu sẽ cho hiệu ứng khúc xạ đẹp nhất.</p>
    <div class="acts"><label class="btn ghost upbtn">${ICO.eye}Chọn ảnh / video<input type="file" id="lqF" accept="image/*,video/*" hidden></label>
      <button class="btn primary" id="lqA" type="button" disabled>Áp dụng nền</button><button class="btn ghost" id="lqC" type="button">Xóa nền</button></div>
    <div class="preview" id="lqP"></div><p class="form-error" id="lqE" role="alert"></p></div>
    <div class="formcard"><span class="dsec">Nhạc nền Skliquid (phát nối tiếp)</span><div class="status"><span class="dot" id="lmDot"></span><span id="lmS">Chưa có nhạc riêng — Skliquid dùng nhạc nền chung (nếu có)</span></div>
    <ol class="tracks" id="lmL"></ol>
    <div class="acts"><label class="btn primary upbtn" title="Thêm nhạc cho Skliquid">${ICO.plus}Thêm nhạc<input type="file" id="lmF" accept="audio/*" multiple hidden></label></div><p class="form-error" id="lmE" role="alert"></p></div>`;
  const $ = s => ctx.el.querySelector(s); let bg = null;
  const list = () => (S.store.tracks || []).filter(t => t.lq);
  const status = () => {
    const t = S.store.theme || {}, has = t.lqBgData && t.lqBgType && t.lqBgType !== "none";
    $("#lqS").textContent = has ? "Đang dùng " + (t.lqBgType === "video" ? "video" : "ảnh") + " làm nền Skliquid" : "Đang dùng nền chất lỏng mặc định"; $("#lqDot").className = "dot" + (has ? " ok" : "");
    const l = list(); $("#lmS").textContent = l.length ? l.length + " bài trong danh sách phát Skliquid" : "Chưa có nhạc riêng — Skliquid dùng nhạc nền chung (nếu có)"; $("#lmDot").className = "dot" + (l.length ? " ok" : "");
    $("#lmL").innerHTML = l.map((x, i) => `<li><span class="n">${i + 1}</span><span class="t" translate="no">${esc(x.name)}</span><button type="button" class="btn ghost sm" data-rm="${esc(x.id)}" aria-label="Xóa ${esc(x.name)}">Xóa</button></li>`).join("");
  };
  status(); const u = S.subscribe(t => { if (t === "theme" || t === "tracks") status(); });
  $("#lqF").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; $("#lqE").textContent = ""; if (!f) return;
    try {
      if (f.type.startsWith("image/")) { const d = await compressImage(f); if (d.length > MAX_DATA_LEN) return ($("#lqE").textContent = "Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."); bg = { type: "image", data: d }; $("#lqP").innerHTML = `<img src="${esc(d)}" alt="Xem trước nền" style="max-width:100%;border-radius:20px">`; }
      else if (f.type.startsWith("video/")) { if (f.size > 6.5 * 1048576) return ($("#lqE").textContent = "Video quá lớn (tối đa khoảng 6,5 MB)."); const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) return ($("#lqE").textContent = "Video quá lớn."); bg = { type: "video", data: d }; $("#lqP").innerHTML = `<video src="${esc(d)}" muted loop autoplay playsinline style="max-width:100%;border-radius:20px"></video>`; }
      else return ($("#lqE").textContent = "Chỉ hỗ trợ ảnh hoặc video."); $("#lqA").disabled = false;
    } catch (x) { $("#lqE").textContent = friendly(x); }
  });
  $("#lqA").onclick = () => { if (!bg) return; const b = $("#lqA"); b.disabled = true; S.setTheme({ lqBgType: bg.type, lqBgData: bg.data }).then(() => { toast("Đã áp dụng nền Skliquid."); bg = null; $("#lqP").innerHTML = ""; }).catch(x => { b.disabled = false; $("#lqE").textContent = friendly(x); }); };
  $("#lqC").onclick = async () => { if (!(await confirmDialog({ kind: "media", title: "Xóa nền Skliquid?", message: "Skliquid sẽ trở lại nền chất lỏng mặc định.", ok: "Xóa nền", danger: true }))) return; S.setTheme({ lqBgType: "none", lqBgData: "" }).then(() => toast("Đã xóa nền Skliquid.")).catch(x => toast(friendly(x), "err")); };
  $("#lmF").addEventListener("change", async e => {
    const fs = [...e.target.files]; e.target.value = ""; $("#lmE").textContent = ""; let n = 0;
    for (const f of fs) {
      if (!f.type.startsWith("audio/")) { $("#lmE").textContent = "Tệp \"" + f.name + "\" không phải âm thanh."; continue; }
      if (f.size > 6.5 * 1048576) { $("#lmE").textContent = "Tệp \"" + f.name + "\" quá lớn (tối đa khoảng 6,5 MB)."; continue; }
      try { const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) { $("#lmE").textContent = "Tệp \"" + f.name + "\" quá lớn."; continue; } await S.addTrack(f.name, d, { lq: true }); n++; } catch (x) { $("#lmE").textContent = friendly(x); }
    }
    if (n) toast(n === 1 ? "Đã thêm 1 bài cho Skliquid." : "Đã thêm " + n + " bài cho Skliquid.");
  });
  $("#lmL").addEventListener("click", async e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    if (!(await confirmDialog({ kind: "music", title: "Xóa bài này?", message: "Bài nhạc sẽ bị gỡ khỏi danh sách phát Skliquid.", ok: "Xóa bài", danger: true }))) return;
    S.removeTrack(b.dataset.rm).then(() => toast("Đã xóa bài nhạc.")).catch(x => toast(friendly(x), "err"));
  });
  return () => u();
}
