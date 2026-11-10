/* Cài đặt: giao diện, kính mờ, ngôn ngữ, nhạc nền và tài khoản. */
import { ACCENTS, getAccent, setAccent } from "../lib/accent.js";
import { esc, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import * as S from "../lib/store.js";
import { session, onAuth, resendVerification } from "../lib/auth.js";
import { getThemePref, setThemePref, isMuted, isGlass, setGlass, getGlassBlur, getGlassClear, setGlassBlur, setGlassClear, GLASS_DEF, isBgHidden, setBgHidden, getBgBright, setBgBright, getVolume, setVolume, isReduceMotion, isHighContrast, isCompact, isIntroOff, setFlag, resetPrefs, getGfx, setGfx, GFX } from "../lib/prefs.js";
import { confirmDialog } from "../lib/confirm.js";
import { getLang, setLang } from "../lib/i18n.js";
import { hasMusic, toggleSound, playlist, currentTrack, nextTrack } from "../lib/media.js";
import { friendly } from "../lib/messages.js";

const GFX_INFO = {
  low: { n: "Tối ưu", l: ["Nền ô vuông đứng yên", "Bố cục gọn, không có hiệu ứng chuyển động", "Vẫn có âm thanh", "Nhẹ nhất, mượt cả trên máy yếu"] },
  mid: { n: "Trung bình", l: ["Nền ô vuông chuyển động nhẹ", "Hiệu ứng chuyển động cân bằng", "Vẫn có âm thanh", "Không hiện hình nền website"] },
  high: { n: "Cao", l: ["Hiện hình nền website", "Có âm thanh", "Hiệu ứng nâng cao: ánh sáng theo con trỏ, viền sáng, chuyển cảnh mượt", "Có thể làm máy yếu bị giật, nóng, hao pin"] }
};
const sw = (id, label, on, extra = "") => `<div class="switch-row"><span>${label}</span><label class="sw"><input type="checkbox" id="${id}" ${on ? "checked" : ""} ${extra} aria-label="${label}"><i></i></label></div>`;
const rng = (id, label, min, max, val, unit, dis) => `<div class="rng-row"><div class="rng-top"><label for="${id}">${label}</label><output id="${id}V" translate="no">${val}${unit}</output></div>
  <input class="rng" type="range" id="${id}" min="${min}" max="${max}" value="${val}" step="1" data-unit="${unit}" style="--p:${(val - min) / (max - min) * 100}%" ${dis ? "disabled" : ""}></div>`;

export function mount(ctx) {
  ctx.setPage({ title: "Cài đặt", sub: "Tùy chỉnh giao diện, ngôn ngữ, âm thanh và tài khoản.", noindex: true });
  const draw = () => {
    const pref = getThemePref(), u = session.user;
    const gfx = getGfx(), gi = GFX.indexOf(gfx), onHigh = gfx === "high";
    ctx.el.innerHTML = `<div class="set-grid">
      <section class="set-card wide gfx-card"><h3>${ICO.grid}Mức đồ họa</h3><p class="muted">Mặc định là Tối ưu để web luôn mượt. Kéo thanh để đổi mức; bạn có thể đổi lại bất cứ lúc nào.</p>
        <div class="gfx-top"><span class="gfx-name" id="gfxName">${GFX_INFO[gfx].n}</span><span class="sub-note" id="gfxStep" translate="no">${gi + 1} / 3</span></div>
        <div class="gfx-scale"><input class="rng" type="range" id="gfx" min="0" max="2" step="1" value="${gi}" style="--p:${gi * 50}%" aria-label="Mức đồ họa" aria-valuetext="${GFX_INFO[gfx].n}"></div>
        <div class="gfx-ticks" role="presentation">${GFX.map((g, i) => `<span data-g="${i}" class="${i === gi ? "on" : ""}">${GFX_INFO[g].n}</span>`).join("")}</div>
        <ul class="gfx-list" id="gfxList">${GFX_INFO[gfx].l.map(x => `<li>${x}</li>`).join("")}</ul></section>
      <section class="set-card"><h3>${ICO.paint}Giao diện</h3><p class="muted">Chọn chế độ hiển thị. Lựa chọn được lưu trên thiết bị này.</p>
        <div class="seg" role="radiogroup" aria-label="Giao diện">${[["dark", "Tối"], ["light", "Sáng"], ["system", "Theo thiết bị"]].map(([v, l]) => `<button type="button" role="radio" aria-checked="${pref === v}" data-theme="${v}" class="${pref === v ? "on" : ""}">${l}</button>`).join("")}</div></section>
      <section class="set-card"><h3>${ICO.grid}Kính mờ</h3><p class="muted">Khi bật, các khung trở nên trong suốt, chỉ còn viền và làm mờ phần phía sau. Khi tắt, khung dùng màu đặc theo giao diện (đen hoặc trắng).</p>
        ${sw("glass", "Bật kính mờ", isGlass())}
        <div class="set-fields" id="glassFields" aria-disabled="${!isGlass()}">${rng("glBlur", "Độ mờ", 0, 40, getGlassBlur(), "px", !isGlass())}${rng("glClear", "Độ trong", 0, 100, getGlassClear(), "%", !isGlass())}
          <div class="acts"><button class="btn ghost sm" id="glReset" type="button" ${!isGlass() ? "disabled" : ""}>Về mặc định</button></div></div></section>
      <section class="set-card"><h3>${ICO.paint}Hình nền</h3><p class="muted">${!onHigh ? "Hình nền website chỉ hiện ở mức đồ họa Cao. Hãy chọn mức Cao ở trên để dùng." : S.store.theme && S.store.theme.bgData && S.store.theme.bgType !== "none" ? "Website có hình nền. Bạn có thể ẩn hoặc chỉnh độ sáng." : "Hiện website chưa có hình nền, nhưng cài đặt này sẽ áp dụng khi có."}</p>
        ${sw("bgShow", "Hiện hình nền", !isBgHidden(), onHigh ? "" : "disabled")}
        <div class="set-fields" id="bgFields" aria-disabled="${isBgHidden()}">${rng("bgBright", "Độ sáng hình nền", 30, 150, getBgBright(), "%", isBgHidden() || !onHigh)}</div></section>
      <section class="set-card"><h3>${ICO.link}Ngôn ngữ</h3><p class="muted">Chọn ngôn ngữ hiển thị của website.</p>
        <div class="seg" role="radiogroup" aria-label="Ngôn ngữ" translate="no">${[["en", "English"], ["vi", "Tiếng Việt"]].map(([v, l]) => `<button type="button" role="radio" aria-checked="${getLang() === v}" data-lang="${v}" class="${getLang() === v ? "on" : ""}">${l}</button>`).join("")}</div></section>
      <section class="set-card"><h3>${ICO.sparkles || ICO.star}Màu nhấn</h3><p class="muted">Đổi màu nút chính, viền chọn và công tắc.</p>
        <div class="swatches" role="radiogroup" aria-label="Màu nhấn">${ACCENTS.map(a => `<button type="button" role="radio" class="swatch${a.id === getAccent() ? " on" : ""}" aria-checked="${a.id === getAccent()}" aria-label="${a.label}" title="${a.label}" data-accent="${a.id}"><i style="${a.hex ? "background:" + a.hex : ""}" class="${a.hex ? "" : "def"}"></i></button>`).join("")}</div></section>
      <section class="set-card"><h3>${ICO.music}Âm thanh</h3><p class="muted">${hasMusic() ? "Website có nhạc nền. Bạn có thể bật hoặc tắt tại đây." : "Hiện website chưa có nhạc nền."}</p>
        ${sw("snd", "Phát nhạc nền", !isMuted())}
        ${hasMusic() ? `<div class="nowp"><span id="nowp" translate="no">${esc((currentTrack() || playlist()[0]).name)}</span>${playlist().length > 1 ? `<button type="button" class="btn ghost sm" id="nextBtn">Bài tiếp theo</button>` : ""}</div>` : ""}
        <div class="set-fields" aria-disabled="${isMuted()}">${rng("vol", "Âm lượng", 0, 100, getVolume(), "%", isMuted())}</div></section>
      <section class="set-card"><h3>${ICO.eye}Thoải mái khi dùng</h3><p class="muted">Giúp web dễ đọc và dễ chịu hơn.</p>
        ${sw("rm", "Giảm chuyển động", isReduceMotion())}${sw("hc", "Tương phản cao", isHighContrast())}${sw("dens", "Bố cục gọn", isCompact())}${sw("intro", "Hiện màn hình mở đầu", !isIntroOff())}</section>
      <section class="set-card wide"><h3>${ICO.user}Tài khoản</h3>${u ? `<p class="muted">Đang đăng nhập với <b>${esc(u.email || "")}</b>${u.emailVerified ? "" : " · email chưa được xác minh"}.</p>
        ${session.devBlocked ? `<p class="form-error">${esc(session.devBlocked)}</p>` : ""}
        <div class="acts"><a class="btn primary" href="/profile">Xem hồ sơ</a>${!u.emailVerified ? `<button class="btn ghost" id="verify" type="button">Gửi lại email xác minh</button>` : ""}<button class="btn ghost" data-act="signout" type="button">${ICO.out}Đăng xuất</button></div>`
        : `<p class="muted">Bạn chưa đăng nhập.</p><div class="acts"><a class="btn primary" href="/login?next=/settings">Đăng nhập</a><a class="btn ghost" href="/register">Tạo tài khoản</a></div>`}</section>
      <section class="set-card wide"><h3>${ICO.refresh || ICO.out}Đặt lại</h3><p class="muted">Đưa giao diện, kính mờ, hình nền, âm thanh và trợ năng về mặc định. Ngôn ngữ và tài khoản không đổi.</p>
        <div class="acts"><button class="btn danger" id="resetAll" type="button">Đặt lại cài đặt hiển thị</button></div></section></div>`;
    ctx.el.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => { setThemePref(b.dataset.theme); draw(); }));
    ctx.el.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", async () => { await setLang(b.dataset.lang); ctx.el.querySelectorAll("[data-lang]").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); }); }));
    const $q = x => ctx.el.querySelector(x), redraw = id => { draw(); const e = $q("#" + id); if (e) e.focus(); };
    const bindRng = (id, fn) => { const r = $q("#" + id); if (!r) return; r.addEventListener("input", () => { const v = +r.value; r.style.setProperty("--p", (v - +r.min) / (+r.max - +r.min) * 100 + "%"); $q("#" + id + "V").textContent = v + r.dataset.unit; fn(v); }); };
    const gr = $q("#gfx"), applyG = async i => {
      const g = GFX[i]; if (g === getGfx()) return;
      if (g === "high" && !(await confirmDialog({ title: "Chuyển sang đồ họa Cao?", message: "Mức Cao hiện hình nền website, âm thanh và nhiều hiệu ứng nâng cao. Trên máy yếu hoặc pin thấp, web có thể giật, nóng máy và tốn pin hơn. Bạn vẫn có thể quay lại mức thấp hơn bất cứ lúc nào.", ok: "Dùng mức Cao", cancel: "Giữ mức hiện tại" }))) { draw(); return; }
      setGfx(g); draw(); const e = $q("#gfx"); if (e) e.focus();
    };
    const prevG = i => { const g = GFX[i]; gr.style.setProperty("--p", i * 50 + "%"); $q("#gfxName").textContent = GFX_INFO[g].n; $q("#gfxStep").textContent = (+i + 1) + " / 3"; $q("#gfxList").innerHTML = GFX_INFO[g].l.map(x => `<li>${x}</li>`).join(""); ctx.el.querySelectorAll(".gfx-ticks span").forEach(x => x.classList.toggle("on", +x.dataset.g === +i)); };
    gr.addEventListener("input", () => prevG(+gr.value)); gr.addEventListener("change", () => applyG(+gr.value));
    ctx.el.querySelectorAll(".gfx-ticks span").forEach(x => x.addEventListener("click", () => { gr.value = x.dataset.g; prevG(+x.dataset.g); applyG(+x.dataset.g); }));
    const gl = $q("#glass"); if (gl) gl.addEventListener("change", () => { setGlass(gl.checked); redraw("glass"); });
    bindRng("glBlur", setGlassBlur); bindRng("glClear", setGlassClear);
    $q("#glReset").addEventListener("click", () => { setGlassBlur(GLASS_DEF.blur); setGlassClear(GLASS_DEF.clear); draw(); });
    $q("#bgShow").addEventListener("change", e => { setBgHidden(!e.target.checked); redraw("bgShow"); }); bindRng("bgBright", setBgBright); bindRng("vol", setVolume);
    [["rm", "motion", true], ["hc", "contrast", true], ["dens", "compact", true], ["intro", "intro", true]].forEach(([id, name]) => $q("#" + id).addEventListener("change", e => setFlag(name, e.target.checked)));
    $q("#resetAll").addEventListener("click", async () => { if (await confirmDialog({ title: "Đặt lại cài đặt hiển thị?", message: "Giao diện, kính mờ, hình nền, âm thanh và trợ năng sẽ về mặc định. Ngôn ngữ giữ nguyên.", ok: "Đặt lại", danger: true })) { resetPrefs(); setAccent(""); draw(); toast("Đã đặt lại cài đặt."); } });
    ctx.el.querySelectorAll("[data-accent]").forEach(b => b.addEventListener("click", () => { setAccent(b.dataset.accent); draw(); const e = ctx.el.querySelector(`[data-accent="${b.dataset.accent}"]`); if (e) e.focus(); }));
    const nb = $q("#nextBtn"); if (nb) nb.addEventListener("click", () => nextTrack());
    const s = $q("#snd"); if (s) s.addEventListener("change", () => { toggleSound(); redraw("snd"); });
    const v = ctx.el.querySelector("#verify"); if (v) v.addEventListener("click", () => resendVerification().then(() => toast("Đã gửi email xác minh. Hãy kiểm tra hộp thư.")).catch(e => toast(friendly(e), "err")));
  };
  draw(); const u1 = onAuth(draw), u2 = S.subscribe(t => { if (t === "theme" || t === "tracks") draw(); });
  const onTrack = () => { const n = ctx.el.querySelector("#nowp"), c = currentTrack(); if (n && c) n.textContent = c.name; };
  document.addEventListener("track-change", onTrack); return () => { u1(); u2(); document.removeEventListener("track-change", onTrack); };
}
