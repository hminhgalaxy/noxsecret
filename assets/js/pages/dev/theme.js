/* Giao diện: hình nền (ảnh/video) và nhạc nền cho toàn website. */
import { esc, toast, compressImage, readAsDataURL } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { MAX_DATA_LEN } from "../../lib/config.js";
import * as S from "../../lib/store.js";
import { friendly } from "../../lib/messages.js";
import { locked, devCrumb } from "./shared.js";
import { confirmDialog } from "../../lib/confirm.js";

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Giao diện", crumbs: devCrumb, sub: "Hình nền và nhạc nền áp dụng cho toàn bộ website.", noindex: true });
  ctx.el.innerHTML = `<div class="formcard"><span class="dsec">Hình nền (ảnh hoặc video)</span><div class="status"><span class="dot" id="thDot"></span><span id="thS">Đang dùng nền mặc định</span></div>
    <div class="acts"><label class="btn ghost upbtn">${ICO.eye}Chọn ảnh / video<input type="file" id="thF" accept="image/*,video/*" hidden></label>
      <button class="btn primary" id="thA" type="button" disabled>Áp dụng nền</button><button class="btn ghost" id="thC" type="button">Xóa nền</button></div>
    <div class="preview" id="thP"></div><p class="form-error" id="thE" role="alert"></p></div>
    <div class="formcard"><span class="dsec">Nhạc nền</span><div class="status"><span class="dot" id="auDot"></span><span id="auS">Chưa có nhạc nền</span></div>
    <div class="acts"><label class="btn ghost upbtn">${ICO.music}Chọn tệp âm thanh<input type="file" id="auF" accept="audio/*" hidden></label>
      <button class="btn primary" id="auA" type="button" disabled>Áp dụng nhạc</button><button class="btn ghost" id="auC" type="button">Xóa nhạc</button></div><p class="form-error" id="auE" role="alert"></p></div>`;
  const $ = s => ctx.el.querySelector(s); let bg = null, au = null;
  const status = () => { const t = S.store.theme || {}, has = t.bgData && t.bgType && t.bgType !== "none";
    $("#thS").textContent = has ? "Đang dùng " + (t.bgType === "video" ? "video" : "ảnh") + " làm nền" : "Đang dùng nền mặc định"; $("#thDot").className = "dot" + (has ? " ok" : "");
    $("#auS").textContent = t.audioData ? "Đang phát: " + (t.audioName || "nhạc nền") : "Chưa có nhạc nền"; $("#auDot").className = "dot" + (t.audioData ? " ok" : ""); };
  status(); const u = S.subscribe(t => { if (t === "theme") status(); });
  $("#thF").addEventListener("change", async e => { const f = e.target.files[0]; e.target.value = ""; $("#thE").textContent = ""; if (!f) return;
    try { if (f.type.startsWith("image/")) { const d = await compressImage(f); if (d.length > MAX_DATA_LEN) return ($("#thE").textContent = "Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."); bg = { type: "image", data: d, name: f.name }; $("#thP").innerHTML = `<img src="${esc(d)}" alt="Xem trước hình nền">`; }
      else if (f.type.startsWith("video/")) { if (f.size > 6.5 * 1048576) return ($("#thE").textContent = "Video quá lớn (tối đa khoảng 6,5 MB)."); const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) return ($("#thE").textContent = "Video quá lớn."); bg = { type: "video", data: d, name: f.name }; $("#thP").innerHTML = `<video src="${esc(d)}" muted loop autoplay playsinline></video>`; }
      else return ($("#thE").textContent = "Chỉ hỗ trợ ảnh hoặc video."); $("#thA").disabled = false; } catch (x) { $("#thE").textContent = friendly(x); } });
  $("#thA").onclick = () => { if (!bg) return; const b = $("#thA"); b.disabled = true; S.setTheme({ bgType: bg.type, bgData: bg.data }).then(() => { toast("Đã áp dụng hình nền."); bg = null; $("#thP").innerHTML = ""; }).catch(x => { $("#thE").textContent = friendly(x); b.disabled = false; }); };
  $("#thC").onclick = async () => { if (!(await confirmDialog({ title: "Xóa hình nền?", message: "Hình nền sẽ bị gỡ khỏi website của mọi người.", ok: "Xóa nền", danger: true }))) return; S.setTheme({ bgType: "none", bgData: "" }).then(() => { bg = null; $("#thP").innerHTML = ""; $("#thA").disabled = true; toast("Đã xóa hình nền."); }).catch(x => toast(friendly(x), "err")); };
  $("#auF").addEventListener("change", async e => { const f = e.target.files[0]; e.target.value = ""; $("#auE").textContent = ""; if (!f) return;
    if (!f.type.startsWith("audio/")) return ($("#auE").textContent = "Tệp này không phải âm thanh."); if (f.size > 6.5 * 1048576) return ($("#auE").textContent = "Tệp quá lớn (tối đa khoảng 6,5 MB).");
    try { const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) return ($("#auE").textContent = "Tệp quá lớn."); au = { data: d, name: f.name }; $("#auA").disabled = false; $("#auS").textContent = "Sẵn sàng áp dụng: " + f.name; } catch (x) { $("#auE").textContent = friendly(x); } });
  $("#auA").onclick = () => { if (!au) return; const b = $("#auA"); b.disabled = true; S.setTheme({ audioData: au.data, audioName: au.name }).then(() => { toast("Đã áp dụng nhạc nền."); au = null; }).catch(x => { $("#auE").textContent = friendly(x); b.disabled = false; }); };
  $("#auC").onclick = async () => { if (!(await confirmDialog({ title: "Xóa nhạc nền?", message: "Nhạc nền sẽ bị gỡ khỏi website của mọi người.", ok: "Xóa nhạc", danger: true }))) return; S.setTheme({ audioData: "", audioName: "" }).then(() => { au = null; $("#auA").disabled = true; toast("Đã xóa nhạc nền."); }).catch(x => toast(friendly(x), "err")); };
  return u;
}
