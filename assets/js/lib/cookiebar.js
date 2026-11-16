/* Thông báo cookie nhỏ (hiện một lần): website chỉ dùng cookie chức năng của chính nó. */
import { consentGiven, giveConsent, cookiesEnabled } from "./cookie.js";
import { ICO } from "./icons.js";
export function initCookieBar() {
  if (consentGiven() || !cookiesEnabled()) return;
  const show = () => {
    if (consentGiven() || document.getElementById("ckBar")) return;
    const el = document.createElement("div"); el.className = "ck"; el.id = "ckBar"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Cookie");
    el.innerHTML = `${ICO.shield}<p><b>Website dùng cookie</b> để nhớ cài đặt, ngôn ngữ, chủ đề và giỏ hàng của bạn. Không có cookie quảng cáo hay theo dõi. <a href="/privacy" data-link>Chi tiết</a></p><button class="btn primary sm" type="button">Đã hiểu</button>`;
    document.body.appendChild(el);
    el.querySelector("button").addEventListener("click", () => { giveConsent(); el.remove(); });
  };
  setTimeout(show, 2500);
}
