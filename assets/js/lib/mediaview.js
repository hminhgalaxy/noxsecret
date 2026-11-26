/* Ảnh minh họa + video do dev đăng cho từng mục trong "Share". Chỉ nhận link http(s); YouTube nhúng bằng youtube-nocookie,
   tệp .mp4/.webm/.mov chạy bằng thẻ <video>, link khác hiện nút "Xem video". Mọi giá trị đều được thoát HTML. */
import { esc, validUrl } from "./util.js";
import { ICO } from "./icons.js";

const YT = /^(?:https?:)?\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/;
const FILE = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i;
export function videoInfo(url) {
  const u = String(url || "").trim(); if (!validUrl(u)) return null;
  const y = YT.exec(u); if (y) return { kind: "yt", id: y[1], src: "https://www.youtube-nocookie.com/embed/" + y[1] + "?rel=0&modestbranding=1", url: u };
  if (FILE.test(u)) return { kind: "file", src: u, url: u };
  return { kind: "link", src: u, url: u };
}
export const gallery = it => [it && it.img, it && it.img2, it && it.img3].filter(v => typeof v === "string" && v);
export const hasMedia = it => !!(gallery(it).length || (it && it.video));
/* Khối media đầy đủ cho trang chi tiết */
export function mediaHTML(it) {
  const g = gallery(it), v = videoInfo(it.video); if (!g.length && !v) return "";
  const vid = !v ? "" : v.kind === "yt" ? `<div class="md-video"><iframe src="${esc(v.src)}" title="Video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
    : v.kind === "file" ? `<div class="md-video"><video src="${esc(v.src)}" controls playsinline preload="metadata"></video></div>`
    : `<a class="btn primary md-vlink" href="${esc(v.src)}" target="_blank" rel="noopener noreferrer">${ICO.video}Xem video</a>`;
  const imgs = !g.length ? "" : `<div class="md-gal" data-n="${g.length}"><figure class="md-main"><img src="${esc(g[0])}" alt="" decoding="async" id="mdMain"></figure>${g.length > 1 ? `<div class="md-thumbs" role="tablist" aria-label="Ảnh minh họa">${g.map((s, i) => `<button type="button" role="tab" class="md-th${i ? "" : " on"}" data-i="${i}" aria-label="Ảnh ${i + 1}" aria-selected="${i ? "false" : "true"}"><img src="${esc(s)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>`;
  return `<section class="media" aria-label="Ảnh và video">${vid}${imgs}</section>`;
}
export function bindMedia(root) {
  const th = root.querySelector(".md-thumbs"), main = root.querySelector("#mdMain"); if (!th || !main) return;
  th.addEventListener("click", e => { const b = e.target.closest(".md-th"); if (!b) return; th.querySelectorAll(".md-th").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); }); const im = b.querySelector("img"); if (im) { main.classList.remove("swap"); void main.offsetWidth; main.src = im.src; main.classList.add("swap"); } });
}
