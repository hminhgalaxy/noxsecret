/* Đính kèm ảnh / video / tệp trong chat.
   Tệp được máy chủ kiểm tra rồi lưu vào Realtime Database (không có Firebase Storage) nên có giới hạn dung lượng:
   ảnh ≤ 300 KB (tự thu nhỏ & nén), video và tệp ≤ 450 KB. Nội dung tệp chỉ tải khi cần xem. */
import { db } from "./firebase.js";
import { api } from "./account.js";
import { esc } from "./util.js";
import { ICO } from "./icons.js";

export const LIMITS = { image: 300 * 1024, video: 450 * 1024, file: 450 * 1024 };
export const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,.pdf,.zip,.txt,.lua,.json,.md,.csv,.log,.js";
const KIND = { jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", mp4: "video", webm: "video", pdf: "file", zip: "file", txt: "file", lua: "file", json: "file", md: "file", csv: "file", log: "file", js: "file" };
const extOf = n => (String(n).split(".").pop() || "").toLowerCase();
export const kindOf = name => KIND[extOf(name)] || "";
export const fmtSize = b => (b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : b >= 1024 ? Math.round(b / 1024) + " KB" : b + " B");
const bad = (m, code = "app/file") => Object.assign(new Error(m), { code });

const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(bad("Không đọc được tệp này.")); r.readAsDataURL(blob); });
const bytesOf = url => Math.floor(((url.length - url.indexOf(",") - 1) * 3) / 4);

/* Thu nhỏ ảnh cho đến khi ≤ giới hạn; ảnh đã nhẹ thì giữ nguyên (giữ ảnh GIF động) */
async function squeezeImage(file) {
  if (file.size <= LIMITS.image && /^image\/(png|webp|jpeg|gif)$/.test(file.type)) return { name: file.name, data: await toDataUrl(file) };
  if (/gif$/.test(file.type)) throw bad("Ảnh GIF quá nặng (tối đa " + fmtSize(LIMITS.image) + "). Hãy chọn GIF nhỏ hơn hoặc gửi ảnh thường.");
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (_) { throw bad("Không đọc được ảnh này."); }
  const w = bmp.width, h = bmp.height;
  for (const maxW of [1280, 1024, 800, 640, 480]) {
    const k = Math.min(1, maxW / w), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = "high"; x.drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.7, 0.58, 0.46]) { const d = c.toDataURL("image/jpeg", q); if (bytesOf(d) <= LIMITS.image - 2048) return { name: file.name.replace(/\.[^.]+$/, "") + ".jpg", data: d }; }
  }
  throw bad("Ảnh quá lớn, hãy chọn ảnh nhỏ hơn.");
}

/* Kiểm tra + chuẩn bị tệp (chưa gửi) */
export async function prepareFile(file) {
  const name = String(file && file.name || ""), kind = kindOf(name);
  if (!kind) throw bad("Loại tệp này chưa được hỗ trợ. Hãy gửi ảnh, video (MP4/WebM), PDF, ZIP hoặc tệp văn bản.");
  if (kind === "image") { const r = await squeezeImage(file); return { ...r, kind, size: bytesOf(r.data), type: r.data.slice(5, r.data.indexOf(";")) }; }
  if (file.size > LIMITS[kind]) throw bad((kind === "video" ? "Video" : "Tệp") + " quá nặng: tối đa " + fmtSize(LIMITS[kind]) + " (do giới hạn lưu trữ). Hãy cắt ngắn/nén bớt hoặc gửi liên kết.");
  if (!file.size) throw bad("Tệp này trống.");
  return { name, data: await toDataUrl(file), kind, size: file.size, type: file.type || "" };
}

/* Gửi tệp lên máy chủ → { id, name, mime, kind, size } dùng cho tin nhắn */
export async function uploadChatFile(p, { tid, owner }) {
  const r = await api("chat-file", { tid, owner, name: p.name, data: p.data });
  if (!r.ok) {
    const M = { too_big: "Tệp quá lớn.", bad_file: "Tệp này không được hỗ trợ hoặc bị hỏng.", too_many_files: "Cuộc trò chuyện này đã đạt giới hạn số tệp.", closed: "Cuộc trò chuyện này đã đóng.", muted: "Bạn đang bị tắt tiếng nên chưa gửi được tệp.", rate_limited: "Bạn gửi tệp hơi nhanh, hãy thử lại sau ít phút.", unverified: "Hãy xác minh email trước khi gửi tệp." };
    throw bad(M[r.code] || (r.message && /[ạ-ỹ]/.test(r.message) ? r.message : "Chưa gửi được tệp. Vui lòng thử lại."), "api/" + r.code);
  }
  return r.att;
}

/* ───── Hiển thị trong tin nhắn (tải nội dung khi cần, có nhớ tạm) ───── */
const cache = new Map(), inflight = new Map();
export function loadFile(owner, tid, fid) {
  const k = owner + "/" + tid + "/" + fid; if (cache.has(k)) return Promise.resolve(cache.get(k));
  if (inflight.has(k)) return inflight.get(k);
  const pr = (db ? db.ref("nox_files/" + k + "/data").once("value").then(s => s.val()) : Promise.resolve(null)).then(v => { inflight.delete(k); if (typeof v !== "string") throw bad("Không tải được tệp."); if (cache.size > 40) cache.delete(cache.keys().next().value); cache.set(k, v); return v; }, e => { inflight.delete(k); throw e; });
  inflight.set(k, pr); return pr;
}
const cached = (owner, tid, fid) => cache.get(owner + "/" + tid + "/" + fid) || "";

/* HTML của phần đính kèm trong bong bóng chat. Ảnh tự tải; video và tệp bấm mới tải. */
export function attHTML(a, owner, tid) {
  if (!a || typeof a !== "object") return "";
  const k = a.kind === "image" || a.kind === "video" ? a.kind : "file", data = cached(owner, tid, a.id), at = `data-att="${esc(a.id)}" data-kind="${k}" data-o="${esc(owner)}" data-t="${esc(tid)}"`;
  if (k === "image") return `<button class="att att-img${data ? " ready" : ""}" type="button" ${at} aria-label="Xem ảnh ${esc(a.name)}">${data ? `<img src="${data}" alt="${esc(a.name)}" translate="no">` : `<span class="att-ph">${ICO.image}<small>${esc(fmtSize(a.size))}</small></span>`}</button>`;
  if (k === "video") return `<div class="att att-vid${data ? " ready" : ""}" ${at}>${data ? `<video src="${data}" controls playsinline preload="metadata"></video>` : `<button class="att-play" type="button" aria-label="Tải và phát video ${esc(a.name)}">${ICO.video}<span translate="no">${esc(a.name)}</span><small>${esc(fmtSize(a.size))} · Bấm để phát</small></button>`}</div>`;
  return `<button class="att att-file" type="button" ${at} aria-label="Tải tệp ${esc(a.name)}"><span class="att-ic">${ICO.file}</span><span class="att-tx"><b translate="no">${esc(a.name)}</b><small>${esc(fmtSize(a.size))} · Bấm để tải</small></span><span class="att-dl">${ICO.download2}</span></button>`;
}

function download(name, data) { const a = document.createElement("a"); a.href = data; a.download = name; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
function lightbox(src, name) {
  const o = document.createElement("div"); o.className = "att-lb"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Xem ảnh " + name);
  o.innerHTML = `<img src="${src}" alt="${esc(name)}" translate="no"><button type="button" class="att-x" aria-label="Đóng">${ICO.x}</button>`;
  const close = () => { o.remove(); removeEventListener("keydown", key, true); }, key = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  o.addEventListener("click", close); addEventListener("keydown", key, true); document.body.appendChild(o); o.querySelector(".att-x").focus();
}

/* Gắn xử lý cho một khung chứa tin nhắn: tự tải ảnh, bấm video/tệp để tải. Gọi lại sau mỗi lần vẽ lại. */
export function wireAttachments(root, msgsById) {
  root.querySelectorAll(".att[data-att]:not([data-w])").forEach(el => {
    el.dataset.w = "1"; const { att: fid, kind, o, t } = el.dataset;
    const meta = msgsById(fid) || { name: "tep" };
    const fill = data => {
      if (!el.isConnected) return;
      if (kind === "image") { el.classList.add("ready"); el.innerHTML = `<img src="${data}" alt="${esc(meta.name)}" translate="no">`; }
      else if (kind === "video") { el.classList.add("ready"); el.innerHTML = `<video src="${data}" controls playsinline preload="metadata"></video>`; const v = el.querySelector("video"); v.play().catch(() => {}); }
    };
    if (kind === "image") { if (!el.classList.contains("ready")) loadFile(o, t, fid).then(fill).catch(() => { el.innerHTML = `<span class="att-ph err">${ICO.warn}<small>Không tải được ảnh</small></span>`; }); }
    el.addEventListener("click", async e => {
      if (kind === "image") { const d = cached(o, t, fid); if (d) lightbox(d, meta.name); return; }
      if (kind === "video") { if (el.classList.contains("ready") || e.target.closest("video")) return; const b = el.querySelector(".att-play"); if (b) b.classList.add("busy"); try { fill(await loadFile(o, t, fid)); } catch (_) { if (b) { b.classList.remove("busy"); b.querySelector("small").textContent = "Không tải được, bấm để thử lại"; } } return; }
      el.classList.add("busy"); try { download(meta.name, await loadFile(o, t, fid)); } catch (_) { el.querySelector("small").textContent = "Không tải được, bấm để thử lại"; } el.classList.remove("busy");
    });
  });
}
