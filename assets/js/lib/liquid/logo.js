/* Logo kính lỏng vẽ bằng code: viên kính bo tròn, ánh sáng cong ở viền, chữ S là một giọt chất lỏng. Thay nội dung symbol #logo; tắt Skliquid thì khôi phục y nguyên. */
let backup = null;
const ART = `<defs>
  <linearGradient id="lqlA" x1="12" y1="6" x2="88" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9fc0ff"/><stop offset=".5" stop-color="#b98cff"/><stop offset="1" stop-color="#ff9ccf"/></linearGradient>
  <radialGradient id="lqlB" cx=".3" cy=".18" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="lqlC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#e6edff" stop-opacity=".78"/></linearGradient>
  <filter id="lqlS" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4"/><feOffset dy="3"/><feComponentTransfer><feFuncA type="linear" slope=".35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect x="4" y="4" width="92" height="92" rx="34" fill="url(#lqlA)"/>
  <rect x="4" y="4" width="92" height="92" rx="34" fill="url(#lqlB)"/>
  <rect x="5.2" y="5.2" width="89.6" height="89.6" rx="33" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2"/>
  <path d="M10 30C14 14 30 8 50 8c-14 6-24 14-30 30z" fill="#fff" opacity=".45"/>
  <path d="M67 34c-2-8-9-12-18-12-10 0-17 5-17 13 0 8 6 11 18 14 12 3 18 7 18 16 0 8-8 13-18 13-9 0-16-4-18-12" fill="none" stroke="url(#lqlC)" stroke-width="10" stroke-linecap="round" filter="url(#lqlS)"/>
  <ellipse cx="42" cy="26" rx="9" ry="3.2" fill="#fff" opacity=".8" transform="rotate(-24 42 26)"/>`;
export function initLogo() {
  const s = document.querySelector("symbol#logo"); if (!s || backup != null) return; backup = s.innerHTML; s.innerHTML = ART;
  document.body.addEventListener("pointerdown", wob, true);
}
function wob(e) { const m = e.target.closest && e.target.closest(".brand"); if (!m) return; const k = m.querySelector(".mark"); if (!k) return; k.classList.remove("lq-wob"); void k.getBoundingClientRect(); k.classList.add("lq-wob"); setTimeout(() => k.classList.remove("lq-wob"), 800); }
export function stopLogo() { const s = document.querySelector("symbol#logo"); if (s && backup != null) s.innerHTML = backup; backup = null; document.body.removeEventListener("pointerdown", wob, true); }
