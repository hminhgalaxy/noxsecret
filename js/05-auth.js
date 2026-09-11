/* NOXGARDEN — AUTH: role, Google/Guest, session, ban/mute, activity, achievements */
(function(){
'use strict';
var NG = window.NG;

/* ---- ROLE / CONTROL ---- */
NG.resolveRole = function(){
  var u = NG.state.user; if(!u) return 'GUEST';
  if((u.email||'').toLowerCase() === NG.DEV_EMAIL) return 'DEV';
  if(NG.store.get('devUnlock', false)) return 'DEV';
  return (NG.state.control && NG.state.control.role) || u.role || 'GUEST';
};
NG.syncDevUI = function(){ document.documentElement.classList.toggle('dev', NG.resolveRole()==='DEV'); };

NG.isMuted = function(){
  var c = NG.state.control; if(!c || !c.muted) return false;
  if(c.mutedUntil === 0) return true;
  if(c.mutedUntil) return Date.now() < c.mutedUntil;
  return true;
};
NG.isBanActive = function(c){
  if(!c || !c.banned) return false;
  if(c.bannedUntil && NG.serverNow() > c.bannedUntil){
    if(NG.state.user && NG.FB_LIVE) NG.db.ref('nox_users_control/'+NG.state.user.uid+'/banned').remove().catch(function(){});
    return false;
  }
  return true;
};

/* ---- GOOGLE ---- */
function decodeJwt(t){
  try{
    var p = t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    while(p.length % 4) p += '=';
    return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(p), function(c){
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')));
  }catch(e){ return null; }
}
NG.decodeJwt = decodeJwt;

var GIS_ID = '766095728968-dbm8rs6f8lt2tm23j0etvb7bukqord8l.apps.googleusercontent.com';
var G_LOGO = '<svg viewBox="0 0 48 48" style="width:26px;height:26px"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.5l6.3 5.3C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>';
NG.G_LOGO = G_LOGO;

var gisReady = false, gTries = 0;
function initGoogle(){
  if(gisReady || !window.google || !window.google.accounts) return;
  try{
    google.accounts.id.initialize({
      client_id: GIS_ID,
      callback: function(r){
        var p = decodeJwt(r.credential);
        if(!p || !p.sub) return NG.notify('Google login thất bại','✕','gerr');
        loginGoogleFlow({ sub:p.sub, name:p.name||'Gardener', email:p.email||'', picture:p.picture||'' });
      },
      error_callback: function(e){ console.warn('[GIS]', e); },
      use_fedcm_for_prompt: true, auto_select: false, cancel_on_tap_outside: true
    });
    gisReady = true;
  }catch(e){ console.error('[GIS init]', e); }
}
NG.tryGooglePrompt = function(){
  if(!gisReady){
    initGoogle();
    if(!gisReady){
      if(++gTries > 5) return NG.notify('Google không tải được — dùng Guest nhé','⚠','gt');
      setTimeout(NG.tryGooglePrompt, 1000); return;
    }
  }
  try{ google.accounts.id.prompt(); }
  catch(e){ NG.notify('Google không khả dụng — dùng Guest','⚠','gp'); }
};

function loginGoogleFlow(g){
  var uid = 'g_' + g.sub, isDev = (g.email||'').toLowerCase() === NG.DEV_EMAIL;
  NG.db.ref('nox_users_registry/' + uid).transaction(function(cur){
    var now = Date.now();
    if(cur === null) return { uid:uid, name:g.name, username:g.name, email:g.email, avatar:g.picture||'',
      role: isDev?'DEV':'USER', level:1, xp:0, coins:60, gems:3, createdAt:now, lastLogin:now };
    cur.lastLogin = now;
    cur.level  = cur.level == null ? 1  : cur.level;
    cur.xp     = cur.xp    == null ? 0  : cur.xp;
    cur.coins  = cur.coins == null ? 60 : cur.coins;
    cur.gems   = cur.gems  == null ? 3  : cur.gems;
    cur.role   = cur.role  || 'USER';
    cur.name   = cur.name   || g.name;
    cur.username = cur.username || g.name;
    cur.avatar = cur.avatar == null ? (g.picture||'') : cur.avatar;
    cur.email  = cur.email  || g.email || '';
    if(isDev) cur.role = 'DEV';
    return cur;
  }).then(function(res){
    var prof = res && res.snapshot && res.snapshot.val();
    if(!prof) throw new Error('empty');
    NG.db.ref('nox_users_control/' + uid).once('value')
      .then(function(cs){ finishLogin(prof, 'google', cs.val()); })
      .catch(function(){ finishLogin(prof, 'google', null); });
  }).catch(function(){ NG.notify('Mất kết nối máy chủ — thử Guest','⚠','fbr'); });
}

NG.guestLogin = function(){
  var g = NG.store.get('guest', null);
  if(!g || !g.name || !g.uid){
    var n = 1000 + Math.floor(Math.random()*9000);
    g = { uid:'guest_'+n, name:'Guest_'+n, createdAt: Date.now() };
    NG.store.set('guest', g);
  }
  finishLogin({ uid:g.uid, name:g.name, username:g.name, avatar:'', email:'', role:'GUEST',
    level: NG.store.get('gl', 1), xp: NG.store.get('gx', 0), createdAt: g.createdAt }, 'guest', null);
};

var controlRef = null;
function watchControl(uid){
  if(!NG.FB_LIVE) return;
  if(controlRef) NG.unref(controlRef);
  controlRef = NG.lref('nox_users_control/' + uid);
  controlRef.on('value', function(s){
    try{ NG.state.control = s.val(); applyControl(); }catch(e){ console.error(e); }
  });
}
function applyControl(){
  var c = NG.state.control, u = NG.state.user; if(!u) return;
  var banned = NG.isBanActive(c);
  document.body.classList.toggle('locked', banned || NG.$('#mOverlay').classList.contains('show'));
  NG.$('#banOverlay').classList.toggle('hidden', !banned);
  if(banned){
    var t = (c && c.reason) || 'Bị cấm.';
    if(c.bannedUntil) t += '\nHết cấm: ' + new Date(c.bannedUntil).toLocaleString('vi-VN');
    NG.$('#banReason').textContent = t;
  }
  var m = NG.isMuted();
  NG.$('#muteNote').classList.toggle('hidden', !m);
  var gi = NG.$('#gInput'); if(gi) gi.disabled = m || banned;
  if(m){
    var t2 = 'Bạn bị mute';
    if(c.mutedUntil === 0) t2 += ' (vĩnh viễn)';
    else if(c.mutedUntil) t2 += ' đến ' + new Date(c.mutedUntil).toLocaleTimeString('vi-VN');
    NG.$('#muteText').textContent = t2;
  }
  if(NG.fillProfile) NG.fillProfile();
  if(NG.updateDiag) NG.updateDiag();
}

function finishLogin(p, provider, control){
  try{
    NG.state.user = Object.assign({}, p, { provider: provider });
    NG.state.control = control || null;
    NG.store.set('session', { type: provider, uid: p.uid });
    if(provider === 'google') NG.store.set('cache-' + p.uid, p);
    watchControl(p.uid);
    NG.goOnlinePresence();
    NG.$('#chatLogin').classList.add('hidden');
    NG.$('#gChatSub').textContent = (p.username || p.name) + ' · ' + NG.resolveRole();
    NG.loadMoney(); NG.renderMoney();
    if(NG.Garden) NG.Garden.load();
    if(NG.fillProfile) NG.fillProfile();
    if(NG.updateDiag) NG.updateDiag();
    NG.syncDevUI();
    if(NG.bindFriends) NG.bindFriends();
    NG.renderAchList(); NG.logAct('👤','Đăng nhập: ' + (p.username || p.name));
    NG.liveMsg('✅','Chào mừng, ' + (p.username || p.name) + '!');
    NG.notify('Chào mừng, ' + p.name + '!','🌟','login');
    if(NG.G3D) NG.G3D.refresh();
  }catch(e){ console.error('[NOXG][login]', e); }
}
NG.setLoggedOut = function(silent){
  try{ if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); }catch(e){}
  NG.goOfflinePresence();
  if(controlRef){ NG.unref(controlRef); controlRef = null; }
  if(NG.unbindFriends) NG.unbindFriends();
  NG.state.user = null; NG.state.control = null;
  NG.store.del('session');
  NG.$('#banOverlay').classList.add('hidden');
  NG.$('#muteNote').classList.add('hidden');
  var gi = NG.$('#gInput'); if(gi) gi.disabled = false;
  NG.$('#chatLogin').classList.remove('hidden');
  NG.$('#gChatSub').textContent = 'Thời gian thực';
  NG.loadMoney(); NG.renderMoney();
  if(NG.fillProfile) NG.fillProfile();
  if(NG.updateDiag) NG.updateDiag();
  NG.syncDevUI(); NG.renderAchList();
  if(!silent){ NG.notify('Đã đăng xuất','👋','out'); NG.liveMsg('👋','Hẹn gặp lại!'); }
};
NG.restoreSession = function(){
  var s = NG.store.get('session', null); if(!s) return;
  if(s.type === 'guest') return NG.guestLogin();
  if(s.type === 'google' && s.uid){
    NG.db.ref('nox_users_registry/' + s.uid).once('value').then(function(x){
      if(x && x.exists && x.exists()) return finishLogin(x.val(), 'google', null);
      var c = NG.store.get('cache-' + s.uid, null);
      if(c){ finishLogin(c, 'google', null); NG.notify('Khôi phục offline','📶','cache'); }
      else NG.setLoggedOut(true);
    }).catch(function(){
      var c = NG.store.get('cache-' + s.uid, null);
      if(c) finishLogin(c, 'google', null); else NG.setLoggedOut(true);
    });
  }
};
NG.openLoginModal = function(){
  NG.openModal('Tham gia NOXGARDEN',
    '<div style="display:flex;flex-direction:column;align-items:center;padding:8px 0 2px">'+
    '<button id="gLogoBtn" style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:0 4px 14px -6px rgba(0,0,0,.6)">'+G_LOGO+'</button>'+
    '<span style="font:600 11px/1 var(--fm);color:var(--ink3);margin-top:8px">ĐĂNG NHẬP VỚI GOOGLE</span></div>'+
    '<div class="divider">HOẶC</div>'+
    '<button class="btn wide" data-act="guest">🍃 Vào vai khách (Guest)</button>', []);
  var b = document.getElementById('gLogoBtn');
  if(b) b.addEventListener('click', NG.tryGooglePrompt);
};

/* ---- ACTIVITY LOG ---- */
var acts = NG.store.get('acts', []);
NG.logAct = function(icon, text){
  acts.unshift({ i:icon, t:text, ts:Date.now() });
  acts = acts.slice(0, 8);
  NG.store.set('acts', acts);
  NG.renderActs();
};
NG.renderActs = function(){
  var l = NG.$('#actList'); if(!l) return;
  if(!acts.length){ l.innerHTML = '<p class="empty-log">Chưa có hoạt động.</p>'; return; }
  l.innerHTML = acts.map(function(a){
    return '<div class="row" style="cursor:default"><span class="row-ic">'+(a.i.length<=3?NG.esc(a.i):NG.ic(a.i,17))+'</span>'+
      '<span class="row-tx"><b>'+NG.esc(a.t)+'</b></span><span class="ui-chip mono">'+NG.timeAgo(a.ts)+'</span></div>';
  }).join('');
};

/* ---- ACHIEVEMENTS ---- */
NG.ACH = [
  { id:'first_plant',  n:'Hạt đầu tiên',    d:'Trồng cây đầu tiên',        ic:'🌱' },
  { id:'first_harvest',n:'Mùa đầu tiên',    d:'Thu hoạch đầu tiên',        ic:'🧺' },
  { id:'rich',         n:'Tỷ phú vườn',     d:'Kiếm 10.000 xu',            ic:'💰' },
  { id:'builder',      n:'Garden Builder',  d:'Mở hết 12 ô đất',           ic:'🏡' },
  { id:'collector',    n:'Nhà sưu tầm',     d:'Sở hữu 8 loại hạt',         ic:'📦' },
  { id:'special',      n:'Sự kỳ diệu',      d:'Trồng cây Đặc biệt',        ic:'✨' },
  { id:'gardener20',   n:'Master Gardener', d:'Thu hoạch 20 lần',          ic:'🏆' },
  { id:'social5',      n:'Người kể chuyện', d:'Gửi 5 tin nhắn',            ic:'💬' },
  { id:'explore',      n:'Nhà thám hiểm',   d:'Mở Tiện ích',               ic:'🧭' },
  { id:'creator',      n:'Người đóng góp',  d:'Đóng góp tiện ích',         ic:'🎁' }
];
var unlocked = NG.store.get('ach', []);
NG.unlock = function(id){
  if(unlocked.indexOf(id) >= 0) return;
  var a = null;
  for(var i = 0; i < NG.ACH.length; i++) if(NG.ACH[i].id === id) a = NG.ACH[i];
  if(!a) return;
  unlocked.push(id); NG.store.set('ach', unlocked);
  NG.notify('🏆 Thành tựu: ' + a.n, '🏆', 'ach' + id);
  NG.liveMsg('🏆', 'Achievement: ' + a.n, 3000);
  NG.SND.chime(); NG.renderAchList();
};
NG.renderAchList = function(){
  var box = NG.$('#achList'); if(!box) return;
  box.innerHTML = NG.ACH.map(function(a){
    var on = unlocked.indexOf(a.id) >= 0;
    return '<div class="ach '+(on?'on':'')+'"><span class="ach-ic">'+(on ? a.ic : '🔒')+'</span>'+
      '<span class="ach-tx"><b>'+NG.esc(a.n)+'</b><small>'+NG.esc(a.d)+'</small></span>'+
      '<span class="ach-st">'+(on?'ĐÃ MỞ':'CHƯA ĐẠT')+'</span></div>';
  }).join('');
};
})();
