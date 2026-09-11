/* NOXGARDEN — UTILS: DOM, icons, sound, toast, FX, modal */
(function(){
'use strict';
var NG = window.NG;

NG.$  = function(s){ return document.querySelector(s); };
NG.$$ = function(s){ return [].slice.call(document.querySelectorAll(s)); };
NG.esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
NG.fmtN = function(n){ return Number(n || 0).toLocaleString('vi-VN'); };
NG.safeUrl = function(u){ var s = String(u || '').trim(); return /^https?:\/\//i.test(s) ? s : null; };
NG.timeAgo = function(ts){ var s = Math.floor((Date.now() - ts) / 1e3);
  return s < 60 ? 'Vừa xong' : s < 3600 ? Math.floor(s/60) + 'p trước' : s < 86400 ? Math.floor(s/3600) + 'h trước' : Math.floor(s/86400) + 'd trước'; };

/* ---- ICON SVG (thủ công, stroke 2, lưới 24) ---- */
var P = {
  seed:'<path d="M12 3.2c3.9 4.9 6.3 7.8 6.3 10.7a6.3 6.3 0 1 1-12.6 0C5.7 11 8.1 8.1 12 3.2zM12 9.2v5.6"/>',
  drop:'<path d="M12 3.4c3.4 4.5 5.9 7.6 5.9 10.4a5.9 5.9 0 1 1-11.8 0C6.1 11 8.6 7.9 12 3.4z"/>',
  basket:'<path d="M3.8 10h16.4l-1.8 8.3a2.4 2.4 0 0 1-2.4 1.9H8a2.4 2.4 0 0 1-2.4-1.9L3.8 10zM8.6 10l2-5.6M15.4 10l-2-5.6M3.8 14h16.4"/>',
  boost:'<path d="M12 3.4c3.4 4.5 5.9 7.6 5.9 10.4a5.9 5.9 0 1 1-11.8 0c0-1.7.7-3.4 1.9-5.3M9.4 12.8l2.1 2.1 3.6-4"/>',
  star:'<path d="M12 3.5l2.3 5.2 5.6.5-4.2 3.8 1.2 5.5L12 15.6l-4.9 2.9 1.2-5.5L4.1 9.2l5.6-.5L12 3.5z"/>',
  trophy:'<path d="M7 4h10v4.2a5 5 0 0 1-10 0V4zM7 5H4.6A3.1 3.1 0 0 0 8 9.2M17 5h2.4A3.1 3.1 0 0 1 16 9.2M12 13.2v3.6M8.5 20.5h7"/>',
  users:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c1.1-2.8 3.2-4.2 5.5-4.2s4.4 1.4 5.5 4.2M15.5 6a3 3 0 0 1 0 5.4M17.5 15.1c1.5.7 2.6 2 3.3 3.9"/>',
  x:'<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  check:'<path d="m4.5 12.5 5 5L19.5 6.5"/>',
  trash:'<path d="M4.5 7h15M9.7 7V5.4A1.6 1.6 0 0 1 11.3 4h1.4a1.6 1.6 0 0 1 1.6 1.4V7M6.5 7l.9 12.1A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.9L17.5 7"/>',
  pencil:'<path d="M4.5 19.5l.9-3.7L16.7 4.5a2.1 2.1 0 0 1 3 3L8.4 18.8l-3.9.7zM14.6 6.6l2.8 2.8"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  terminal:'<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="m7.5 9.3 3 2.7-3 2.7M12.8 15h4"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.6M20 4.4v4.2h-4.2"/>',
  heart:'<path d="M12 20.2C7.3 16.7 3.7 13.4 3.7 10 3.7 7.5 5.6 5.5 8 5.5c1.5 0 2.9.8 4 2.1 1.1-1.3 2.5-2.1 4-2.1 2.4 0 4.3 2 4.3 4.5 0 3.4-3.6 6.7-8.3 10.2z"/>',
  gem:'<path d="M7 3.5h10L21 9l-9 11.5L3 9l4-5.5zM3 9h18M12 20.5 8.2 9l3.8-5.5L15.8 9 12 20.5z"/>',
  sun:'<circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/>',
  moon:'<path d="M20.2 14.2A8.6 8.6 0 1 1 9.8 3.8a6.9 6.9 0 0 0 10.4 10.4z"/>',
  cloud:'<path d="M7 17.8a4.1 4.1 0 0 1-.6-8.2A5.4 5.4 0 0 1 16.9 8.5 3.9 3.9 0 0 1 17.4 17.8H7z"/>',
  leaf:'<path d="M5.2 18.8C5.2 10.2 11 5.2 19.8 4.2 18.8 13 13.8 18.8 5.2 18.8zM5.2 18.8c3-6 7-10 11.5-12.8"/>',
  script:'<path d="m8 8-4.2 4L8 16M16 8l4.2 4L16 16M13.4 5l-2.8 14"/>',
  wrench:'<path d="M14.7 6.3a4.4 4.4 0 0 0-5.9 5.7L4 16.8a2 2 0 1 0 2.9 2.9l4.8-4.8a4.4 4.4 0 0 0 5.7-5.9l-2.8 2.8-2.4-2.4 2.5-3.1z"/>',
  scissors:'<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8.2 7.8 20 19M8.2 16.2 20 5"/>',
  clock:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.1 2.1"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="9" rx="2.6"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2"/>'
};
NG.ic = function(name, s){
  s = s || 18;
  return '<svg viewBox="0 0 24 24" width="'+s+'" height="'+s+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[name]||'')+'</svg>';
};

/* ---- SOUND (WebAudio, không autoplay) ---- */
var SND = NG.SND = {
  enabled: NG.store.get('snd', true), ctx: null, last: 0,
  ensure: function(){ if(!this.ctx){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  beep: function(f1, f2, d, v, type){
    var c = this.ensure(); if(!c) return;
    var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d + .02);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .03);
  },
  play: function(k){
    if(!this.enabled) return;
    var n = performance.now(); if(n - this.last < 45) return; this.last = n;
    var m = { nav:[1600,850,.06,.045], buy:[880,1500,.11,.06], harvest:[620,1750,.14,.065],
      err:[420,180,.13,.055], dev:[2000,2450,.05,.035], like:[1450,2250,.08,.05] }[k] || [1600,850,.06,.045];
    this.beep(m[0], m[1], m[2], m[3]);
  },
  chime: function(){ if(!this.enabled) return; var self = this;
    [523,659,784,1047].forEach(function(f,i){ setTimeout(function(){ self.beep(f, f, .22, .06); }, i*105); }); }
};

/* ripple khi bấm */
document.addEventListener('pointerdown', function(e){
  try{
    var t = e.target.closest ? e.target.closest('button,.row,.mk-tab,.dock-btn,.mk-item,.p2,.lb-item') : null;
    if(!t) return;
    SND.play(t.closest('#devPanel') ? 'dev' : 'nav');
    if(!NG.REDUCE){
      var r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.1,
          s = document.createElement('span'); s.className = 'rp';
      s.style.cssText = 'width:'+d+'px;height:'+d+'px;left:'+((e.clientX||r.left+r.width/2)-r.left-d/2)+'px;top:'+((e.clientY||r.top+r.height/2)-r.top-d/2)+'px';
      t.appendChild(s); setTimeout(function(){ s.remove(); }, 620);
    }
  }catch(_){}
}, {passive:true});

/* ---- TOAST + LIVE MSG + FX ---- */
var recentK = new Map(), lmT = null;
NG.notify = function(msg, icn, key){
  icn = icn || 'star';
  var box = NG.$('#toasts'); if(!box) return;
  if(key){ var n = Date.now(), l = recentK.get(key); if(l && n - l < 1600) return; recentK.set(key, n); }
  while(box.children.length >= 3) box.firstChild.remove();
  var el = document.createElement('div'); el.className = 'toast lg';
  el.innerHTML = '<span style="font-size:15px">' + (icn.length <= 3 ? esc(icn) : NG.ic(icn, 15)) + '</span><span class="wb">' + NG.esc(msg) + '</span>';
  box.appendChild(el);
  setTimeout(function(){ el.classList.add('out'); setTimeout(function(){ el.remove(); }, 350); }, 2600);
};
NG.liveMsg = function(iconT, text, hold){
  hold = hold || 3000;
  var el = NG.$('#liveMsg'); if(!el) return;
  NG.$('#lmIc').innerHTML = iconT.length <= 3 ? NG.esc(iconT) : NG.ic(iconT, 16);
  NG.$('#lmTx').textContent = text;
  el.classList.add('show'); clearTimeout(lmT);
  lmT = setTimeout(function(){ el.classList.remove('show'); }, hold);
};
NG.fpop = function(el, txt, color){
  if(!el || NG.REDUCE) return;
  var r = el.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'fpop'; s.textContent = txt;
  s.style.cssText = 'left:'+(r.left+r.width/2-24)+'px;top:'+(r.top-6)+'px;position:fixed;'+(color?'color:'+color:'');
  document.body.appendChild(s); setTimeout(function(){ s.remove(); }, 1200);
};
NG.confetti = function(){
  if(NG.REDUCE) return;
  var cols = ['#8fd99a','#f6b73c','#e86a9a','#7fb3e8','#f2c14e'];
  for(var i = 0; i < 26; i++){ (function(i){
    var c = document.createElement('span'); c.className = 'confetti';
    c.style.cssText = 'left:'+(innerWidth/2+(Math.random()*160-80))+'px;top:'+(innerHeight*.35)+'px;background:'+cols[i%5]+';--cx:'+(Math.random()*220-110)+'px;--cr:'+(Math.random()*720-360)+'deg';
    document.body.appendChild(c); setTimeout(function(){ c.remove(); }, 2000);
  })(i); }
};
NG.burstEl = function(el, n){
  n = n || 10; if(!el || NG.REDUCE) return;
  var r = el.getBoundingClientRect();
  for(var i = 0; i < n; i++){ (function(){
    var s = document.createElement('span'); s.className = 'rp'; var sz = 6 + Math.random()*10;
    s.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+(r.left+r.width/2-sz/2)+'px;top:'+(r.top+r.height/2-sz/2)+'px;position:fixed;z-index:130;pointer-events:none';
    document.body.appendChild(s); setTimeout(function(){ s.remove(); }, 620);
  })(); }
};

/* ---- MODAL ---- */
var ov = null;
NG.openModal = function(title, body, actions){
  ov = ov || NG.$('#mOverlay');
  NG.$('#mTitle').textContent = title;
  NG.$('#mBody').innerHTML = body;
  var f = NG.$('#mFoot'); f.innerHTML = '';
  (actions || []).forEach(function(a){
    var b = document.createElement('button');
    b.className = 'btn' + (a.primary?' primary':'') + (a.danger?' danger':'') + (a.gold?' gold':'');
    b.innerHTML = a.html || NG.esc(a.label);
    if(a.onClick) b.addEventListener('click', function(){ a.onClick(b); });
    f.appendChild(b);
  });
  ov.classList.add('show'); ov.style.pointerEvents = 'auto';
  document.body.classList.add('locked');
  var fi = NG.$('#mBody input'); if(fi) setTimeout(function(){ try{ fi.focus(); }catch(e){} }, 150);
};
NG.closeModal = function(){
  ov = ov || NG.$('#mOverlay');
  ov.classList.remove('show'); ov.style.pointerEvents = 'none';
  document.body.classList.remove('locked');
};

/* ---- clipboard ---- */
NG.copyText = function(t, done){
  var ok = function(){ NG.notify('Đã sao chép','check','cp'); if(done) done(); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok).catch(function(){ fbCopy(t, ok); });
  else fbCopy(t, ok);
};
function fbCopy(t, cb){
  var ta = document.createElement('textarea'); ta.value = t;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  ta.remove(); if(cb) cb();
}
})();
