/* Báo khi mất kết nối và khi có mạng lại. Chờ vài giây trước khi báo để không nháy trong lúc đang kết nối lần đầu. */
import { store, subscribe } from "./store.js";
import { toast } from "./util.js";
let bar = null, lost = false, timer = 0, seen = false; /* seen: đã từng kết nối được tới máy chủ dữ liệu */
const ensure = () => { if (bar) return bar; bar = document.createElement("div"); bar.id = "netBar"; bar.setAttribute("role", "status"); bar.hidden = true; bar.textContent = "Mất kết nối. Đang thử kết nối lại…"; document.body.appendChild(bar); return bar; };
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;
function check(now) {
  clearTimeout(timer);
  const down = offline() || (seen && !store.connected);
  if (down && !lost) { timer = setTimeout(() => { if (offline() || (seen && !store.connected)) { lost = true; ensure().hidden = false; document.body.classList.add("is-offline"); } }, now ? 0 : 4000); }
  else if (!down && lost) { lost = false; ensure().hidden = true; document.body.classList.remove("is-offline"); toast("Đã kết nối lại.", "ok"); }
}
export function initNetStatus() {
  addEventListener("online", () => check(true)); addEventListener("offline", () => check(true));
  subscribe(t => { if (t === "conn") { if (store.connected) seen = true; check(false); } });
  if (offline()) check(true);
}
