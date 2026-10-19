/* ===== KHỞI ĐỘNG ===== */
try{enhanceSelects()}catch(e){console.warn("[picker]",e)}
applyTheme(themePref);applyStatic();applyIcons();
{const m=location.pathname.match(/^\/(p|w)\/([\w-]{1,60})\/?$/);if(m)history.replaceState(null,"",(m[1]==="p"?"/#/post/":"/#/w/")+m[2])}
window.addEventListener("hashchange",route);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pollUnread()});
const qp=new URLSearchParams(location.search).get("q");if(qp)$("q").value=qp;
setInterval(pollUnread,30000);
(async()=>{
  try{
    await Promise.all([ensureSdk(),pickDb()]);   /* tải SDK và dò database cùng lúc */
    loadCats();loadCfg();loadGames();   /* dữ liệu công khai tải ngay, song song với khôi phục đăng nhập */
    await restore();renderAuth();renderNav();renderPop();
    booted=true;route();pollUnread();
  }catch(e){console.warn("[boot]",e);booted=true;try{route()}catch(_){}}
  hideBoot();
})();
setTimeout(hideBoot,7000);   /* dù có chuyện gì cũng không để vòng xoay che màn hình quá 7 giây */
;(window.__ok=window.__ok||[]).push("app-boot.js");
