/* Khu vực DEV. Mỗi hàm tự kiểm tra quyền (ngoài guard của router); quyền ghi thật do Firebase Rules quyết định. */
import { esc, fmtTime, toast, compressImage, readAsDataURL, vi } from "../lib/util.js";
import { ICO, PICK_ICONS, PICK_COLORS } from "../lib/icons.js";
import { MAX_DATA_LEN } from "../lib/config.js";
import * as S from "../lib/store.js";
import { session, onAuth } from "../lib/auth.js";
import { icoOf, lockedHTML, armDelete, emptyHTML, countOf } from "../lib/ui.js";
import { logHTML, onLog, dlog } from "../lib/log.js";

const DEV = [{ href: "/dev/data", t: "Quản lý dữ liệu", d: "Script, APK, iOS, Link và danh mục tùy chỉnh.", i: "box", c: "var(--accent-primary)" },
  { href: "/dev/categories", t: "Danh mục", d: "Thêm / xóa danh mục tùy chỉnh.", i: "grid", c: "var(--accent-secondary)" },
  { href: "/dev/users", t: "Người dùng", d: "Tài khoản đã đăng nhập vào website.", i: "users", c: "var(--cat-ios)" },
  { href: "/dev/theme", t: "Giao diện", d: "Nền ảnh/video và nhạc nền.", i: "paint", c: "var(--warning)" },
  { href: "/dev/system", t: "Hệ thống", d: "Bảo trì, thông báo, nhật ký.", i: "terminal", c: "var(--success)" },
  { href: "/bypass", t: "Bypass API", d: "Kết nối baconbypass.xyz.", i: "bolt", c: "var(--danger)" }];
const locked = ctx => { if (session.isDev) return false; ctx.setPage({ title: "Không có quyền" }); ctx.el.innerHTML = lockedHTML("Chỉ tài khoản DEV mới truy cập được khu vực này."); return true; };
const devCrumb = [{ label: "Dev Panel", href: "/dev" }];
const dataHref = c => "/dev/data/" + c.path;
async function cat(ctx) {
  if (ctx.def.catId) return S.catById(ctx.def.catId);
  await Promise.race([S.catsReady, new Promise(r => setTimeout(r, 6000))]);
  return S.catByNode(String(ctx.params.node || "").toLowerCase());
}

export function index(ctx) {
  if (locked(ctx)) return; ctx.setPage({ title: "Dev Panel", sub: "Bảng điều khiển quản trị." });
  const draw = () => { const total = S.store.cats.reduce((n, c) => n + countOf(c.id), 0), m = S.store.maint && S.store.maint.enabled;
    ctx.el.innerHTML = `<div class="statrow">
      <div class="stat"><small>Tổng mục dữ liệu</small><b>${total}</b></div><div class="stat"><small>Danh mục</small><b>${S.store.cats.length}</b></div>
      <div class="stat"><small>Người dùng</small><b>${S.store.users ? S.store.users.length : "—"}</b></div>
      <div class="stat"><small>Bảo trì</small><b class="${m ? "warn" : "okc"}">${m ? "BẬT" : "TẮT"}</b></div>
      <div class="stat"><small>Database</small><b class="${S.store.connected ? "okc" : "warn"}">${S.store.connected ? "Kết nối" : "Mất kết nối"}</b></div></div>
      <div class="cattiles">${DEV.map(d => `<a class="tile" href="${d.href}" style="--nc:${d.c}"><span class="sh" aria-hidden="true"></span><span class="tico">${ICO[d.i]}</span><b>${esc(d.t)}</b><small>${esc(d.d)}</small></a>`).join("")}</div>`; };
  draw(); return S.subscribe(t => { if (["data", "cats", "users", "maint", "conn"].includes(t)) draw(); });
}
export function data(ctx) {
  if (locked(ctx)) return; ctx.setPage({ title: "Quản lý dữ liệu", crumbs: devCrumb, sub: "Chọn danh mục để xem, thêm, sửa hoặc xóa." });
  const draw = () => { ctx.el.innerHTML = `<div class="cattiles">${S.store.cats.map(c => `<a class="tile" href="${dataHref(c)}" style="--nc:${c.color}"><span class="sh" aria-hidden="true"></span><span class="tico">${icoOf(c)}</span><span class="num">${countOf(c.id)}</span><b>${esc(c.label)}</b><small>${esc(c.sub || "")}</small></a>`).join("")}</div>`; };
  draw(); return S.subscribe(t => { if (t === "data" || t === "cats") draw(); });
}
export async function dataCat(ctx) {
  if (locked(ctx)) return; const c = await cat(ctx); if (!ctx.isCurrent()) return;
  const crumbs = devCrumb.concat([{ label: "Quản lý dữ liệu", href: "/dev/data" }]);
  if (!c) { ctx.setPage({ title: "Không tìm thấy", crumbs }); ctx.el.innerHTML = lockedHTML("Danh mục không tồn tại.", "/dev/data", "Quay lại"); return; }
  let q = ""; const base = S.catHref(c);
  ctx.el.innerHTML = `<div class="toolbar"><div class="fld grow"><label class="sr" for="flt">Lọc</label><input id="flt" type="search" placeholder="Lọc trong ${esc(c.label)}…" autocomplete="off"></div></div><div class="dlist" id="list"></div>`;
  const list = ctx.el.querySelector("#list");
  const draw = () => {
    const arr = S.items(c.id);
    ctx.setPage({ title: "Dữ liệu · " + c.label, color: c.color, crumbs, count: arr ? arr.length + " mục" : "…", actions: `<a class="btn btn-p" href="${base}/create" style="--cat:${c.color}">${ICO.plus}Thêm</a>` });
    if (arr == null) { list.innerHTML = S.store.status[c.id] === "error" ? `<div class="statebox err">${ICO.warn}<p>Không tải được dữ liệu.</p></div>` : '<div class="statebox"><p>Đang tải…</p></div>'; return; }
    const f = vi(q.trim()), res = f ? arr.filter(it => vi(it.name).includes(f)) : arr;
    list.innerHTML = res.length ? res.map(it => `<div class="drow" style="--cat:${c.color}"><span class="nm" title="${esc(it.name)}">${esc(it.name)}</span><small class="muted">${esc(fmtTime(it.ts))}</small>
      <a class="ib" href="${S.itemHref(c.id, it.key)}" aria-label="Xem ${esc(it.name)}">${ICO.eye}</a><a class="ib ed" href="${S.itemHref(c.id, it.key)}/edit" aria-label="Sửa ${esc(it.name)}">${ICO.pencil}</a>
      <button class="de" type="button" data-del="${esc(it.key)}" aria-label="Xóa ${esc(it.name)}">${ICO.trash}</button></div>`).join("") : emptyHTML(f ? "Không có mục khớp." : "Trống.");
  };
  ctx.el.querySelector("#flt").addEventListener("input", e => { q = e.target.value; draw(); });
  list.addEventListener("click", e => { const b = e.target.closest("[data-del]"); if (!b) return;
    armDelete(b, () => S.deleteItem(c.id, b.dataset.del).then(() => toast("Đã xóa.")).catch(x => toast(x.message, "err"))); });
  draw(); return S.subscribe((t, id) => { if ((t === "data" && id === c.id) || t === "cats") draw(); });
}
export function categories(ctx) {
  if (locked(ctx)) return; ctx.setPage({ title: "Danh mục", crumbs: devCrumb, sub: "Danh mục mặc định không thể xóa. Xóa danh mục tùy chỉnh KHÔNG xóa dữ liệu bên trong." });
  let icon = PICK_ICONS[0], color = PICK_COLORS[0];
  ctx.el.innerHTML = `<form class="formcard" id="f" novalidate>
    <div class="fld"><label for="name">Tên danh mục <b class="req">*</b></label><input id="name" name="name" placeholder="Ví dụ: Mod, Tool…" autocomplete="off" maxlength="40"><p class="ferr" data-err="name" role="alert"></p></div>
    <div class="fld"><label for="sub">Mô tả ngắn</label><input id="sub" name="sub" autocomplete="off" maxlength="120"></div>
    <div class="fld"><label for="icon">Biểu tượng</label><select id="icon" name="icon">${PICK_ICONS.map(k => `<option value="${k}">${k}</option>`).join("")}</select></div>
    <div class="fld"><label>Màu sắc</label><div class="swatches" id="sw"></div></div>
    <p class="form-err" id="err" role="alert"></p>
    <button class="btn btn-p btn-wide" type="submit" style="--cat:var(--accent-secondary)">${ICO.plus}<span>Thêm danh mục</span></button></form>
    <span class="dsec" style="margin:22px 0 10px">Tất cả danh mục</span><div class="dlist" id="list"></div>`;
  const sw = ctx.el.querySelector("#sw"), list = ctx.el.querySelector("#list"), f = ctx.el.querySelector("#f"), err = ctx.el.querySelector("#err");
  const drawSw = () => { sw.innerHTML = PICK_COLORS.map(c => `<button type="button" data-col="${c}" class="${c === color ? "on" : ""}" style="background:${c}" aria-label="Màu ${c}"></button>`).join(""); };
  sw.addEventListener("click", e => { const b = e.target.closest("[data-col]"); if (b) { color = b.dataset.col; drawSw(); } }); drawSw();
  f.icon.addEventListener("change", e => { icon = e.target.value; });
  const drawList = () => { list.innerHTML = S.store.cats.map(c => `<div class="drow"><span class="ci" style="color:${c.color}">${icoOf(c)}</span><span class="nm">${esc(c.label)} <small class="muted">(${esc(c.node)})${c.base ? " · mặc định" : ""}</small></span>
    <a class="ib" href="${S.catHref(c)}" aria-label="Mở ${esc(c.label)}">${ICO.eye}</a>${c.base ? "" : `<button class="de" type="button" data-cat="${esc(c.id)}" aria-label="Xóa danh mục ${esc(c.label)}">${ICO.trash}</button>`}</div>`).join(""); };
  list.addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (b) armDelete(b, () => S.deleteCategory(b.dataset.cat).then(() => toast("Đã xóa danh mục.")).catch(x => toast(x.message, "err"))); });
  f.addEventListener("submit", async e => { e.preventDefault(); err.textContent = ""; ctx.el.querySelector('[data-err="name"]').textContent = "";
    const name = f.name.value.trim(); if (!name) { ctx.el.querySelector('[data-err="name"]').textContent = "Thiếu tên danh mục."; f.name.focus(); return; }
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    try { await S.addCategory({ name, sub: f.sub.value.trim(), icon, color }); toast("Đã thêm danh mục " + name + "."); f.reset(); icon = PICK_ICONS[0]; }
    catch (x) { err.textContent = x.message; } btn.disabled = false; });
  drawList(); return S.subscribe(t => { if (t === "cats") drawList(); });
}
export function users(ctx) {
  if (locked(ctx)) return; ctx.setPage({ title: "Quản lý người dùng", crumbs: devCrumb, sub: "Danh sách tài khoản đã đăng nhập kể từ khi bật tính năng này." });
  const draw = () => { const u = S.store.users;
    ctx.setPage({ count: u ? u.length + " người dùng" : "…" });
    if (u == null) { ctx.el.innerHTML = '<div class="statebox"><p>Đang tải hoặc chưa có quyền đọc (cần triển khai database.rules.json).</p></div>'; return; }
    ctx.el.innerHTML = u.length ? `<div class="tablewrap"><table class="dtable"><thead><tr><th>Người dùng</th><th>Email</th><th>Đăng nhập qua</th><th>Lần cuối</th></tr></thead><tbody>${u.map(x => `<tr>
      <td><span class="uav">${x.photo ? `<img src="${esc(x.photo)}" alt="" referrerpolicy="no-referrer">` : ICO.users}</span>${esc(x.name || "—")}</td>
      <td>${esc(x.email || "")}${String(x.email || "").toLowerCase() === "hminhgalaxy@gmail.com" ? ' <span class="devtag">DEV</span>' : ""}</td><td>${esc((x.provider || "").replace(".com", ""))}</td><td>${esc(fmtTime(x.lastLogin))}</td></tr>`).join("")}</tbody></table></div>`
      : emptyHTML("Chưa có người dùng nào được ghi nhận."); };
  draw(); return S.subscribe(t => { if (t === "users") draw(); });
}
export function theme(ctx) {
  if (locked(ctx)) return; ctx.setPage({ title: "Quản lý giao diện", crumbs: devCrumb, sub: "Nền toàn site và nhạc nền, lưu trong Realtime Database." });
  ctx.el.innerHTML = `<div class="formcard"><span class="dsec">Nền web (ảnh / video)</span><div class="thstatus" id="thS">Nền: mặc định</div>
    <div class="uprow"><label class="btn btn-g upbtn">${ICO.eye}Chọn ảnh / video<input type="file" id="thF" accept="image/*,video/*" hidden></label>
      <button class="btn btn-p" id="thA" type="button" disabled style="--cat:var(--accent-primary)">Áp dụng nền</button><button class="btn btn-g" id="thC" type="button">Xóa nền</button></div>
    <div class="thpreview" id="thP"></div><p class="form-err" id="thE"></p>
    <span class="dsec">Âm thanh khi vào web</span><div class="thstatus" id="auS">Âm thanh: không có</div>
    <div class="uprow"><label class="btn btn-g upbtn">${ICO.music}Chọn tệp âm thanh<input type="file" id="auF" accept="audio/*" hidden></label>
      <button class="btn btn-p" id="auA" type="button" disabled style="--cat:var(--warning)">Áp dụng âm thanh</button><button class="btn btn-g" id="auC" type="button">Xóa âm thanh</button></div><p class="form-err" id="auE"></p></div>`;
  const $ = s => ctx.el.querySelector(s); let bg = null, au = null;
  const status = () => { const t = S.store.theme || {}, has = t.bgData && t.bgType && t.bgType !== "none";
    $("#thS").textContent = has ? "Nền: đang dùng " + (t.bgType === "video" ? "video" : "ảnh") : "Nền: mặc định"; $("#auS").textContent = t.audioData ? "Âm thanh: " + (t.audioName || "đang bật") : "Âm thanh: không có"; };
  status(); const u = S.subscribe(t => { if (t === "theme") status(); });
  $("#thF").addEventListener("change", async e => { const f = e.target.files[0]; e.target.value = ""; $("#thE").textContent = ""; if (!f) return;
    try { if (f.type.startsWith("image/")) { const d = await compressImage(f); if (d.length > MAX_DATA_LEN) return ($("#thE").textContent = "Ảnh vẫn quá lớn (~9MB)."); bg = { type: "image", data: d, name: f.name }; $("#thP").innerHTML = `<img src="${esc(d)}" alt="Xem trước nền">`; }
      else if (f.type.startsWith("video/")) { if (f.size > 6.5 * 1048576) return ($("#thE").textContent = "Video quá lớn (~6.5MB)."); const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) return ($("#thE").textContent = "Video quá lớn."); bg = { type: "video", data: d, name: f.name }; $("#thP").innerHTML = `<video src="${esc(d)}" muted loop autoplay playsinline></video>`; }
      else return ($("#thE").textContent = "Chỉ hỗ trợ ảnh hoặc video."); $("#thA").disabled = false; } catch (x) { $("#thE").textContent = x.message; } });
  $("#thA").onclick = () => { if (!bg) return; const b = $("#thA"); b.disabled = true; S.setTheme({ bgType: bg.type, bgData: bg.data }).then(() => { toast("Đã áp dụng nền."); bg = null; $("#thP").innerHTML = ""; }).catch(x => { $("#thE").textContent = x.message; b.disabled = false; }); };
  $("#thC").onclick = () => S.setTheme({ bgType: "none", bgData: "" }).then(() => { bg = null; $("#thP").innerHTML = ""; $("#thA").disabled = true; toast("Đã xóa nền."); }).catch(x => toast(x.message, "err"));
  $("#auF").addEventListener("change", async e => { const f = e.target.files[0]; e.target.value = ""; $("#auE").textContent = ""; if (!f) return;
    if (!f.type.startsWith("audio/")) return ($("#auE").textContent = "Tệp không phải âm thanh."); if (f.size > 6.5 * 1048576) return ($("#auE").textContent = "Tệp quá lớn (~6.5MB).");
    try { const d = await readAsDataURL(f); if (d.length > MAX_DATA_LEN) return ($("#auE").textContent = "Tệp quá lớn."); au = { data: d, name: f.name }; $("#auA").disabled = false; $("#auS").textContent = "Âm thanh: sẵn sàng áp dụng — " + f.name; } catch (x) { $("#auE").textContent = x.message; } });
  $("#auA").onclick = () => { if (!au) return; const b = $("#auA"); b.disabled = true; S.setTheme({ audioData: au.data, audioName: au.name }).then(() => { toast("Đã áp dụng âm thanh."); au = null; }).catch(x => { $("#auE").textContent = x.message; b.disabled = false; }); };
  $("#auC").onclick = () => S.setTheme({ audioData: "", audioName: "" }).then(() => { au = null; $("#auA").disabled = true; toast("Đã xóa âm thanh."); }).catch(x => toast(x.message, "err"));
  return u;
}
export function system(ctx) {
  if (locked(ctx)) return; ctx.setPage({ title: "Hệ thống", crumbs: devCrumb, sub: "Bảo trì, thông báo và nhật ký." });
  ctx.el.innerHTML = `<div class="formcard"><span class="dsec">Kết nối</span><div class="maint-state"><span class="dot" id="cDot"></span><span id="cTxt" style="flex:1"></span></div>
    <span class="dsec" id="maintsec">Quản lý bảo trì</span><div class="maint-state"><span class="dot" id="mDot"></span><span id="mTxt" style="flex:1">Đang kiểm tra…</span><button class="btn btn-g" id="mBtn" type="button">—</button></div>
    <div class="mnt-mins"><label for="mins">Tự động mở sau (phút)</label><input id="mins" type="number" min="1" step="1" placeholder="1"><span class="muted">Bỏ trống = 1 phút</span></div>
    <span class="dsec" id="notice">Bảng thông báo khi vào web</span>
    <div class="switch-row"><span>Hiển thị thông báo khi vào web</span><label class="sw"><input type="checkbox" id="nOn"><i></i></label></div>
    <form id="nf" class="stack" novalidate><div class="fld"><label for="nT">Tiêu đề</label><input id="nT" autocomplete="off" placeholder="Thông báo" maxlength="120"></div>
      <div class="fld"><label for="nB">Nội dung</label><textarea id="nB" class="plain" rows="4" maxlength="2000" placeholder="Nội dung thông báo…"></textarea></div><p class="form-err" id="nE" role="alert"></p>
      <button class="btn btn-p btn-wide" type="submit" style="--cat:var(--warning)">${ICO.bell}Cập nhật thông báo</button></form>
    <span class="dsec">Nhật ký</span><div id="devLog"></div></div>`;
  const $ = s => ctx.el.querySelector(s); let filled = false;
  const conn = () => { $("#cDot").style.background = S.store.connected ? "var(--success)" : "var(--danger)"; $("#cTxt").textContent = S.store.connected ? "Realtime Database: đã kết nối" : "Realtime Database: mất kết nối"; };
  const maint = () => { const m = S.store.maint, on = !!(m && m.enabled); $("#mDot").style.background = on ? "var(--warning)" : "var(--success)";
    $("#mTxt").textContent = (on ? "Bảo trì: BẬT" : "Bảo trì: TẮT") + (on && m.until ? " · tự mở lúc " + fmtTime(m.until) : ""); const b = $("#mBtn"); b.textContent = on ? "MỞ WEBSITE" : "BẬT BẢO TRÌ"; b.className = "btn " + (on ? "btn-p" : "btn-g"); if (on) b.style.setProperty("--cat", "var(--success)"); };
  const notice = () => { const n = S.store.notice; $("#nOn").checked = !!(n && n.enabled !== false); if (!filled && n) { filled = true; $("#nT").value = n.title || ""; $("#nB").value = n.body || ""; } };
  conn(); maint(); notice(); $("#devLog").innerHTML = logHTML();
  const u1 = S.subscribe(t => { if (t === "conn") conn(); else if (t === "maint") maint(); else if (t === "notice") notice(); }), u2 = onLog(() => { const l = $("#devLog"); if (l) l.innerHTML = logHTML(); });
  $("#mBtn").onclick = () => { const on = !!(S.store.maint && S.store.maint.enabled); let m = parseInt($("#mins").value, 10); if (!isFinite(m) || m < 1) m = 1;
    S.setMaintenance(!on, m).then(() => toast(on ? "Đã mở website." : "Đã bật bảo trì (tự mở sau " + m + " phút).")).catch(x => toast(x.message, "err")); };
  $("#nOn").onchange = e => { const v = e.target.checked; S.setNotice({ enabled: v }).then(() => toast(v ? "Đã bật thông báo." : "Đã tắt thông báo.")).catch(x => { e.target.checked = !v; toast(x.message, "err"); }); };
  $("#nf").addEventListener("submit", e => { e.preventDefault(); $("#nE").textContent = ""; const title = $("#nT").value.trim(), body = $("#nB").value.trim();
    if (!body) return ($("#nE").textContent = "Nội dung thông báo không được để trống.");
    S.setNotice({ title, body, enabled: !(S.store.notice && S.store.notice.enabled === false) }).then(() => toast("Đã cập nhật thông báo.")).catch(x => ($("#nE").textContent = x.message)); });
  if (location.hash) setTimeout(() => { const t = ctx.el.querySelector(location.hash); t && t.scrollIntoView(); }, 100);
  return () => { u1(); u2(); };
}
