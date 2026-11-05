/* Thanh trên: ô tìm kiếm (đồng bộ với ô tìm kiếm trong trang) và hiệu ứng khi cuộn. */
import { $, $$, debounce } from "./util.js";
import { navigate } from "./router.js";

let lastBeforeSearch = "/";
const syncAll = src => { $$("input[data-search]").forEach(el => { if (el !== src) el.value = src.value; el.closest("[data-searchbox]")?.classList.toggle("has-q", !!el.value); }); };
const go = v => {
  const t = v.trim();
  if (t) navigate("/search?q=" + encodeURIComponent(t), { replace: location.pathname === "/search" });
  else if (location.pathname === "/search") navigate(lastBeforeSearch, { replace: true });
};
const onType = debounce(go, 280);
export function setSearchValue(q, isSearchPage) {
  if (!isSearchPage) lastBeforeSearch = location.pathname + location.search;
  $$("input[data-search]").forEach(el => { if (document.activeElement !== el) el.value = q; el.closest("[data-searchbox]")?.classList.toggle("has-q", !!el.value); });
}
export function initHeader() {
  document.addEventListener("input", e => { const el = e.target; if (!el.matches || !el.matches("input[data-search]")) return; syncAll(el); onType(el.value); });
  document.addEventListener("keydown", e => { const el = e.target; if (e.key === "Enter" && el.matches && el.matches("input[data-search]")) { e.preventDefault(); onType.cancel(); go(el.value); } });
  $("#searchBox").addEventListener("submit", e => { e.preventDefault(); onType.cancel(); go($("#q").value); });
  $("#qClr").addEventListener("click", () => { const el = $("#q"); el.value = ""; syncAll(el); onType.cancel(); go(""); el.focus(); });
  let tick = false;
  addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(() => { tick = false; $("#hdr").classList.toggle("scrolled", scrollY > 6); }); }, { passive: true });
}
