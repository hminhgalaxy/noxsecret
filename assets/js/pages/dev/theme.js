/* Giao diện: hình nền (ảnh/video) và nhạc nền cho toàn website. */
import { esc, toast, compressImage, readAsDataURL } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { MAX_DATA_LEN } from "../../lib/config.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";
import { confirmDialog } from "../../lib/confirm.js";
import { playlist } from "../../lib/media.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Giao diện", crumbs: devCrumb, sub: "Hình nền và nhạc nền áp dụng cho toàn bộ website.", noindex: true });
  ctx.el.innerHTML = `<div class="formcard"><span class="dsec">Hình nền (ảnh hoặc video)</span><div class="status"><span class="dot" id="thDot"></span><span id="thS">Đang dùng nền mặc định</span></div>
    <div class="acts"><label class="btn ghost upbtn">${ICO.eye}Chọn ảnh / video<input type="file" id="thF" accept="image/*,video/*" hidden></label>
      <button class="btn primary" id="thA" type="button" disabled>Áp dụng nền</button><button class="btn ghost" id="thC" type="button">Xóa nền</button></div>
    <div class="preview" id="thP"></div><p class="form-error" id="thE" role="alert"></p></div>
    <div class="formcard"><span class="dsec">Nhạc nền (phát nối tiếp)</span><div class="status"><span class="dot" id="auDot"></span><span id="auS">Chưa có nhạc nền</span></div>
    <ol class="tracks" id="auL"></ol>
    <div class="acts"><label class="btn primary upbtn" id="auPlus" title="Thêm nhạc nền">${ICO.plus}Thêm nhạc<input type="file" id="auF" accept="audio/*" multiple hidden></label></div><p class="form-error" id="auE" role="alert"></p></div>`;
  const $ = s => ctx.el.querySelector(s); let bg = null;
  const status = () => { const t = S.store.theme || {}, has = t.bgData && t.bgType && t.bgType !== "none";
    $("#thS").textContent = has ? "Đang dùng " + (t.bgType === "video" ? "video" : "ảnh") + " làm nền" : "Đang dùng nền mặc định"; $("#thDot").className = "dot" + (has ? " ok" : "");
    drawTracks(); };
  const drawTracks = () => { const l = playlist(); $("#auS").textContent = l.length ? l.length + " bài trong danh sách phát (phát nối tiếp, lặp lại)" : "Chưa có nhạc nền"; $("#auDot").className = "dot" + (l.length ? " ok" : "");
    $("#auL").innerHTML = l.map((x, i) => `<li><span class="n">${i + 1}</span><span class="t" translate="no">${esc(x.name)}</span><button type="button" class="btn ghost sm" data-rm="${esc(x.id)}" aria-label="Xóa ${esc(x.name)}">Xóa</button></li>`).join(""); };
  status(); const u = S.subscribe(t => { if (t === "theme") status(); });
  $("#thF").addEventListener("change", async e => { const f = e.target.files[0]; e.target.value = ""; $("#thE").textContent = ""; if (!f) return;
    try { if (f.type.startsWith("image/")) { const d = await compressImage(f); if (d.length > MAX_DATA_LEN) return ($("#thE").textContent = "Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."); bg = { type: "image", data: d, name: f.name }; $("#thP").innerHTML = `<img src="${esc(d)}" alt="Xem trước hình nền">`; }
      else if (f.type.startsWith("video/")) { if (f.size > 6.5 * 1048576) return ($("#thE").textContent = "Video quá lớn (tối đa khoảng 6,5 MB)."); const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) return ($("#thE").textContent = "Video quá lớn."); bg = { type: "video", data: d, name: f.name }; $("#thP").innerHTML = `<video src="${esc(d)}" muted loop autoplay playsinline></video>`; }
      else return ($("#thE").textContent = "Chỉ hỗ trợ ảnh hoặc video."); $("#thA").disabled = false; } catch (x) { $("#thE").textContent = friendly(x); } });
  $("#thA").onclick = () => { if (!bg) return; const b = $("#thA"); b.disabled = true; S.setTheme({ bgType: bg.type, bgData: bg.data }).then(() => { toast("Đã áp dụng hình nền."); bg = null; $("#thP").innerHTML = ""; }).catch(x => { $("#thE").textContent = friendly(x); b.disabled = false; }); };
  $("#thC").onclick = async () => { if (!(await confirmDialog({ kind: "media", title: "Xóa hình nền?", message: "Hình nền sẽ bị gỡ khỏi website của mọi người.", ok: "Xóa nền", danger: true }))) return; S.setTheme({ bgType: "none", bgData: "" }).then(() => { bg = null; $("#thP").innerHTML = ""; $("#thA").disabled = true; toast("Đã xóa hình nền."); }).catch(x => toast(friendly(x), "err")); };
  $("#auF").addEventListener("change", async e => { const fs = [...e.target.files]; e.target.value = ""; $("#auE").textContent = ""; let n = 0;
    for (const f of fs) {
      if (!f.type.startsWith("audio/")) { $("#auE").textContent = "Tệp \"" + f.name + "\" không phải âm thanh."; continue; }
      if (f.size > 6.5 * 1048576) { $("#auE").textContent = "Tệp \"" + f.name + "\" quá lớn (tối đa khoảng 6,5 MB)."; continue; }
      try { const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) { $("#auE").textContent = "Tệp \"" + f.name + "\" quá lớn."; continue; } await S.addTrack(f.name, d); n++; } catch (x) { $("#auE").textContent = friendly(x); break; }
    }
    if (n) toast(n === 1 ? "Đã thêm 1 bài vào danh sách phát." : "Đã thêm " + n + " bài vào danh sách phát."); });
  $("#auL").addEventListener("click", async e => { const b = e.target.closest("[data-rm]"); if (!b) return;
    if (!(await confirmDialog({ kind: "music", title: "Xóa bài này?", message: "Bài nhạc sẽ bị gỡ khỏi danh sách phát của mọi người.", ok: "Xóa bài", danger: true }))) return;
    S.removeTrack(b.dataset.rm).then(() => toast("Đã xóa bài nhạc.")).catch(x => toast(friendly(x), "err")); });
  const u2 = S.subscribe(t => { if (t === "tracks") status(); });
  return () => { u(); u2(); };
}
