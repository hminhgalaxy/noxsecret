/* Trang chủ: giới thiệu, danh mục chạy ngang (mỗi lần một mục), "Cập nhật này có gì?", lý do chọn, cách dùng, câu hỏi thường gặp. */
import { esc } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { store, subscribe, catHref } from "../lib/store.js";
import { icoOf, countUp, countOf, fresh, cardHTML } from "../lib/ui.js";
import { recent, onFavs } from "../lib/favs.js";
import { items } from "../lib/store.js";
import { feed } from "../lib/updates.js";
import { updHTML, clampUpdates } from "../lib/news.js";

const FEATS = [
  ["grid", "Sắp xếp rõ ràng", "Mọi nội dung được chia theo danh mục. Tìm kiếm gõ có dấu hay không dấu đều ra kết quả."],
  ["bell", "Cập nhật liên tục", "Nội dung mới xuất hiện ngay, bạn không cần tải lại trang. Có chuông báo mỗi khi có tin mới."],
  ["bolt", "Mở nhanh, dùng mượt", "Trang tải tức thì và chạy mượt trên cả điện thoại lẫn máy tính."],
  ["copy", "Sao chép một chạm", "Bấm một nút để sao chép code hoặc mở liên kết, không phải qua nhiều bước."]
];
const STEPS = [
  ["Chọn danh mục", "Mở một danh mục bất kỳ ở thanh bên để xem các mục đã được kiểm duyệt."],
  ["Mở mục bạn cần", "Xem mô tả và chi tiết của từng mục trước khi dùng."],
  ["Sao chép hoặc mở link", "Bấm Sao chép code hoặc Mở link là xong."]
];
const FAQ = [
  ["Tôi có cần tài khoản để dùng không?", "Không. Bạn có thể xem và sao chép mọi nội dung công khai mà không cần đăng nhập. Tài khoản dùng để có hồ sơ cá nhân của riêng bạn."],
  ["Làm sao để sao chép code?", "Mở một mục có code rồi bấm Sao chép code. Code sẽ được chép vào bộ nhớ tạm của thiết bị."],
  ["Bao lâu thì có nội dung mới?", "Nội dung được cập nhật trực tiếp. Khi có tin mới, biểu tượng chuông ở đầu trang sẽ báo cho bạn."],
  ["Tôi quên mật khẩu thì sao?", "Vào trang Đăng nhập, bấm Quên mật khẩu và nhập email. Chúng tôi sẽ gửi một mã 6 số tới email; nhập đúng mã cùng mật khẩu mới là xong."]
];

export function mount(ctx) {
  ctx.setPage({ hero: true, title: null, desc: "skibidiscript — website tiện ích chia sẻ gói APK bảo mật cao: nội dung kiểm duyệt trước khi đăng, cảnh báo rõ phần mềm bên thứ ba. Không cổ xúy hack." });
  ctx.el.innerHTML = `<section class="hero" aria-labelledby="h1">
      <span class="eyebrow"><i></i>skibidiscript · Luôn được cập nhật</span>
      <h1 id="h1">APK tiện ích, bảo mật cao. <span>Kiểm duyệt trước khi đăng.</span></h1>
      <p>Mọi thứ bạn cần được sắp xếp theo từng danh mục rõ ràng. Tìm nhanh, mở ngay, không rườm rà.</p>
      <form class="hero-search" id="heroSearch" role="search" action="/search">${ICO.search}
        <input type="search" name="q" placeholder="Bạn đang tìm gì?" aria-label="Tìm kiếm" autocomplete="off" enterkeyhint="search">
        <button class="btn primary" type="submit">Tìm</button></form>
      <div class="stat-strip" id="stats"></div>
    </section>
    <div class="home-grid">
      <section aria-labelledby="hc" class="home-cats">
        <div class="sec-head"><h2 id="hc">Danh mục</h2><a href="/categories">Xem tất cả</a></div>
        <div class="carousel" role="region" aria-roledescription="carousel" aria-label="Danh mục">
          <div class="car-track" id="track" tabindex="0"></div>
          <div class="car-bar"><button class="car-btn" id="prev" type="button" aria-label="Danh mục trước">${ICO.arrow}</button>
            <div class="car-dots" id="dots" aria-hidden="true"></div><span class="car-num" id="num" aria-live="polite"></span>
            <button class="car-btn" id="next" type="button" aria-label="Danh mục tiếp theo">${ICO.arrow}</button></div>
        </div>
      </section>
      <section aria-labelledby="hn" class="home-news">
        <div class="sec-head"><h2 id="hn">Cập nhật này có gì?</h2><a href="/notifications">Xem tất cả</a></div>
        <div class="news" id="news"></div>
      </section>
    </div>
    <section aria-labelledby="hr" id="hrec" hidden><div class="sec-head"><h2 id="hr">Xem gần đây</h2><a href="/favorites">Yêu thích</a></div><div class="grid" id="hrGrid"></div></section>
    <section aria-labelledby="hw"><div class="sec-head"><h2 id="hw">Vì sao chọn SKIBIDI SCRIPT WEB?</h2></div>
      <div class="feats">${FEATS.map(([ic, t, d]) => `<div class="feat"><span class="feat-ico">${ICO[ic] || ICO.box}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div></section>
    <section aria-labelledby="hs"><div class="sec-head"><h2 id="hs">Bắt đầu thế nào?</h2></div>
      <ol class="steps">${STEPS.map(([t, d], i) => `<li class="step"><span class="step-n">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join("")}</ol></section>
    <section aria-labelledby="hf"><div class="sec-head"><h2 id="hf">Câu hỏi thường gặp</h2><a href="/help">Xem tất cả</a></div>
      <div class="faqs">${FAQ.map(([q, a]) => `<details class="faq"><summary>${esc(q)}${ICO.chevD}</summary><p>${esc(a)}</p></details>`).join("")}</div></section>`;

  const $ = s => ctx.el.querySelector(s);
  const track = $("#track"), dots = $("#dots"), num = $("#num"), news = $("#news"), stats = $("#stats");
  $("#heroSearch").addEventListener("submit", e => { e.preventDefault(); const q = e.currentTarget.q.value.trim(); ctx.navigate(q ? "/search?q=" + encodeURIComponent(q) : "/search"); });

  /* ── Danh mục chạy ngang ── */
  let key = "", idx = 0, first = true;
  const n = () => store.cats.length;
  const slideHTML = (c, i) => `<a class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${n()}" href="${catHref(c)}">
      <span class="slide-ico">${icoOf(c)}</span>
      <span class="slide-main"><b>${esc(c.label)}</b><small>${esc(c.sub || "")}</small></span>
      <span class="slide-foot"><span class="badge"><span data-tilenum="${esc(c.id)}">${countOf(c.id)}</span>&nbsp;mục</span><span class="slide-go">Xem danh mục${ICO.arrow}</span></span></a>`;
  const sync = () => {
    const w = track.clientWidth || 1; idx = Math.max(0, Math.min(n() - 1, Math.round(track.scrollLeft / w)));
    dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i === idx)); num.textContent = (idx + 1) + " / " + n();
  };
  const go = i => { const t = (i + n()) % n(); track.scrollTo({ left: t * track.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  const drawCats = () => {
    const k = store.cats.map(c => c.id).join(",");
    if (k !== key) {
      key = k; track.innerHTML = store.cats.map(slideHTML).join("");
      dots.innerHTML = store.cats.map(() => "<i></i>").join(""); if (first) fresh(track);
      requestAnimationFrame(() => { track.scrollLeft = Math.min(idx, n() - 1) * track.clientWidth; sync(); });
    } else store.cats.forEach(c => { const el = track.querySelector(`[data-tilenum="${CSS.escape(c.id)}"]`); if (el) countUp(el, countOf(c.id)); });
    const total = store.cats.reduce((a, c) => a + countOf(c.id), 0);
    stats.innerHTML = `<div><b>${total}</b>mục nội dung</div><div><b>${n()}</b>danh mục</div>`;
    sync(); first = false;
  };
  let raf = 0; track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  $("#prev").addEventListener("click", () => go(idx - 1)); $("#next").addEventListener("click", () => go(idx + 1));
  track.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); } });
  const onResize = () => { track.scrollLeft = idx * track.clientWidth; sync(); }; addEventListener("resize", onResize);

  /* ── Cập nhật này có gì? ── */
  const drawNews = () => { news.innerHTML = feed().slice(0, 3).map((e, i) => updHTML(e, i)).join(""); clampUpdates(news); };

  drawCats(); drawNews();
  const u1 = subscribe(t => { if (t === "data" || t === "cats") drawCats(); else if (t === "updates" || t === "notice") drawNews(); });
  const drawRecent = () => {
    const l = recent().map(x => { const it = (items(x.c) || []).find(i => i.key === x.k); return it ? { ...it, cat: x.c } : null; }).filter(Boolean).slice(0, 3);
    const sec = $("#hrec"); sec.hidden = !l.length; $("#hrGrid").innerHTML = l.map((it, i) => cardHTML(it, it.cat, i, true)).join("");
  };
  drawRecent(); const u3 = subscribe(t => { if (t === "data" || t === "cats") drawRecent(); }), u4 = onFavs(drawRecent);
  return () => { u1(); u3(); u4(); removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
}
