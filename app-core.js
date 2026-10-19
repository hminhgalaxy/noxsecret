/* ===== CẤU HÌNH ===== */
/* Cấu hình Firebase nằm ở js/firebase-config.js (tách riêng, không liên quan Google). Đăng nhập/đăng ký nằm ở login.html + register.html. */
const firebaseConfig=window.FIREBASE_CONFIG||{};
const DEV_EMAIL="hminhgalaxy@gmail.com";   /* Gmail của chủ web: tự mở Dev Panel (quyền ghi thật vẫn do Rules kiểm tra) */
let DB_URL=firebaseConfig.databaseURL; // đọc dữ liệu công khai (bài, game, mục, cấu hình) — tự dò lại đúng khu vực ở pickDb()
const API="/api"; // chỉ còn là đường dự phòng; mọi thao tác đã được xử lý bằng Firebase trong localApi()
const $=id=>document.getElementById(id);

/* ===== NGÔN NGỮ (vi / en) ===== */
const I={vi:{},en:{}};
const D=(k,v,e)=>{I.vi[k]=v;I.en[k]=e===undefined?v:e};
let lang="en";try{lang=localStorage.getItem("lang")==="vi"?"vi":"en"}catch(e){}
const t=(k,...a)=>{let s=I[lang][k];if(s===undefined)s=I.vi[k];if(s===undefined)s=k;a.forEach((v,i)=>{s=s.split("{"+i+"}").join(v)});return s};
/* Backend /api chưa có (404) hoặc DB công khai chưa cho đọc (401/403) => coi như chưa có nội dung, hiện "No post" thay vì báo lỗi */
const gone=e=>!!e&&!e.net&&(e.status===404||e.status===401||e.status===403);
const loc=()=>lang==="en"?"en-GB":"vi-VN";
function hideBoot(){const b=document.getElementById("boot");if(b&&!b.hidden){b.classList.add("off");setTimeout(()=>{b.hidden=true},300)}}
;(window.__ok=window.__ok||[]).push("app-core.js");
