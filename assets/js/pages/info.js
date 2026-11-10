/* Trang thông tin công khai (Giới thiệu, Bảo mật, Hướng dẫn, Tải APK an toàn, Điều khoản, Riêng tư). Nội dung hai ngôn ngữ ở lib/info-content.js. */
import { esc } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { getLang, onLangChange } from "../lib/i18n.js";
import { INFO, INFO_ORDER } from "../lib/info-content.js";

export function mount(ctx) {
  const key = ctx.def.info, d = INFO[key];
  if (!d) { ctx.el.innerHTML = `<div class="statebox"><p>Không tìm thấy trang.</p></div>`; return; }
  const faqLD = () => (d.faq || []).map(([q, a]) => ({ q: q[getLang() === "vi" ? "vi" : "en"], a: a[getLang() === "vi" ? "vi" : "en"] }));
  const head = () => ctx.setPage({ title: d.title.vi, desc: d.desc.vi, sub: d.lead.vi, ld: key === "about" ? "AboutPage" : "WebPage", faq: faqLD() });
  head();
  const draw = () => {
    const L = getLang() === "vi" ? "vi" : "en";
    ctx.el.innerHTML = `<article class="info" translate="no" lang="${L}">
      <p class="info-lead">${esc(d.lead[L])}</p>
      ${d.sections.map(s => `<section class="info-s"><h2>${esc(s.h[L])}</h2>${(s.p || []).map(p => `<p>${esc(p[L])}</p>`).join("")}${s.ul ? `<ul>${s.ul.map(x => `<li>${esc(x[L])}</li>`).join("")}</ul>` : ""}</section>`).join("")}
      ${d.faq ? `<section class="info-s"><h2>${L === "vi" ? "Câu hỏi thường gặp" : "Frequently asked questions"}</h2>${d.faq.map(([q, a]) => `<details class="info-q"><summary>${esc(q[L])}</summary><p>${esc(a[L])}</p></details>`).join("")}</section>` : ""}
      <nav class="info-more" aria-label="${L === "vi" ? "Xem thêm" : "More"}"><h2>${L === "vi" ? "Xem thêm" : "More"}</h2><div class="info-links">${INFO_ORDER.filter(k => k !== key).map(k => `<a class="btn ghost" href="${INFO[k].path}">${ICO[INFO[k].icon] || ""}${esc(INFO[k].title[L])}</a>`).join("")}<a class="btn ghost" href="/help">${ICO.help || ""}${L === "vi" ? "Câu hỏi thường gặp" : "FAQ"}</a></div></nav></article>`;
  };
  draw(); const off = onLangChange(() => { draw(); head(); }); return () => off();
}
