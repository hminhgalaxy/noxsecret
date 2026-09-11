/* NOXGARDEN — NAVIGATION + DELEGATION + BOOT (duy nhất) */
(function(){
'use strict';
var NG = window.NG;

/* ---- FAVICON + HOME SCENE ---- */
try{
  var fl = document.createElement('link'); fl.rel = 'icon'; fl.type = 'image/svg+xml';
  fl.href = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="45" fill="#15291b"/><circle cx="61" cy="33" r="14" fill="#f6b73c"/><path d="M25 71C25 47 39 33 68 30.5 66 57 51 69 25 71Z" fill="#3e8e4d"/></svg>');
  document.head.appendChild(fl);
}catch(e){}

NG.$('#brandLogo').textContent = '🌿';

function buildHomeScene(){
  var s = NG.$('#homeScene'); if(!s) return;
  var stars = '';
  if(!NG.REDUCE) for(var i = 0; i < 20; i++)
    stars += '<span class="hstar" style="width:'+(1+Math.random()*2)+'px;height:'+(1+Math.random()*2)+'px;left:'+Math.random()*100+'%;top:'+Math.random()*40+'%;animation-delay:'+(Math.random()*3)+'s"></span>';
  var fly = '<svg viewBox="0 0 48 44" style="width:100%"><defs><linearGradient id="bwf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fc3f0"/><stop offset="1" stop-color="#f6b73c"/></linearGradient></defs><path d="M22 20C12 4 2 6 4 15c2 9 10 12 18 9z" fill="url(#bwf)"/><path d="M26 20C36 4 46 6 44 15c-2 9-10 12-18 9z" fill="url(#bwf)"/><ellipse cx="24" cy="24" rx="2.6" ry="9" fill="#4a3421"/></svg>';
  s.innerHTML = '<div class="sky"></div><div class="horb sun" id="hsOrb"></div>'+
    '<span class="hc" style="animation-duration:56s"></span>'+
    '<span class="hc" style="top:32%;animation-duration:78s;animation-delay:-30s;transform:scale(.7)"></span>'+ stars +
    '<div class="hsg"></div>'+
    '<span class="hsf" style="left:8%">'+NG.plantIcon(NG.plantById('daisy'),4)+'</span>'+
    '<span class="hsf" style="left:32%">'+NG.plantIcon(NG.plantById('tulip'),4)+'</span>'+
    '<span class="hsf" style="left:58%">'+NG.plantIcon(NG.plantById('sunflower'),4)+'</span>'+
    '<span class="hsf" style="left:83%">'+NG.plantIcon(NG.plantById('rose'),4)+'</span>'+
    '<span class="hsfly">'+fly+'</span>';
}

/* ---- NAVIGATION ---- */
var switching = false, lastSY = 0;
function moveInd(btn){
  var ind = NG.$('#dockInd'); if(!btn || !ind) return;
  if(innerWidth >= 1100){
    ind.style.width = 'auto'; ind.style.height = btn.offsetHeight + 'px';
    ind.style.transform = 'translateY(' + btn.offsetTop + 'px)';
  } else {
    ind.style.height = 'auto'; ind.style.width = btn.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
  }
}
NG.go = function(v){
  if(v === NG.state.cur || switching) return;
  var o = NG.$('#view-' + NG.state.cur), n = NG.$('#view-' + v);
  if(!n) return;
  switching = true;
  NG.closePV();
  NG.$$('.dock-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.goto === v); });
  moveInd(NG.$('.dock-btn[data-goto="' + v + '"]'));
  NG.$('#dock').classList.remove('hide');
  setTimeout(function(){
    o.classList.remove('active'); n.classList.add('active');
    window.scrollTo(0, 0); lastSY = 0;
    requestAnimationFrame(function(){ moveInd(NG.$('.dock-btn[data-goto="' + v + '"]')); });
    onView(v);
    NG.state.cur = v;
    setTimeout(function(){ switching = false; }, 160);
  }, 70);
};
function onView(v){
  if(v === 'garden'){ NG.G3D.enter(); NG.renderGardenUI(); }
  else NG.G3D.pause();
  if(v === 'market') NG.renderMarket();
  if(v === 'inv') NG.renderInv();
  if(v === 'profile') NG.fillProfile();
  if(v === 'chat') NG.Chat.enter();
  if(v === 'util') NG.Util.load();
  if(v === 'home') NG.renderActs();
}

addEventListener('resize', function(){
  moveInd(NG.$('.dock-btn.active')); NG.G3D.resize();
});
addEventListener('scroll', function(){
  var y = scrollY;
  if(y > lastSY + 8 && y > 140) NG.$('#dock').classList.add('hide');
  else if(y < lastSY - 8 || y < 140) NG.$('#dock').classList.remove('hide');
  lastSY = y;
}, {passive:true});

/* ---- MAINTENANCE ---- */
var mtRef = null, mtTimer = null;
function watchMaintenance(){
  if(mtRef || !NG.FB_LIVE) return;
  mtRef = NG.db.ref('nox_maintenance');
  mtRef.on('value', function(s){ try{ applyMaintenance(s.val()); }catch(e){ console.error(e); } });
  NG.lisN++; NG.updLis();
}
function applyMaintenance(m){
  clearInterval(mtTimer);
  var active = !!(m && m.on && (!m.end || NG.serverNow() < m.end));
  if(m && m.on && m.end && NG.serverNow() >= m.end){
    NG.db.ref('nox_maintenance/on').set(false).catch(function(){}); return;
  }
  var isDev = NG.resolveRole() === 'DEV', o = NG.$('#mtOverlay');
  if(active && !isDev){
    NG.$('#mtTitle').textContent = m.title || 'NOXGARDEN đang bảo trì';
    NG.$('#mtReason').textContent = m.reason || 'Nâng cấp hệ thống.';
    var tick = function(){
      var c = NG.$('#mtCount');
      if(c) c.textContent = m.end ? fmtHMS(m.end - NG.serverNow()) : '--:--:--';
    };
    tick(); mtTimer = setInterval(tick, 1000);
    o.classList.add('show'); o.style.pointerEvents = 'auto';
    NG.liveMsg('🔧','Bảo trì: ' + (m.title || 'Đang bảo trì'), 4000);
  } else {
    o.classList.remove('show'); o.style.pointerEvents = 'none';
  }
}
function fmtHMS(ms){
  var s = Math.max(0, Math.floor(ms/1000));
  return String(Math.floor(s/3600)).padStart(2,'0') + ':' +
         String(Math.floor(s%3600/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

/* ---- ACT REGISTRY (một delegation duy nhất) ---- */
NG.ACT = {
  /* auth */
  loginOpen: function(){ NG.openLoginModal(); },
  google: function(){ NG.tryGooglePrompt(); },
  guest: function(){ NG.closeModal(); NG.guestLogin(); },
  logout: function(){
    if(!NG.state.user) return NG.openLoginModal();
    NG.openModal('Đăng xuất','<p>Đăng xuất khỏi thiết bị này?</p>',
      [{label:'Huỷ',onClick:NG.closeModal},
       {label:'Đăng xuất',danger:true,onClick:function(){ NG.closeModal(); NG.setLoggedOut(); }}]);
  },
  logoutHard: function(){ NG.setLoggedOut(); },
  /* generic */
  actClear: function(){ NG.store.set('acts', []); NG.renderActs(); NG.notify('Đã xoá','🗑','act'); },
  mClose: NG.closeModal, pvClose: NG.closePV,
  editProfile: function(){ NG.editProfileModal(); },
  /* garden */
  plot: function(el){ NG.plotClick(+el.dataset.id, el); },
  plant: function(el){ NG.plantSeed(el.dataset.id); },
  waterAll: function(){ NG.waterAll(); },
  claimDaily: function(el){ NG.claimDaily(el); },
  claimQ: function(el){ NG.claimQ(el); },
  camReset: function(){ NG.G3D.resetCam(); },
  togShadow: function(){ NG.G3D.toggleShadow(); },
  /* market / inventory */
  mkTab: function(el){ NG.MK.tab = el.dataset.id; NG.renderMarket(); },
  ivTab: function(el){ NG.IV.tab = el.dataset.id; NG.renderInv(); },
  buy: function(el){ NG.Market.buy(el); },
  buyTool: function(el){
    var t = null; NG.TOOLS.forEach(function(x){ if(x.id === el.dataset.id) t = x; });
    if(!t) return;
    if(!NG.spend(t.c, 0)) return NG.notify('Không đủ xu!','✕','err');
    NG.G.tools[t.id] = true; NG.Garden.save();
    NG.notify('Đã mua ' + t.n + '!','🛠','bt'); NG.logAct('🛒','Mua: ' + t.n);
    NG.renderInv(); NG.renderMarket();
  },
  buyDecor: function(el){
    var t = null; NG.DECORS.forEach(function(x){ if(x.id === el.dataset.id) t = x; });
    if(!t) return;
    if(!NG.spend(t.c, 0)) return NG.notify('Không đủ xu!','✕','err');
    NG.G.decor[t.id] = true; NG.Garden.save();
    NG.notify('Đã mua ' + t.n + ' — ra vườn xem!','🏮','bd');
    NG.G3D.refresh(); NG.renderInv();
  },
  ivGoGarden: function(){ NG.go('garden'); },
  /* utilities */
  utilGrid: function(){ NG.Util.backToGrid(); NG.Util.load(); NG.unlock('explore'); },
  utilMenu: function(){ NG.Util.backToMenu(); },
  utilDet: function(el){ NG.Util.openDetail(el.dataset.id); },
  contrib: function(el){ NG.contribModal(el.dataset.id); },
  copyScript: function(el){
    var it = (NG.Util.scripts || [])[+el.dataset.i]; if(!it || !it.code) return;
    NG.copyText(it.code); NG.logAct('📋','Sao chép ' + (it.name || '')); NG.addXp(5, el);
    if(it._k && NG.FB_LIVE)
      NG.db.ref('nox_data/scripts/' + it._k + '/copies').transaction(function(n){ return (n||0)+1; }).catch(function(){});
  },
  openU: function(el){
    var it = (NG.Util[el.dataset.k] || [])[+el.dataset.i]; if(!it) return;
    var url = NG.safeUrl(it.url); if(!url) return NG.notify('Link không hợp lệ','✕','badurl');
    NG.SND.play('buy'); window.open(url, '_blank', 'noopener');
    NG.logAct('🔗','Mở ' + (it.name || el.dataset.k)); NG.addXp(3, el);
  },
  /* chat */
  like: function(el){
    if(!NG.state.user) return NG.openLoginModal();
    var key = el.dataset.id;
    if(NG.Chat.liked.has(key)) return NG.notify('Đã thả tim','♥','lk');
    NG.Chat.liked.add(key); el.classList.add('liked');
    var lc = el.querySelector('.lc'); if(lc) lc.textContent = (+lc.textContent||0) + 1;
    NG.db.ref('nox_chat/' + key + '/likes').transaction(function(n){ return (n||0)+1; }).catch(function(){});
    NG.addXp(1, el);
  },
  delMsg: function(el){ NG.db.ref('nox_chat/' + el.dataset.id).remove(); },
  scrollChat: function(){ NG.Chat.scrollBottom(true); NG.$('#newPill').classList.add('hidden'); },
  openProfile: function(el){ NG.openUserProfile(el.dataset.id, { name: el.dataset.name }); },
  pvFriend: function(el){ NG.addFriend(el.dataset.id, el.dataset.name, el.dataset.ava); },
  /* settings */
  sndToggle: function(){
    NG.SND.enabled = !NG.SND.enabled;
    NG.store.set('snd', NG.SND.enabled);
    NG.$('#swSound').classList.toggle('on', NG.SND.enabled);
    NG.notify(NG.SND.enabled ? 'Âm thanh BẬT' : 'Âm thanh TẮT','🔔','snd');
  },
  reduceToggle: function(){
    var r = !NG.store.get('reduce', NG.REDUCE);
    NG.store.set('reduce', r);
    NG.notify(r ? 'Bật giảm chuyển động (tải lại…)' : 'Tắt giảm chuyển động (tải lại…)','🍃','rd');
    setTimeout(function(){ location.reload(); }, 700);
  },
  ping: function(){ NG.pingDb(); NG.notify('Đang đo…','⚡','ping'); },
  /* dev */
  dev: function(){ NG.DevPanel.toggle(); },
  devClose: function(){ NG.DevPanel.close(); },
  devTab: function(el){ NG.DevPanel.tab = el.dataset.id; NG.DevPanel.render(); },
  devDk: function(el){ NG.DevPanel._dk = el.dataset.id; NG.DevPanel.render(); },
  devG: function(el){
    var r = NG.DevPanel._gActs && NG.DevPanel._gActs[+el.dataset.i];
    if(r) r[1]();
  },
  devAdd2: function(el){ NG.Util.addModal(el.dataset.id || 'scripts'); },
  devDel2: function(el){ NG.Util.del(el.dataset.id); },
  devMt: function(){ NG.DevPanel.open(); NG.DevPanel.tab = 'mt'; NG.DevPanel.render(); },
  devMtToggle: function(){
    var m = NG.DevPanel._mt || {}, nv = !(m && m.on);
    NG.db.ref('nox_maintenance/on').set(nv)
      .then(function(){ NG.notify(nv?'Đã BẬT bảo trì':'Đã TẮT bảo trì','🔧','mtt'); NG.DevPanel.render(); })
      .catch(function(){ NG.notify('Không ghi được — kiểm tra Rules','✕','mtt'); });
  },
  devMtSave: function(){
    var m = NG.DevPanel._mt || {}, h = parseInt(NG.$('#mtH2').value || '0', 10);
    var upd = { on: !!m.on, reason: NG.$('#mtR2').value.trim(), updatedAt: NG.serverNow() };
    if(h > 0) upd.end = NG.serverNow() + h*6e4; else upd.end = null;
    NG.db.ref('nox_maintenance').update(upd)
      .then(function(){ NG.notify('Đã lưu','🔧','mtc'); NG.DevPanel.render(); })
      .catch(function(){ NG.notify('Không ghi được','✕','mtc'); });
  }
};

/* một handler click duy nhất cho cả trang */
document.addEventListener('click', function(e){
  try{
    var ov = NG.$('#mOverlay');
    if(ov.classList.contains('show') && e.target === ov){ NG.closeModal(); return; }
    var t = e.target.closest('[data-goto]');
    if(t){ NG.go(t.dataset.goto); return; }
    var a = e.target.closest('[data-act]');
    if(a){ var f = NG.ACT[a.dataset.act]; if(f) f(a, e); return; }
  }catch(err){ console.error('[NOXG][click]', err); }
}, false);

/* overlay ẩn không chặn click */
['devPanel','mOverlay','pvFull','msgMenu'].forEach(function(id){
  var el = NG.$(id);
  if(el && !el.classList.contains('show')) el.style.pointerEvents = 'none';
});

/* keyboard */
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    NG.closeModal(); NG.DevPanel.close(); NG.closePV();
  }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); NG.go('garden'); }
  if(!e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input,textarea,select')){
    var km = {'1':'home','2':'garden','3':'market','4':'inv','5':'util','6':'chat','7':'profile','8':'settings'};
    if(km[e.key]) NG.go(km[e.key]);
  }
});

/* clock + autosave */
setInterval(function(){
  var c = NG.$('#clock');
  if(c) c.textContent = new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
}, 1000);
setInterval(function(){ if(NG.G) NG.Garden.save(); }, 15000);
document.addEventListener('visibilitychange', function(){
  if(document.hidden){ if(NG.G) NG.Garden.save(); }
  else { NG.G3D.resize(); if(NG.G) NG.Garden.catchUp(); }
});
addEventListener('beforeunload', function(){ if(NG.G) NG.Garden.save(true); });

/* ---- BOOT (duy nhất) ---- */
NG.safeBoot('scene', buildHomeScene);
NG.safeBoot('garden-load', function(){ NG.Garden.load(); });
NG.safeBoot('ui', function(){
  NG.loadMoney(); NG.renderMoney(); NG.renderActs(); NG.fillProfile();
  NG.updateDiag(); NG.syncDevUI(); NG.renderAchList();
  NG.renderGardenUI(); NG.renderMarket(); NG.renderInv();
});
NG.safeBoot('weather', function(){ NG.G3D.applyDayNight(); });
NG.safeBoot('fb', function(){ NG.pingDb(); watchMaintenance(); });
NG.safeBoot('session', function(){
  NG.restoreSession();
  if(NG.IS_LIVE && !NG.state.user){ NG.guestLogin(); NG.logAct('⚡','Tự động ACTIVE'); }
});
NG.safeBoot('dock', function(){
  var r = function(){ NG.$('#dock').classList.add('ready'); moveInd(NG.$('.dock-btn.active')); };
  if(document.readyState === 'complete') r(); else addEventListener('load', r);
  setTimeout(r, 400);
});
NG.safeBoot('3d', function(){
  if('requestIdleCallback' in window)
    requestIdleCallback(function(){ NG.G3D.init(); }, { timeout: 1800 });
  else setTimeout(function(){ NG.G3D.init(); }, 900);
});
NG.store.set('seen', Date.now());

/* loader tự đóng — độc lập với mọi lỗi */
(function(){
  var done = false;
  function fin(){
    if(done) return; done = true;
    try{
      var l = NG.$('#loader');
      if(l){ l.classList.add('done'); setTimeout(function(){ if(l.parentNode) l.parentNode.removeChild(l); }, 900); }
    }catch(e){}
  }
  setTimeout(fin, 5200);
  addEventListener('load', function(){ setTimeout(fin, 650); });
  if(window.__fin) window.__fin = fin;
})();

setInterval(function(){ NG.G3D.applyDayNight(); }, 60000);
console.log('[NOXG] NOXGARDEN sẵn sàng 🌱 · 3D:', typeof THREE !== 'undefined');
})();
</script>
</body>
</html>
