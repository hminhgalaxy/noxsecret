/* NOXGARDEN — PLANTS: 28 loài, mỗi loài một icon SVG minh họa chi tiết */
(function(){
'use strict';
var NG = window.NG;

/* ============ SPEC (28 loài) ============ */
/* t = giờ lớn (giây), s = giá bán, c = giá xu, g = giá gem, xp */
var PLANTS = NG.PLANTS = [
/* —— CÂY THÂN GỘ (9) —— */
{id:'oak',    n:'Sồi',        cat:'tree',   rar:'common',  c:80,  g:0,  t:180, s:150,  xp:20, shape:'round', bark:'#5c4326', f1:'#2e6b34', f2:'#3f8a44', f3:'#55a458'},
{id:'maple',  n:'Phong',      cat:'tree',   rar:'common',  c:100, g:0,  t:200, s:190,  xp:24, shape:'round', bark:'#5a3d22', f1:'#a34318', f2:'#c9622e', f3:'#ec9a3c', maple:true},
{id:'sakura', n:'Anh Đào',    cat:'tree',   rar:'uncommon',c:180, g:0,  t:260, s:340,  xp:34, shape:'round', bark:'#5a4030', f1:'#9a5a70', f2:'#c77b94', f3:'#f2b3cd', sakura:true},
{id:'pine',   n:'Thông',      cat:'tree',   rar:'common',  c:90,  g:0,  t:190, s:165,  xp:22, shape:'cone',  bark:'#5a4028', f1:'#1e5a38', f2:'#2e7a48', f3:'#3f9457'},
{id:'willow', n:'Liễu',       cat:'tree',   rar:'uncommon',c:170, g:0,  t:250, s:320,  xp:32, shape:'round', bark:'#4f3a26', f1:'#3f7a4f', f2:'#5a9a6a', f3:'#7abf85', willow:true},
{id:'banyan', n:'Sung',       cat:'tree',   rar:'rare',    c:320, g:0,  t:340, s:640,  xp:48, shape:'round', bark:'#463421', f1:'#24523a', f2:'#33704a', f3:'#4a8f5f', banyan:true, big:true},
{id:'palm',   n:'Dừa',        cat:'tree',   rar:'uncommon',c:190, g:0,  t:270, s:360,  xp:36, shape:'palm',  bark:'#7a5a34', f1:'#2f8a4f', f2:'#47a563', f3:'#63bd7c'},
{id:'apple',  n:'Táo',        cat:'tree',   rar:'rare',    c:300, g:0,  t:330, s:600,  xp:46, shape:'round', bark:'#5a4028', f1:'#3f7d3a', f2:'#4f9448', f3:'#63ad5c', fr:'#d63b3b'},
{id:'lemon',  n:'Chanh',      cat:'tree',   rar:'rare',    c:300, g:0,  t:330, s:600,  xp:46, shape:'round', bark:'#5a4028', f1:'#3f8a3f', f2:'#55a34a', f3:'#6cb85e', fr:'#f2d028'},
/* —— HOA (8) —— */
{id:'rose',      n:'Hồng',         cat:'flower', rar:'common',  c:50,  g:0, t:90,  s:90,   xp:12, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#4aa556', f3:'#5cb464', fl:'#d63b4b', fl2:'#a82a38', fc:'#7a1f2a'},
{id:'tulip',     n:'Uất Kim Hương',cat:'flower', rar:'common',  c:55,  g:0, t:95,  s:100,  xp:13, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#4aa556', f3:'#5cb464', fl:'#f27ba0', fl2:'#d94f7c', fc:'#f2d060'},
{id:'sunflower', n:'Hướng Dương',  cat:'flower', rar:'uncommon',c:110, g:0, t:150, s:210,  xp:20, shape:'flower', bark:'#4a7d3a', f1:'#4a7d3a', f2:'#5cb464', f3:'#6cc26f', fl:'#f6c94a', fl2:'#e8a52e', fc:'#5a3a1c', big:true},
{id:'lavender',  n:'Oải Hương',    cat:'flower', rar:'uncommon',c:115, g:0, t:155, s:220,  xp:21, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#5a9a6a', f3:'#6cae7a', fl:'#9a7bd8', fl2:'#7a5ac0', fc:'#c8b4f0'},
{id:'lotus',     n:'Sen',          cat:'flower', rar:'rare',    c:230, g:0, t:240, s:440,  xp:36, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#4aa556', f3:'#5cb464', fl:'#f2a3c0', fl2:'#e87ba5', fc:'#d9c86a', lotus:true},
{id:'daisy',     n:'Cúc Trắng',    cat:'flower', rar:'common',  c:45,  g:0, t:85,  s:80,   xp:11, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#4aa556', f3:'#5cb464', fl:'#f7f7ef', fl2:'#e0e0d2', fc:'#f6b73c'},
{id:'orchid',    n:'Lan',          cat:'flower', rar:'rare',    c:240, g:0, t:250, s:460,  xp:38, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#4aa556', f3:'#5cb464', fl:'#d86ad8', fl2:'#b04ab0', fc:'#f2d060', orchid:true},
{id:'bluebell',  n:'Chuông Xanh',  cat:'flower', rar:'uncommon',c:120, g:0, t:160, s:230,  xp:22, shape:'flower', bark:'#3f7d3a', f1:'#3f7d3a', f2:'#5a9a6a', f3:'#6cae7a', fl:'#6a9af0', fl2:'#4a7ad8', fc:'#3a5ab0', bluebell:true},
/* —— CÂY BỤI (5) —— */
{id:'berry',  n:'Berry Bush', cat:'bush', rar:'common',  c:70,  g:0, t:120, s:125, xp:15, shape:'bush', bark:'#4a3626', f1:'#2f6b3a', f2:'#3f8a4a', f3:'#4f9f57', fr:'#5468d4', fr2:'#7a8ae8'},
{id:'fern',   n:'Dương Xỉ',   cat:'bush', rar:'common',  c:60,  g:0, t:110, s:105, xp:14, shape:'fern', bark:'#3f6b3a', f1:'#3a8a4a', f2:'#4a9a55', f3:'#5cb464'},
{id:'bamboo', n:'Trúc',       cat:'bush', rar:'uncommon',c:140, g:0, t:170, s:265, xp:24, shape:'bamboo', bark:'#6a8a3a', f1:'#5c9a3f', f2:'#7aa04a', f3:'#8fbf58'},
{id:'shrub',  n:'Bụi Cây',    cat:'bush', rar:'common',  c:55,  g:0, t:100, s:95,  xp:13, shape:'bush', bark:'#4a3626', f1:'#2f6b38', f2:'#3f7a44', f3:'#4f8f54', small:true},
{id:'mushroom',n:'Nấm',       cat:'bush', rar:'uncommon',c:130, g:0, t:165, s:250, xp:23, shape:'mushroom', bark:'#e8ddc8', f1:'#b03c2e', f2:'#c9563f', f3:'#e06a50'},
/* —— ĐẶC BIỆT (6) —— */
{id:'crystal',   n:'Tinh Thể',   cat:'special', rar:'epic',  c:0, g:12, t:420, s:1200, xp:80,  shape:'crystal', bark:'#3f6b6a', f1:'#5ab8cc', f2:'#7fd8e8', f3:'#a5e8f2', glow:true},
{id:'moonflower',n:'Hoa Nguyệt', cat:'special', rar:'epic',  c:600, g:0, t:400, s:1100, xp:75, shape:'flower', bark:'#4a6b8a', f1:'#8a9ac8', f2:'#aab8e0', f3:'#dde6fb', fl:'#eef2ff', fl2:'#c9d4f4', fc:'#aab8e0', glow:true, moon:true},
{id:'fireflower',n:'Hoa Lửa',    cat:'special', rar:'epic',  c:650, g:0, t:410, s:1150, xp:78, shape:'flower', bark:'#6b3a26', f1:'#a34318', f2:'#c9622e', f3:'#e8843c', fl:'#ff7a3c', fl2:'#e83c2a', fc:'#ffd060', glow:true, fire:true},
{id:'starplant', n:'Thảo Tinh Tú',cat:'special',rar:'legend',c:0, g:25, t:540, s:2000, xp:110, shape:'star',  bark:'#4a5a8a', f1:'#c8a828', f2:'#f2d060', f3:'#ffe9a0', glow:true},
{id:'golden',    n:'Cây Vàng',    cat:'special', rar:'legend',c:0, g:28, t:560, s:2200, xp:120, shape:'round', bark:'#a5793a', f1:'#c89428', f2:'#e8b83c', f3:'#f6d365', glow:true, golden:true, big:true},
{id:'ancient',   n:'Cây Cổ Thụ',  cat:'special', rar:'mythic',c:0, g:45, t:720, s:3600, xp:160, shape:'round', bark:'#3f2f1c', f1:'#1f4630', f2:'#2c5c40', f3:'#3a7250', glow:true, ancient:true, big:true}
];

NG.plantById = function(id){
  for(var i = 0; i < PLANTS.length; i++) if(PLANTS[i].id === id) return PLANTS[i];
  return null;
};

/* ============ SVG ICON ENGINE — tỉ mỉ từng chi tiết ============ */
var _icoN = 0;
function uid(p){ _icoN = (_icoN + 1) % 9999; return p + _icoN; }

function shade(hex, f){
  var n = parseInt(hex.slice(1), 16);
  var r = Math.min(255, Math.round(((n>>16)&255) * f));
  var g = Math.min(255, Math.round(((n>>8)&255) * f));
  var b = Math.min(255, Math.round((n&255) * f));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function linG(id, c1, c2, x2, y2){
  return '<linearGradient id="'+id+'" x1="0" y1="0" x2="'+(x2==null?0:x2)+'" y2="'+(y2==null?1:y2)+'">'+
    '<stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient>';
}
function radG(id, c1, c2){
  return '<radialGradient id="'+id+'" cx="0.35" cy="0.3" r="1">'+
    '<stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></radialGradient>';
}
/* lấp lánh 4 cánh */
function sparkle(x, y, s, c, o){
  return '<path d="M'+x+' '+(y-s)+'Q'+(x+s*0.18)+' '+(y-s*0.18)+' '+(x+s)+' '+y+
    'Q'+(x+s*0.18)+' '+(y+s*0.18)+' '+x+' '+(y+s)+
    'Q'+(x-s*0.18)+' '+(y+s*0.18)+' '+(x-s)+' '+y+
    'Q'+(x-s*0.18)+' '+(y-s*0.18)+' '+x+' '+(y-s)+'Z" fill="'+c+'" opacity="'+(o==null?0.9:o)+'"/>';
}
function soilBase(){
  return '<ellipse cx="32" cy="57.5" rx="17" ry="4" fill="rgba(0,0,0,.35)"/>'+
    '<path d="M21 57q11 4.6 22 0 1.6-2.6-1.6-2.6H22.6q-3.2 0-1.6 2.6z" fill="#4a3521"/>'+
    '<path d="M24 55.8q8 2.6 16 0" stroke="#63482a" stroke-width="1.3" fill="none" stroke-linecap="round"/>'+
    '<circle cx="27" cy="54.8" r=".9" fill="#7a5c36"/><circle cx="37" cy="55.2" r=".8" fill="#6a4e2e"/>';
}
function iconWrap(inner){
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'+inner+'</svg>';
}
/* điểm dọc bezier bậc 2 */
function qp(p0, p1, p2, t){
  var a = (1-t)*(1-t), b = 2*(1-t)*t, c = t*t;
  return [ a*p0[0] + b*p1[0] + c*p2[0], a*p0[1] + b*p1[1] + c*p2[1] ];
}

/* —— thân cây tròn có vân sáng —— */
function trunkBlock(def, gBark, w, h, hollow){
  var topY = 57 - h, s = '';
  s += '<path d="M'+(32-w)+' 57 C'+(32-w*0.7)+' '+(57-h*0.4)+' '+(32-w*0.55)+' '+(57-h*0.72)+' '+(32-w*0.5)+' '+topY+
       ' L'+(32+w*0.5)+' '+topY+
       ' C'+(32+w*0.55)+' '+(57-h*0.72)+' '+(32+w*0.7)+' '+(57-h*0.4)+' '+(32+w)+' 57 Z" fill="url(#'+gBark+')"/>';
  s += '<path d="M'+(32-w*0.42)+' 55 C'+(32-w*0.34)+' '+(57-h*0.45)+' '+(32-w*0.3)+' '+(57-h*0.66)+' '+(32-w*0.27)+' '+(topY+2.5)+'" stroke="rgba(255,255,255,.17)" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
  s += '<path d="M'+(32+w*0.3)+' 54 C'+(32+w*0.36)+' '+(57-h*0.4)+' '+(32+w*0.33)+' '+(57-h*0.6)+' '+(32+w*0.3)+' '+(topY+3)+'" stroke="rgba(0,0,0,.18)" stroke-width="1" fill="none" stroke-linecap="round"/>';
  if(hollow) s += '<ellipse cx="32" cy="'+(topY+(57-topY)*0.42)+'" rx="'+(w*0.36)+'" ry="'+((57-topY)*0.3)+'" fill="#241a10"/>';
  return s;
}
/* tán tròn 3 lớp + chấm sáng */
function canopy(def, gMain, gSide, cx, cy, R){
  var s = '';
  s += '<circle cx="'+(cx-R*0.55)+'" cy="'+(cy+R*0.32)+'" r="'+(R*0.6)+'" fill="url(#'+gSide+')"/>';
  s += '<circle cx="'+(cx+R*0.58)+'" cy="'+(cy+R*0.28)+'" r="'+(R*0.58)+'" fill="url(#'+gSide+')"/>';
  s += '<circle cx="'+(cx-R*0.15)+'" cy="'+(cy-R*0.42)+'" r="'+(R*0.55)+'" fill="url(#'+gSide+')"/>';
  s += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="url(#'+gMain+')"/>';
  /* chấm lá sáng */
  s += '<circle cx="'+(cx-R*0.32)+'" cy="'+(cy-R*0.36)+'" r="1.4" fill="'+def.f3+'" opacity=".95"/>';
  s += '<circle cx="'+(cx+R*0.34)+'" cy="'+(cy-R*0.24)+'" r="1.2" fill="'+def.f3+'" opacity=".85"/>';
  s += '<circle cx="'+(cx+R*0.05)+'" cy="'+(cy-R*0.55)+'" r="1" fill="'+def.f3+'" opacity=".8"/>';
  /* bóng dưới tán */
  s += '<path d="M'+(cx-R*0.7)+' '+(cy+R*0.62)+' Q'+cx+' '+(cy+R*0.95)+' '+(cx+R*0.7)+' '+(cy+R*0.62)+'" stroke="'+def.f1+'" stroke-width="1.4" fill="none" opacity=".5" stroke-linecap="round"/>';
  return s;
}
function fruit(def, gFruit, x, y, r){
  return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="url(#'+gFruit+')"/>'+
         '<circle cx="'+(x-r*0.32)+'" cy="'+(y-r*0.35)+'" r="'+(r*0.28)+'" fill="#fff" opacity=".8"/>'+
         '<path d="M'+x+' '+(y-r)+' q1 -1.4 2 -1.6" stroke="'+shade(def.f1,1.2)+'" stroke-width=".9" fill="none" stroke-linecap="round"/>';
}
function blossom(x, y, r, c, cc){
  var s = '', i;
  for(i = 0; i < 5; i++){
    var a = i/5*Math.PI*2 - Math.PI/2;
    s += '<circle cx="'+(x+Math.cos(a)*r*0.8).toFixed(1)+'" cy="'+(y+Math.sin(a)*r*0.8).toFixed(1)+'" r="'+(r*0.55)+'" fill="'+c+'"/>';
  }
  s += '<circle cx="'+x+'" cy="'+y+'" r="'+(r*0.42)+'" fill="'+cc+'"/>';
  return s;
}
function starPath(cx, cy, R, r, rot){
  var pts = [], i;
  for(i = 0; i < 10; i++){
    var a = rot + i*Math.PI/5 - Math.PI/2, rr = (i%2 === 0) ? R : r;
    pts.push((cx+Math.cos(a)*rr).toFixed(1) + ',' + (cy+Math.sin(a)*rr).toFixed(1));
  }
  return 'M' + pts.join('L') + 'Z';
}

/* ============ CÂY TRÒN: oak/maple/sakura/willow/banyan/apple/lemon/golden/ancient ============ */
function roundTree(def, stage){
  var gBark = uid('b'), gMain = uid('c'), gSide = uid('c'), gFr = uid('f');
  var defs = linG(gBark, shade(def.bark, 1.3), shade(def.bark, 0.75)) +
             radG(gMain, def.f3, def.f1) +
             linG(gSide, def.f2, def.f1);
  var big = !!def.big, small = !!def.small;
  var W = small ? 2.5 : 3.1, H = big ? 25 : small ? 14 : 20;
  var topY = 57 - H, R = big ? 13 : small ? 7.5 : 10.5;
  var cx = 32, cy = topY - R*0.5;
  var s = trunkBlock(def, gBark, W, H, def.ancient);
  if(def.banyan){
    s += '<path d="M25 57C25 51 24.6 47 25 42" stroke="'+shade(def.bark,0.9)+'" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    s += '<path d="M39 57C39 51 39.4 47 39 42" stroke="'+shade(def.bark,0.9)+'" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    s += '<path d="M20 57q5-2.4 9-2.2M44 57q-5-2.4-9-2.2" stroke="'+shade(def.bark,0.8)+'" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  }
  s += '<path d="M31 '+(topY+3)+' C27 '+(topY-1)+' 24 '+(topY-2)+' 21 '+(topY-3)+'" stroke="url(#'+gBark+')" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  s += '<path d="M33 '+(topY+3)+' C37 '+(topY-1)+' 40 '+(topY-2)+' 43 '+(topY-3)+'" stroke="url(#'+gBark+')" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  s += canopy(def, gMain, gSide, cx, cy, R);
  if(def.willow){
    var i, x0;
    for(i = 0; i < 5; i++){
      x0 = cx - R*0.7 + i*(R*0.35);
      var tipY = cy + R*0.5 + 7 + (i%2)*2.5;
      s += '<path d="M'+x0+' '+(cy+R*0.4)+' Q'+(x0-1.5)+' '+(cy+R*0.4+4)+' '+(x0+(i%2?1.6:-1.6))+' '+tipY+'" stroke="'+def.f2+'" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
      s += '<circle cx="'+(x0+(i%2?1.6:-1.6))+'" cy="'+tipY+'" r="1" fill="'+def.f3+'"/>';
      s += '<circle cx="'+(x0+(i%2?0.6:-0.4))+'" cy="'+(tipY-2.5)+'" r=".9" fill="'+def.f3+'" opacity=".85"/>';
    }
  }
  if(def.sakura && stage >= 4){
    s += blossom(cx-R*0.45, cy-R*0.1, 2.1, def.f3, '#fff');
    s += blossom(cx+R*0.4, cy-R*0.35, 1.9, def.f3, '#fff');
    s += blossom(cx+R*0.1, cy+R*0.3, 2, def.f3, '#fff');
    s += '<circle cx="'+(cx-R*0.9)+'" cy="'+(cy+R*0.9)+'" r="1" fill="'+def.f3+'"/>';
    s += '<circle cx="'+(cx+R*1.05)+'" cy="'+(cy+R*0.7)+'" r="1.1" fill="'+def.f3+'"/>';
    s += '<circle cx="'+(cx+R*0.2)+'" cy="'+(cy+R*1.15)+'" r=".9" fill="'+def.f3+'"/>';
  }
  if(def.maple && stage >= 4){
    s += '<path d="M'+(cx-4)+' '+(cy+2)+' l2.4 -2.6 1.2 2 2.6 -1.8 -1.6 2.8 2 1 -3.4 1.2 z" fill="'+shade(def.f3,1.05)+'" opacity=".95"/>';
    s += '<path d="M'+(cx+5)+' '+(cy-3)+' l2 -2.2 1 1.6 2.2 -1.4 -1.4 2.3 1.7 .8 -2.9 1 z" fill="'+shade(def.f3,0.95)+'" opacity=".9"/>';
  }
  if(def.fr && stage >= 5){
    s += fruit(def, gFruit, cx-R*0.48, cy+R*0.12, 2.6);
    s += fruit(def, gFruit, cx+R*0.42, cy-R*0.02, 2.4);
    s += fruit(def, gFruit, cx+R*0.05, cy+R*0.5, 2.2);
  }
  if(def.golden){
    defs += radG(gFr, '#ffe9a0', '#e8a52e');
    s += '<circle cx="'+(cx-R*0.4)+'" cy="'+(cy-R*0.1)+'" r="1.7" fill="url(#'+gFr+')"/><circle cx="'+(cx+R*0.45)+'" cy="'+(cy+R*0.3)+'" r="1.5" fill="url(#'+gFr+')"/>';
    s += sparkle(cx-R*0.75, cy-R*0.55, 2.2, '#fff2c0', .95);
    s += sparkle(cx+R*0.7, cy-R*0.4, 1.8, '#fff2c0', .8);
    s += sparkle(cx+R*0.15, cy-R*0.85, 1.5, '#fff', .7);
  }
  if(def.ancient){
    s += '<ellipse cx="'+(cx-R*0.35)+'" cy="'+(topY+7)+'" rx="2.6" ry="1.4" fill="#4a8f5f" opacity=".8"/>';
    s += '<ellipse cx="'+(cx+R*0.2)+'" cy="'+(topY+12)+'" rx="2.2" ry="1.2" fill="#4a8f5f" opacity=".65"/>';
    s += sparkle(cx, cy-R*0.8, 2, '#cfe8d0', .8);
  }
  return { d: s, defs: defs };
}

/* ============ THÔNG (cone) ============ */
function pineTree(def, stage){
  var gBark = uid('b'), gT = uid('t'), gT2 = uid('t');
  var defs = linG(gBark, shade(def.bark,1.3), shade(def.bark,0.75)) +
             linG(gT, def.f3, def.f1) + linG(gT2, def.f2, def.f1);
  var s = '<path d="M30 57V46h4v11z" fill="url(#'+gBark+')"/>';
  var tiers = [ {yT:8,  yB:26, w:11}, {yT:19, yB:38, w:13.5}, {yT:31, yB:50, w:15.5} ];
  tiers.forEach(function(t, i){
    s += '<path d="M32 '+t.yT+' L'+(32+t.w)+' '+t.yB+' H'+(32-t.w)+' Z" fill="url(#'+(i===1?gT2:gT)+')"/>';
    s += '<path d="M32 '+(t.yT+3)+' L'+(32+t.w*0.62)+' '+(t.yB-2)+' H'+(32-t.w*0.62)+' Z" fill="url(#'+gT2+')" opacity=".55"/>';
    s += '<path d="M'+(32-t.w*0.8)+' '+(t.yB-2)+' L'+(32-t.w*0.55)+' '+(t.yT+5)+'" stroke="'+def.f3+'" stroke-width="1" opacity=".5" fill="none" stroke-linecap="round"/>';
  });
  if(stage >= 5){
    s += '<ellipse cx="27" cy="41" rx="1.4" ry="2" fill="#7a5230"/><ellipse cx="37" cy="45" rx="1.3" ry="1.8" fill="#8a5e38"/>';
  }
  return { d: s, defs: defs };
}

/* ============ DỪA (palm) ============ */
function palmTree(def, stage){
  var gBark = uid('b'), gF = uid('f');
  var defs = linG(gBark, shade(def.bark,1.35), shade(def.bark,0.8)) + linG(gF, def.f3, def.f1, 1, 0.4);
  var s = '<path d="M27.5 57 C29.5 46 30.5 40 34 30 L37.5 31 C34.5 41 33.5 47 33.5 57 Z" fill="url(#'+gBark+')"/>';
  [50,44,38].forEach(function(y){
    s += '<path d="M'+(29.4+(57-y)*0.13)+' '+y+' q2.6 .9 5 .2" stroke="rgba(0,0,0,.22)" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
  });
  var tx = 35.8, ty = 29.5, i;
  for(i = 0; i < 6; i++){
    var a = -170 + i*56, rad = a*Math.PI/180;
    var dx = Math.cos(rad), dy = Math.sin(rad)*0.62;
    var ex = tx + dx*14, ey = ty + dy*10 + 3.2;
    s += '<path d="M'+tx+' '+ty+' Q'+(tx+dx*8)+' '+(ty+dy*5-5.5)+' '+ex.toFixed(1)+' '+ey.toFixed(1)+
         ' Q'+(tx+dx*7.4)+' '+(ty+dy*4.4-1.4)+' '+tx+' '+(ty+1.2)+' Z" fill="url(#'+gF+')"/>';
    s += '<path d="M'+tx+' '+(ty+.4)+' Q'+(tx+dx*7)+' '+(ty+dy*4.4-3)+' '+ex.toFixed(1)+' '+(ey-1.4).toFixed(1)+'" stroke="'+def.f3+'" stroke-width=".9" fill="none" opacity=".8"/>';
  }
  if(stage >= 5){
    s += '<circle cx="34" cy="32.5" r="2" fill="#6b4a2b"/><circle cx="33" cy="31.4" r=".7" fill="#a5793a"/>';
    s += '<circle cx="37.6" cy="32.8" r="2" fill="#6b4a2b"/><circle cx="36.8" cy="31.8" r=".7" fill="#a5793a"/>';
  }
  return { d: s, defs: defs };
}

/* ============ HOA (10 loài riêng biệt) ============ */
function stemLeaves(def, h){
  var s = '<path d="M32 57 C31 '+(57-h*0.55)+' 33 '+(57-h*0.8)+' 32 '+(57-h)+'" stroke="'+def.f2+'" stroke-width="2" fill="none" stroke-linecap="round"/>';
  s += '<ellipse cx="'+(32-4.5)+'" cy="'+(57-h*0.38)+'" rx="3.6" ry="1.5" fill="'+def.f2+'" transform="rotate(-32 '+(32-4.5)+' '+(57-h*0.38)+')"/>';
  s += '<ellipse cx="'+(32+4.5)+'" cy="'+(57-h*0.55)+'" rx="3.4" ry="1.4" fill="'+def.f3+'" transform="rotate(30 '+(32+4.5)+' '+(57-h*0.55)+')"/>';
  return s;
}
function flowerIcon(def, stage){
  var id = def.id, h = def.big ? 26 : 20, cy = 57 - h - 4;
  var gP = uid('p'), gC = uid('c'), defs = linG(gP, def.fl, def.fl2) + radG(gC, shade(def.fc,1.35), def.fc);
  var s = stemLeaves(def, h), i;
  var glow = def.glow ? '<circle cx="32" cy="'+cy+'" r="13" fill="'+def.fl+'" opacity=".16"/>' : '';

  if(id === 'rose'){
    s += glow;
    for(i = 0; i < 6; i++){
      var a = i*60*Math.PI/180;
      s += '<ellipse cx="'+(32+Math.cos(a)*5.4).toFixed(1)+'" cy="'+(cy+Math.sin(a)*5.4*0.85).toFixed(1)+'" rx="4.6" ry="3.4" fill="url(#'+gP+')" transform="rotate('+(i*60+90)+' '+(32+Math.cos(a)*5.4).toFixed(1)+' '+(cy+Math.sin(a)*5.4*0.85).toFixed(1)+')"/>';
    }
    s += '<circle cx="32" cy="'+cy+'" r="4.6" fill="'+def.fl2+'"/>';
    s += '<path d="M32 '+(cy-3.4)+' a3.4 3 0 1 1 -3 4.6 a2.4 2 0 1 0 4.4 -1.4" stroke="'+def.fc+'" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    s += '<circle cx="33.4" cy="'+(cy-1.6)+'" r=".8" fill="'+shade(def.fl,1.25)+'"/>';
  }
  else if(id === 'tulip'){
    s += glow;
    s += '<path d="M26.4 '+(cy+4)+' C24.6 '+(cy-5)+' 27 '+(cy-9)+' 29.4 '+(cy-10)+' L30.6 '+(cy+1)+' Z" fill="url(#'+gP+')"/>';
    s += '<path d="M37.6 '+(cy+4)+' C39.4 '+(cy-5)+' 37 '+(cy-9)+' 34.6 '+(cy-10)+' L33.4 '+(cy+1)+' Z" fill="url(#'+gP+')" opacity=".92"/>';
    s += '<path d="M28.6 '+(cy+5)+' C27.4 '+(cy-4)+' 30 '+(cy-10.5)+' 32 '+(cy-11)+' C34 '+(cy-10.5)+' 36.6 '+(cy-4)+' 35.4 '+(cy+5)+' Q32 '+(cy+7)+' 28.6 '+(cy+5)+' Z" fill="'+def.fl+'"/>';
    s += '<path d="M30.4 '+(cy-7)+' q1.6 4 1.2 10" stroke="'+def.fl2+'" stroke-width="1" fill="none" opacity=".7"/>';
  }
  else if(id === 'sunflower'){
    for(i = 0; i < 12; i++){
      var a2 = i*30*Math.PI/180;
      s += '<ellipse cx="'+(32+Math.cos(a2)*8.2).toFixed(1)+'" cy="'+(cy+Math.sin(a2)*8.2).toFixed(1)+'" rx="2.9" ry="6.4" fill="url(#'+gP+')" transform="rotate('+(i*30)+' '+(32+Math.cos(a2)*8.2).toFixed(1)+' '+(cy+Math.sin(a2)*8.2).toFixed(1)+')"/>';
    }
    s += '<circle cx="32" cy="'+cy+'" r="5.8" fill="url(#'+gC+')"/>';
    s += '<circle cx="32" cy="'+cy+'" r="4" fill="none" stroke="'+shade(def.fc,1.5)+'" stroke-width=".8" opacity=".8"/>';
    for(i = 0; i < 8; i++){
      var a3 = i*45*Math.PI/180;
      s += '<circle cx="'+(32+Math.cos(a3)*2.4).toFixed(1)+'" cy="'+(cy+Math.sin(a3)*2.4).toFixed(1)+'" r=".55" fill="'+shade(def.fc,1.6)+'"/>';
    }
  }
  else if(id === 'lavender'){
    s += glow;
    for(i = 0; i < 8; i++){
      var ly = cy + 8 - i*2.3, lr = 2.6 - i*0.22;
      s += '<circle cx="'+(32-lr*0.75)+'" cy="'+ly+'" r="'+lr*0.72+'" fill="'+(i%2?def.fl:def.fl2)+'"/>';
      s += '<circle cx="'+(32+lr*0.75)+'" cy="'+(ly-1.1)+'" r="'+lr*0.72+'" fill="'+(i%2?def.fl2:def.fl)+'"/>';
    }
    s += '<circle cx="32" cy="'+(cy-10)+'" r="1.7" fill="'+def.fl+'"/>';
  }
  else if(id === 'lotus'){
    s += '<ellipse cx="32" cy="'+(cy+9)+'" rx="13" ry="3.4" fill="#2f6b8a" opacity=".7"/>';
    s += '<ellipse cx="32" cy="'+(cy+8.6)+'" rx="10" ry="2.4" fill="#4f9ad0" opacity=".5"/>';
    s += '<path d="M32 '+(cy+6)+' C26 '+(cy+2)+' 24 '+(cy-6)+' 32 '+(cy-11)+' C40 '+(cy-6)+' 38 '+(cy+2)+' 32 '+(cy+6)+' Z" fill="url(#'+gP+')"/>';
    s += '<path d="M32 '+(cy+5)+' C27 '+(cy+3)+' 23 '+(cy-2)+' 25.5 '+(cy-7)+' Q29 '+(cy-2)+' 32 '+(cy+2)+' Z" fill="'+def.fl2+'" opacity=".9"/>';
    s += '<path d="M32 '+(cy+5)+' C37 '+(cy+3)+' 41 '+(cy-2)+' 38.5 '+(cy-7)+' Q35 '+(cy-2)+' 32 '+(cy+2)+' Z" fill="'+def.fl2+'" opacity=".9"/>';
    s += '<ellipse cx="32" cy="'+(cy+1)+'" rx="2.6" ry="3.4" fill="url(#'+gC+')"/>';
    for(i = 0; i < 5; i++) s += '<circle cx="'+(29+ i*1.5)+'" cy="'+(cy-0.4+(i%2)*1.6)+'" r=".5" fill="#8a7a2a"/>';
  }
  else if(id === 'daisy'){
    for(i = 0; i < 10; i++){
      var a4 = i*36*Math.PI/180;
      s += '<ellipse cx="'+(32+Math.cos(a4)*6.4).toFixed(1)+'" cy="'+(cy+Math.sin(a4)*6.4).toFixed(1)+'" rx="2" ry="4.6" fill="url(#'+gP+')" transform="rotate('+(i*36)+' '+(32+Math.cos(a4)*6.4).toFixed(1)+' '+(cy+Math.sin(a4)*6.4).toFixed(1)+')"/>';
    }
    s += '<circle cx="32" cy="'+cy+'" r="4.2" fill="url(#'+gC+')"/>';
    s += '<circle cx="32" cy="'+cy+'" r="2.6" fill="none" stroke="'+shade(def.fc,0.8)+'" stroke-width=".8" opacity=".7"/>';
  }
  else if(id === 'orchid'){
    s += glow;
    s += '<ellipse cx="26.5" cy="'+(cy+2)+'" rx="5" ry="4" fill="url(#'+gP+')"/>';
    s += '<ellipse cx="37.5" cy="'+(cy+2)+'" rx="5" ry="4" fill="url(#'+gP+')"/>';
    s += '<ellipse cx="32" cy="'+(cy-5)+'" rx="3.2" ry="4.6" fill="'+def.fl+'"/>';
    s += '<path d="M29 '+(cy+4)+' q3 6 6 0 q-1 5 -3 5.6 q-2 -.6 -3 -5.6 z" fill="'+def.fl2+'"/>';
    s += '<circle cx="32" cy="'+(cy+1)+'" r="1.4" fill="url(#'+gC+')"/>';
  }
  else if(id === 'bluebell'){
    s += '<path d="M32 '+(57-h)+' C26 '+(57-h-3)+' 24 '+(cy+2)+' 26 '+(cy+4)+'" stroke="'+def.f2+'" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    [[26, cy+4],[33, cy+6],[40, cy+3.4]].forEach(function(b, bi){
      var bx = b[0] + (bi===1?2:bi===2?4:0) - 2, by = b[1];
      s += '<path d="M'+(bx-3)+' '+by+' q3 -5 6 0 q-1 4.4 -3 4.6 q-2 -.2 -3 -4.6 z" fill="url(#'+gP+')"/>';
      s += '<path d="M'+(bx-2)+' '+(by+4)+' l1 1.4 M'+bx+' '+(by+4.6)+' l.6 1.5 M'+(bx+2)+' '+(by+4)+' l0 1.6" stroke="'+def.fl2+'" stroke-width=".8" stroke-linecap="round"/>';
    });
  }
  else if(id === 'moonflower'){
    for(i = 0; i < 5; i++){
      var a5 = i*72*Math.PI/180 - Math.PI/2;
      var px = 32 + Math.cos(a5)*6.4, py = cy + Math.sin(a5)*6.4;
      s += '<path d="M32 '+cy+' Q'+(32+Math.cos(a5-0.5)*7).toFixed(1)+' '+(cy+Math.sin(a5-0.5)*7).toFixed(1)+' '+px.toFixed(1)+' '+py.toFixed(1)+
           ' Q'+(32+Math.cos(a5+0.5)*7).toFixed(1)+' '+(cy+Math.sin(a5+0.5)*7).toFixed(1)+' 32 '+cy+' Z" fill="url(#'+gP+')"/>';
    }
    s += '<circle cx="32" cy="'+cy+'" r="2.2" fill="'+def.fc+'"/>';
    s += sparkle(24, cy-8, 1.6, '#fff', .8); s += sparkle(41, cy+3, 1.3, '#fff', .6);
  }
  else if(id === 'fireflower'){
    for(i = 0; i < 5; i++){
      var a6 = i*72*Math.PI/180 - Math.PI/2;
      var px2 = 32 + Math.cos(a6)*7, py2 = cy + Math.sin(a6)*7;
      s += '<path d="M32 '+cy+' C'+(32+Math.cos(a6)*3).toFixed(1)+' '+(cy+Math.sin(a6)*3-3).toFixed(1)+' '+px2.toFixed(1)+' '+(py2-2).toFixed(1)+' '+px2.toFixed(1)+' '+py2.toFixed(1)+
           ' C'+(32+Math.cos(a6+0.35)*6).toFixed(1)+' '+(cy+Math.sin(a6+0.35)*6+1.5).toFixed(1)+' 32 '+cy+' 32 '+cy+' Z" fill="url(#'+gP+')"/>';
    }
    s += '<circle cx="32" cy="'+cy+'" r="2.6" fill="url(#'+gC+')"/>';
    s += sparkle(23, cy-7, 1.8, '#ffd060', .9); s += sparkle(42, cy+2, 1.4, '#ff9a5c', .7);
  }
  else { /* hoa generic 6 cánh */
    for(i = 0; i < 6; i++){
      var a7 = i*60*Math.PI/180;
      s += '<ellipse cx="'+(32+Math.cos(a7)*5.6).toFixed(1)+'" cy="'+(cy+Math.sin(a7)*5.6).toFixed(1)+'" rx="3.2" ry="4.6" fill="url(#'+gP+')" transform="rotate('+(i*60)+' '+(32+Math.cos(a7)*5.6).toFixed(1)+' '+(cy+Math.sin(a7)*5.6).toFixed(1)+')"/>';
    }
    s += '<circle cx="32" cy="'+cy+'" r="3" fill="url(#'+gC+')"/>';
  }
  return { d: glow + s, defs: defs };
}

/* ============ BỤI BERRY / SHRUB ============ */
function bushIcon(def, stage){
  var g1 = uid('c'), g2 = uid('c'), gFr = uid('f');
  var defs = radG(g1, def.f3, def.f1) + radG(g2, def.f2, def.f1) + radG(gFr, def.fr2 || def.fr, def.fr || '#333');
  var R = def.small ? 8 : 10.5;
  var cy = 57 - R*0.9;
  var s = '<ellipse cx="'+(32-R*0.6)+'" cy="'+(cy+R*0.3)+'" rx="'+(R*0.72)+'" ry="'+(R*0.6)+'" fill="url(#'+g2+')"/>';
  s += '<ellipse cx="'+(32+R*0.6)+'" cy="'+(cy+R*0.3)+'" rx="'+(R*0.72)+'" ry="'+(R*0.6)+'" fill="url(#'+g2+')"/>';
  s += '<circle cx="32" cy="'+cy+'" r="'+R+'" fill="url(#'+g1+')"/>';
  s += '<circle cx="'+(32-R*0.3)+'" cy="'+(cy-R*0.35)+'" r="1.3" fill="'+def.f3+'" opacity=".9"/>';
  s += '<circle cx="'+(32+R*0.38)+'" cy="'+(cy-R*0.18)+'" r="1.1" fill="'+def.f3+'" opacity=".8"/>';
  if(def.fr && stage >= 5){
    var pts = [[-4.5,-1],[4.6,-1.4],[-1.5,2.4],[2.6,2],[-6,2.2],[6.4,1.8]];
    pts.forEach(function(p){
      s += '<circle cx="'+(32+p[0])+'" cy="'+(cy+p[1])+'" r="1.9" fill="url(#'+gFr+')"/>';
      s += '<circle cx="'+(32+p[0]-0.6)+'" cy="'+(cy+p[1]-0.6)+'" r=".55" fill="#fff" opacity=".8"/>';
    });
  }
  if(!def.fr && stage >= 5){
    s += blossom(27, cy-1, 1.5, '#f2a3c0', '#fff');
    s += blossom(37, cy+1, 1.4, '#f2a3c0', '#fff');
  }
  return { d: s, defs: defs };
}

/* ============ DƯƠNG XỈ (fern) ============ */
function fernIcon(def, stage){
  var s = '', i, f;
  for(f = 0; f < 5; f++){
    var a = -64 + f*32, rad = a*Math.PI/180;
    var L = stage >= 4 ? 15 : 12;
    var p0 = [32, 56], p1 = [32 + Math.cos(rad)*L*0.4, 56 + Math.sin(rad)*L*0.55 - 4];
    var p2 = [32 + Math.cos(rad)*L, 56 + Math.sin(rad)*L*0.8 - 9];
    s += '<path d="M'+p0[0]+' '+p0[1]+' Q'+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+' '+p2[0].toFixed(1)+' '+p2[1].toFixed(1)+'" stroke="'+(f%2?def.f2:def.f3)+'" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    for(i = 1; i <= 5; i++){
      var pt = qp(p0, p1, p2, i/5.4);
      s += '<path d="M'+pt[0].toFixed(1)+' '+pt[1].toFixed(1)+' l'+(f%2?2.4:-2.4)+' -1.6" stroke="'+def.f3+'" stroke-width="1.1" stroke-linecap="round"/>';
      s += '<path d="M'+pt[0].toFixed(1)+' '+pt[1].toFixed(1)+' l'+(f%2?-1.8:1.8)+' 1.8" stroke="'+def.f2+'" stroke-width="1" stroke-linecap="round"/>';
    }
  }
  return { d: s, defs: '' };
}

/* ============ TRÚC (bamboo) ============ */
function bambooIcon(def, stage){
  var gC = uid('c');
  var defs = linG(gC, shade(def.f2,1.2), shade(def.f2,0.82));
  var s = '', canes = [[22.5,34],[32,44],[41.5,28]];
  canes.forEach(function(c, ci){
    var x = c[0], top = 57 - c[1];
    s += '<rect x="'+(x-1.6)+'" y="'+top+'" width="3.2" height="'+c[1]+'" rx="1.4" fill="url(#'+gC+')"/>';
    for(var y = top + 6; y < 55; y += 7)
      s += '<path d="M'+(x-1.7)+' '+y+' h3.4" stroke="rgba(0,0,0,.28)" stroke-width="1"/>';
    s += '<ellipse cx="'+x+'" cy="'+top+'" rx="1.6" ry=".7" fill="'+shade(def.f2,1.15)+'"/>';
    var la = ci%2 ? -1 : 1;
    s += '<path d="M'+x+' '+(top+1)+' q'+(la*5)+' -2 '+(la*8.5)+' 1.5 q-'+(la*4)+' 1.4 -'+(la*8.5)+' -1.5 z" fill="'+def.f1+'"/>';
    s += '<path d="M'+x+' '+(top+3)+' q'+(la*4)+' 1 '+(la*6.5)+' 4.5 q-'+(la*3.4)+' .4 -'+(la*6.5)+' -4.5 z" fill="'+def.f2+'"/>';
  });
  s += '<circle cx="27" cy="56" r="1.1" fill="#6a8a4a"/><circle cx="37" cy="56.4" r="1" fill="#5c7a3f"/>';
  return { d: s, defs: defs };
}

/* ============ NẤM (mushroom) ============ */
function mushroomIcon(def, stage){
  var gCap = uid('c');
  var defs = radG(gCap, def.f3, def.f1);
  var s = '<path d="M29 38 C29 46 28.6 51 28.4 55 h7.2 C35.4 51 35 46 35 38 Z" fill="url(#'+gCap+')" opacity=".95"/>';
  s = s.replace('url(#'+gCap+')', shade(def.bark, 1)) ;
  s = '<path d="M29 38 C29 46 28.6 51 28.4 55 h7.2 C35.4 51 35 46 35 38 Z" fill="#e8ddc8"/>';
  s += '<ellipse cx="32" cy="41.5" rx="4.4" ry="1.1" fill="#d4c5a8"/>';
  s += '<path d="M17 38 a15 11 0 0 1 30 0 q-15 3.4 -30 0 z" fill="url(#'+gCap+')"/>';
  s += '<path d="M17.6 37.6 q14.4 3 28.8 0" stroke="'+shade(def.f1,0.75)+'" stroke-width="1" fill="none" opacity=".7"/>';
  s += '<circle cx="25" cy="31.5" r="2.3" fill="#f2ead8"/>';
  s += '<circle cx="36" cy="29.5" r="2.8" fill="#f2ead8"/>';
  s += '<circle cx="31.5" cy="25.5" r="1.8" fill="#f2ead8"/>';
  s += '<circle cx="40.5" cy="34" r="1.5" fill="#f2ead8" opacity=".9"/>';
  s += '<path d="M20.5 40.5 l1.8 2.2 M26 41.6 l1 2.4 M38 41.6 l-1 2.4 M43.4 40.4 l-1.8 2.2" stroke="'+shade(def.f1,0.7)+'" stroke-width=".9" stroke-linecap="round"/>';
  s += '<path d="M26 56.4 q1.4 -3 .6 -5 M31 57 q.6 -3.4 0 -5.6 M36.5 56.6 q-1 -3 -.4 -5" stroke="#4f8f54" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  return { d: s, defs: defs };
}

/* ============ TINH THỂ (crystal) ============ */
function crystalIcon(def, stage){
  var gM = uid('c'), gS = uid('c');
  var defs = linG(gM, '#e8fbff', def.f1) + linG(gS, def.f3, shade(def.f1, 0.85));
  var H = stage >= 4 ? 1 : 0.85;
  var s = '<g transform="translate(32 50) scale('+H+') translate(-32 -50)">';
  s += '<path d="M32 8 L40 26 L37 48 L27 48 L24 26 Z" fill="url(#'+gM+')"/>';
  s += '<path d="M32 8 L32 48" stroke="#fff" stroke-width="1" opacity=".65"/>';
  s += '<path d="M32 8 L40 26 L37 48" fill="none" stroke="#fff" stroke-width=".7" opacity=".45"/>';
  s += '<path d="M24 26 L27 48" stroke="'+shade(def.f1,0.7)+'" stroke-width=".8" opacity=".6"/>';
  s += '<path d="M18 34 L22 40 L20.5 50 L15.5 50 L14.5 41 Z" fill="url(#'+gS+')"/>';
  s += '<path d="M46 36 L49 41 L48 49 L43.5 49 L42.5 42 Z" fill="url(#'+gS+')"/>';
  s += '<ellipse cx="32" cy="50" rx="14" ry="3.4" fill="rgba(0,0,0,.35)"/>';
  s += '<circle cx="20" cy="49" r="2.2" fill="#3a4a44"/><circle cx="44" cy="49.4" r="1.8" fill="#3a4a44"/>';
  s += sparkle(45, 18, 2.6, '#fff', .95) + sparkle(19, 26, 2, '#dffaff', .8) + sparkle(37, 12, 1.5, '#fff', .7);
  s += '</g>';
  return { d: s, defs: defs };
}

/* ============ THẢO TINH TÚ (star) ============ */
function starIcon(def, stage){
  var gS = uid('s');
  var defs = radG(gS, '#fff8dc', def.f1);
  var s = '<path d="M32 57 C31 50 33 46 32 40" stroke="'+def.bark+'" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  s += '<path d="'+starPath(32, 26, 11, 4.6, 0)+'" fill="url(#'+gS+')"/>';
  s += '<circle cx="32" cy="26" r="3.4" fill="#fff" opacity=".35"/>';
  s += '<circle cx="18" cy="34" r="1.6" fill="'+def.f2+'"/><circle cx="46" cy="32" r="1.4" fill="'+def.f2+'"/><circle cx="24" cy="16" r="1.2" fill="'+def.f3+'"/>';
  s += sparkle(44, 18, 2.4, '#fff', .95) + sparkle(20, 44, 1.8, '#ffe9a0', .8) + sparkle(40, 44, 1.5, '#fff', .7);
  return { d: s, defs: defs };
}

/* ============ HẠT / MẦM ============ */
function seedInner(def){
  return soilBase() +
    '<ellipse cx="32" cy="52.5" rx="4.6" ry="3.4" fill="'+shade(def.bark||'#6b4a2b',1.1)+'" transform="rotate(-18 32 52.5)"/>'+
    '<ellipse cx="30.8" cy="51.4" rx="1.5" ry="1" fill="#fff" opacity=".45" transform="rotate(-18 30.8 51.4)"/>'+
    '<path d="M33.5 54.5 q1.4 -1 1.8 -2.4" stroke="rgba(0,0,0,.3)" stroke-width=".8" fill="none" stroke-linecap="round"/>';
}
function sproutInner(def){
  var c = def.f2 || '#5cb464', c2 = def.f3 || c;
  return soilBase() +
    '<path d="M32 55 C32 51 32 49 32 47.5" stroke="#4a7d3a" stroke-width="2" fill="none" stroke-linecap="round"/>'+
    '<path d="M32 48.5 C27 47.5 25 44 26.4 41.4 C30 42 31.8 45 32 48.5 Z" fill="'+c+'"/>'+
    '<path d="M32 48 C36.5 47 38.5 43.8 37.4 41 C33.8 41.6 32.2 44.6 32 48 Z" fill="'+c2+'"/>'+
    '<path d="M28.4 44.6 q1.8 .6 3 2.4" stroke="rgba(255,255,255,.35)" stroke-width=".8" fill="none"/>';
}

/* ============ DISPATCH + STAGE WRAP ============ */
function fullPlant(def, stage){
  switch(def.shape){
    case 'round':    return roundTree(def, stage);
    case 'cone':     return pineTree(def, stage);
    case 'palm':     return palmTree(def, stage);
    case 'flower':   return flowerIcon(def, stage);
    case 'bush':     return bushIcon(def, stage);
    case 'fern':     return fernIcon(def, stage);
    case 'bamboo':   return bambooIcon(def, stage);
    case 'mushroom': return mushroomIcon(def, stage);
    case 'crystal':  return crystalIcon(def, stage);
    case 'star':     return starIcon(def, stage);
  }
  return { d: '', defs: '' };
}

/* Icon chính: stage 0=hạt 1=mầm 2..5 cây scale dần */
NG.plantIcon = function(def, stage){
  if(!def) return '';
  stage = (stage == null) ? 5 : stage;
  if(stage === 0) return iconWrap(seedInner(def));
  if(stage === 1) return iconWrap(sproutInner(def));
  var sc = [1, 1, 0.45, 0.66, 0.85, 1][stage] || 1;
  var out = fullPlant(def, stage);
  return iconWrap('<defs>' + out.defs + '</defs>' + soilBase() +
    '<g transform="translate(32 57) scale(' + sc + ') translate(-32 -57)">' + out.d + '</g>');
};
})();
