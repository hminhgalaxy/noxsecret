import { esc, fmtTime, validUrl, vi, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { session, onAuth } from "../lib/auth.js";
import { icoOf, skeletonHTML, emptyHTML, errorHTML, lockedHTML, cardHTML, observeAnim, armDelete, fieldErrors } from "../lib/ui.js";

async function resolveCat(ctx) {
  if (ctx.def.catId) return S.catById(ctx.def.catId);
  await Promise.race([S.catsReady, new Promise(r => setTimeout(r, 6000))]);
  return S.catByNode(String(ctx.params.node || "").toLowerCase());
}
function notFound(ctx, what) {
  ctx.setPage({ title: "Không tìm thấy", crumbs: [] });
  ctx.el.innerHTML = `<div class="statebox">${ICO.warn}<p>${esc(what)}</p><a class="btn btn-g" href="/">Về trang chủ</a></div>`;
}
const crumbsFor = cat => (cat.custom ? [{ label: "Danh mục", href: "/categories" }] : []);
const loaded = cat => S.store.data[cat.id] != null || S.store.status[cat.id] === "error";

/* ───── DANH SÁCH: /scripts, /apk, /ios, /links, /c/:node ───── */
export async function list(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  let q = "";
  const head = () => { const n = (S.items(cat.id) || []).length;
    ctx.setPage({ title: cat.label, sub: cat.sub, color: cat.color, crumbs: crumbsFor(cat), count: S.items(cat.id) ? n + " mục" : "…",
      actions: session.isDev ? `<a class="btn btn-p" href="${S.catHref(cat)}/create" style="--cat:${cat.color}">${ICO.plus}Thêm ${esc(cat.label)}</a>` : "" }); };
  ctx.el.innerHTML = `<div class="toolbar"><div class="fld grow"><label class="sr" for="catFilter">Lọc</label><input id="catFilter" type="search" placeholder="Lọc trong ${esc(cat.label)}…" autocomplete="off"></div></div><div class="grid" id="grid"></div>`;
  const grid = ctx.el.querySelector("#grid");
  const draw = () => {
    head(); const arr = S.items(cat.id);
    if (S.store.status[cat.id] === "error" && arr == null) { grid.innerHTML = errorHTML(cat.id); return; }
    if (arr == null) { grid.innerHTML = skeletonHTML(); return; }
    const f = vi(q.trim()), res = f ? arr.filter(it => vi(it.name).includes(f) || vi(it.desc).includes(f) || vi(it.code).includes(f)) : arr;
    grid.innerHTML = res.length ? res.map((it, i) => cardHTML(it, cat.id, i, false)).join("") : emptyHTML(f ? "Không có mục khớp bộ lọc." : "Chưa có " + cat.label + ".");
    observeAnim(grid);
  };
  ctx.el.querySelector("#catFilter").addEventListener("input", e => { q = e.target.value; draw(); });
  draw();
  const u1 = S.subscribe((t, id) => { if ((t === "data" && id === cat.id) || t === "cats") draw(); }), u2 = onAuth(draw);
  return () => { u1(); u2(); };
}

/* ───── CHI TIẾT: /scripts/:id … ───── */
export async function detail(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  const key = ctx.params.id, base = S.catHref(cat);
  const draw = () => {
    if (!loaded(cat)) { ctx.setPage({ title: cat.label, color: cat.color, crumbs: crumbsFor(cat) }); ctx.el.innerHTML = `<div class="grid one">${skeletonHTML(1)}</div>`; return; }
    const it = S.item(cat.id, key);
    if (!it) { ctx.setPage({ title: "Không tìm thấy mục", color: cat.color, crumbs: crumbsFor(cat).concat([{ label: cat.label, href: base }]) });
      ctx.el.innerHTML = `<div class="statebox">${ICO.warn}<p>Mục này không tồn tại hoặc đã bị xóa.</p><a class="btn btn-g" href="${base}">${ICO.back}Quay lại ${esc(cat.label)}</a></div>`; return; }
    ctx.setPage({ title: it.name, color: cat.color, crumbs: crumbsFor(cat).concat([{ label: cat.label, href: base }]),
      actions: session.isDev ? `<a class="btn btn-g" href="${base}/${encodeURIComponent(key)}/edit">${ICO.pencil}Sửa</a>` : "" });
    const hasUrl = validUrl(it.url), times = [];
    if (it.created) times.push("Tạo lúc " + fmtTime(it.created)); if (it.ts && it.ts !== it.created) times.push("Cập nhật " + fmtTime(it.ts));
    ctx.el.innerHTML = `<article class="detail" style="--cat:${cat.color}">
      <div class="dt-meta"><span class="chip">${esc(cat.label)}</span>${it.vault ? `<span class="chip" style="--cat:var(--warning)">VAULT</span>` : ""}
        ${it.copies != null ? `<span class="t">Đã sao chép: ${it.copies}</span>` : ""}${times.map(t => `<span class="t">${esc(t)}</span>`).join("")}</div>
      ${it.img ? `<img class="dt-img" src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      ${it.desc ? `<p class="dt-desc">${esc(it.desc)}</p>` : ""}
      ${it.code ? `<pre class="dt-code" tabindex="0">${esc(it.code)}</pre>` : ""}
      ${hasUrl ? `<div class="dt-url"><i></i><code>${esc(it.url.trim())}</code></div>` : ""}
      <div class="dt-acts">
        ${it.code ? `<button class="btn btn-p" type="button" data-act="copycode" data-cat="${esc(cat.id)}" data-key="${esc(it.key)}">${ICO.copy}Sao chép code</button>` : ""}
        ${hasUrl ? `<a class="btn btn-p" href="${esc(it.url.trim())}" target="_blank" rel="noopener noreferrer">${ICO.ext}Mở link</a><button class="btn btn-g" type="button" data-act="copyurl" data-url="${esc(it.url.trim())}">${ICO.copy}Sao chép link</button>` : ""}
        <a class="btn btn-g" href="${base}">${ICO.back}Quay lại</a>
        ${session.isDev ? `<button class="btn btn-g danger" type="button" id="delBtn">${ICO.trash}Xóa</button>` : ""}
      </div></article>`;
    const del = ctx.el.querySelector("#delBtn");
    if (del) del.addEventListener("click", () => armDelete(del, () => S.deleteItem(cat.id, key).then(() => { toast("Đã xóa."); ctx.navigate(base); }).catch(e => toast(e.message, "err"))));
  };
  draw();
  const u1 = S.subscribe((t, id) => { if ((t === "data" && id === cat.id) || t === "cats") draw(); }), u2 = onAuth(draw);
  return () => { u1(); u2(); };
}

/* ───── FORM THÊM / SỬA: /scripts/create, /scripts/:id/edit … (chỉ DEV) ───── */
export function fieldsFor(cat) {
  const f = [{ k: "name", label: "Tên", req: true, ph: "Tên hiển thị" }, { k: "desc", label: "Mô tả", area: true, rows: 3, plain: true }];
  if (cat.id === "script") f.push({ k: "code", label: "Code", req: true, area: true, rows: 12, mono: true });
  else if (cat.base) f.push({ k: "url", label: "Link", req: true, type: "url", ph: "https://…" });
  else { f.push({ k: "url", label: "Link", type: "url", ph: "https://…" }); f.push({ k: "code", label: "Code", area: true, rows: 10, mono: true }); }
  f.push({ k: "img", label: "Link ảnh (tùy chọn)", type: "url", ph: "https://…/anh.jpg" });
  if (cat.id === "apk" || cat.id === "ios") f.push({ k: "vault", label: "Đánh dấu VAULT", check: true });
  return f;
}
export async function form(ctx) {
  const cat = await resolveCat(ctx); if (!ctx.isCurrent()) return;
  if (!cat) return notFound(ctx, "Danh mục này không tồn tại.");
  const base = S.catHref(cat), edit = ctx.def.mode === "edit", key = ctx.params.id;
  const crumbs = crumbsFor(cat).concat([{ label: cat.label, href: base }]);
  if (!session.isDev) { ctx.setPage({ title: "Không có quyền", crumbs }); ctx.el.innerHTML = lockedHTML("Chỉ tài khoản DEV mới được thêm hoặc sửa dữ liệu."); return; }
  ctx.setPage({ title: edit ? "Chỉnh sửa" : "Thêm " + cat.label, color: cat.color, crumbs });
  const fields = fieldsFor(cat);
  const render = it => {
    if (edit) ctx.setPage({ title: "Chỉnh sửa: " + it.name, color: cat.color, crumbs });
    const val = k => it ? (k === "name" && it.name === "(không tên)" ? "" : (it[k] ?? "")) : "";
    ctx.el.innerHTML = `<form class="formcard" id="itemForm" novalidate style="--cat:${cat.color}">
      ${fields.map(f => f.check
        ? `<div class="switch-row"><span>${esc(f.label)}</span><label class="sw"><input type="checkbox" name="${f.k}" ${it && it[f.k] ? "checked" : ""}><i></i></label></div>`
        : `<div class="fld"><label for="f_${f.k}">${esc(f.label)}${f.req ? ' <b class="req" aria-hidden="true">*</b>' : ""}</label>
          ${f.area ? `<textarea id="f_${f.k}" name="${f.k}" rows="${f.rows || 4}" spellcheck="false" ${f.plain ? 'class="plain"' : ""}>${esc(val(f.k))}</textarea>`
            : `<input id="f_${f.k}" name="${f.k}" type="${f.type || "text"}" value="${esc(val(f.k))}" placeholder="${esc(f.ph || "")}" autocomplete="off" ${f.type === "url" ? 'inputmode="url"' : ""}>`}
          <p class="ferr" data-err="${f.k}" role="alert"></p></div>`).join("")}
      <p class="form-err" id="formErr" role="alert" aria-live="polite"></p>
      <div class="form-acts"><button class="btn btn-p" type="submit" id="saveBtn">${ICO.plus}<span>${edit ? "Lưu chỉnh sửa" : "Lưu"}</span></button><a class="btn btn-g" href="${base}${edit ? "/" + encodeURIComponent(key) : ""}">Hủy</a></div></form>`;
    const fm = ctx.el.querySelector("#itemForm"), btn = fm.querySelector("#saveBtn"), err = fm.querySelector("#formErr");
    fm.addEventListener("submit", async e => {
      e.preventDefault(); err.textContent = "";
      const v = {}; fields.forEach(f => { const el = fm.elements[f.k]; v[f.k] = f.check ? el.checked : (f.k === "code" ? el.value : el.value.trim()); });
      const full = { name: "", desc: "", url: "", code: "", img: "", ...v };
      const errs = S.validateItem(cat, full); fieldErrors(fm, errs); if (Object.keys(errs).length) return;
      if (!session.isDev) { err.textContent = "Bạn không có quyền thực hiện thao tác này."; return; }
      btn.disabled = true; btn.querySelector("span").textContent = "Đang lưu…";
      try { await S.saveItem(cat.id, edit ? key : null, v); toast(edit ? "Đã lưu chỉnh sửa." : "Đã thêm dữ liệu."); ctx.navigate(base); }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.querySelector("span").textContent = edit ? "Lưu chỉnh sửa" : "Lưu"; }
    });
    setTimeout(() => { const n = fm.elements.name; n && n.focus({ preventScroll: true }); }, 150);
  };
  if (!edit) { render(null); return; }
  ctx.el.innerHTML = `<div class="grid one">${skeletonHTML(1)}</div>`;
  let done = false;
  const tryRender = () => {
    if (done || !loaded(cat)) return; const it = S.item(cat.id, key); done = true;
    if (!it) { ctx.setPage({ title: "Không tìm thấy mục", crumbs }); ctx.el.innerHTML = `<div class="statebox">${ICO.warn}<p>Mục này không tồn tại hoặc đã bị xóa.</p><a class="btn btn-g" href="${base}">${ICO.back}Quay lại</a></div>`; return; }
    render(it);
  };
  tryRender(); const u = S.subscribe(t => { if (t === "data") tryRender(); });
  return u;
}
