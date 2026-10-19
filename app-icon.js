/* ===== ICON ===== */
const P={
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1z"/>',
game:'<path d="M6 12h4M8 10v4M15 11.5h.01M18 13.5h.01"/><path d="M5.5 6h13a3.5 3.5 0 0 1 3.4 4.2l-1 5.2a2.6 2.6 0 0 1-4.4 1.4L15 15.5H9l-1.5 1.3a2.6 2.6 0 0 1-4.4-1.4l-1-5.2A3.5 3.5 0 0 1 5.5 6z"/>',
world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.200 3 14.800 0 18M12 3c-3 3.200-3 14.800 0 18"/>',
heart:'<path d="M19 14c1.490-1.460 3-3.210 3-5.500A5.500 5.500 0 0 0 16.500 3c-1.760 0-3 .5-4.500 2-1.500-1.500-2.740-2-4.500-2A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4.050 3 5.500l7 7Z"/>',
doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
gear:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.400 3.600-7 8-7s8 2.600 8 7"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
moon:'<path d="M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
up:'<path d="m6 15 6-6 6 6"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.600"/><path d="m21 16-5-5-9 9"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
users:'<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c0-3.600 2.900-6 6.500-6s6.500 2.400 6.500 6M16 4.600a3.500 3.500 0 0 1 0 6.800M18 14.500c2.200.8 3.500 2.700 3.500 5.500"/>',
back:'<path d="M15 5l-7 7 7 7"/>',
eye:'<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
eyeoff:'<path d="M3 3l18 18M10.600 5.100A10 10 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-3.200 4M6.600 6.600A17 17 0 0 0 2 12s3.600 7 10 7a10 10 0 0 0 4.400-1M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
shield:'<path d="M12 3 4 6v6c0 5 3.500 8 8 9 4.500-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
logout:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
msg:'<path d="M21 12a8 8 0 0 1-11.500 7.200L3 21l1.800-6A8 8 0 1 1 21 12z"/>',
star:'<path d="m12 3 2.800 5.800 6.200.9-4.500 4.400 1.100 6.200L12 17.300 6.400 20.300l1.100-6.200L3 9.700l6.200-.9z"/>',
hash:'<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
eyeview:'<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/>',
share:'<path d="M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
link:'<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>'
};
const svg=(n,s=18)=>`<svg class="si" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${P[n]||""}</svg>`;
function applyIcons(root){(root||document).querySelectorAll("[data-ic]").forEach(e=>{e.innerHTML=svg(e.dataset.ic,+e.dataset.s||18)})}
function applyStatic(){
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i]").forEach(e=>{e.textContent=t(e.dataset.i)});
  document.querySelectorAll("[data-ip]").forEach(e=>{e.placeholder=t(e.dataset.ip)});
  document.querySelectorAll("[data-ia]").forEach(e=>{e.setAttribute("aria-label",t(e.dataset.ia))});
}
;(window.__ok=window.__ok||[]).push("app-icons.js");
