/* NOXGARDEN — GLOBAL CHAT + FRIENDS + PROFILE VIEWER */
(function(){
'use strict';
var NG = window.NG;

var Chat = NG.Chat = {
  inited:false, count:0, nearBottom:true, lastSend:0,
  els:new Map(), data:new Map(), liked:new Set(),
  enter: function(){
    if(!this.inited) this.init();
    this.inited = true;
    var b = this; requestAnimationFrame(function(){ b.scrollBottom(false); });
  },
  init: function(){
    if(this._bound) return; this._bound = true;
    var self = this;
    NG.$('#chatLogin').classList.toggle('hidden', !!NG.state.user);
    var body = NG.$('#gBody');
    body.innerHTML = '<div class="sysline">Đang kết nối phòng chat…</div>';
    if(!NG.FB_LIVE){
      body.innerHTML = '<div class="sysline">Chế độ LOCAL — chat cần kết nối máy chủ.</div>';
    } else {
      var q = NG.lref('nox_chat').limitToLast(70), initDone = false;
      q.on('child_added', function(snap){
        try{
          var m = snap.val(); if(!m) return;
          if(!initDone && self.count === 0) body.innerHTML = '';
          self.render(snap, body);
          if(!initDone){ self.count++; if(self.count === 1) requestAnimationFrame(function(){ self.scrollBottom(false); }); }
          else{
            var mine = NG.state.user && m.uid === NG.state.user.uid;
            if(!mine){
              if(NG.state.cur !== 'chat') NG.liveMsg('💬', 'Tin mới từ ' + (m.name || 'ai đó'), 2600);
              else if(!self.nearBottom) NG.$('#newPill').classList.remove('hidden');
            }
            self.count++;
          }
          NG.$('#gCount').textContent = self.count;
        }catch(e){ console.error(e); }
      });
      q.once('value', function(){
        if(self.count === 0) body.innerHTML = '<div class="sysline">Phòng chat trống — nhắn tin nào! 🌱</div>';
        self.scrollBottom(false);
      });
      q.on('child_removed', function(snap){
        try{
          var el = self.els.get(snap.key); if(el) el.remove();
          self.els.delete(snap.key); self.data.delete(snap.key);
          self.count = Math.max(0, self.count - 1);
          NG.$('#gCount').textContent = self.count;
        }catch(e){}
      });
    }
    body.addEventListener('scroll', function(){
      self.nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 90;
      if(self.nearBottom) NG.$('#newPill').classList.add('hidden');
    }, {passive:true});
    NG.$('#newPill').addEventListener('click', function(){
      self.scrollBottom(true); NG.$('#newPill').classList.add('hidden');
    });
    NG.$('#gForm').addEventListener('submit', function(e){
      e.preventDefault();
      var txt = NG.$('#gInput').value.trim(); if(!txt) return;
      NG.$('#gInput').value = '';
      self.send(txt);
      var s2 = NG.store.get('sends', 0) + 1;
      NG.store.set('sends', s2); if(s2 >= 5) NG.unlock('social5');
      NG.addXp(2);
    });
  },
  render: function(snap, body){
    var m = snap.val(), self = this; if(!m) return;
    this.data.set(snap.key, m);
    var mine = NG.state.user && m.uid === NG.state.user.uid;
    var el = document.createElement('div');
    if(m.type === 'system'){ el.className = 'sysline'; el.textContent = m.text || ''; }
    else{
      el.className = 'mrow' + (mine ? ' own' : '');
      var role = m.role || 'USER', rc = role === 'DEV' ? 'DEV' : role === 'NOX' ? 'NOX' : '';
      var liked = this.liked.has(snap.key);
      el.innerHTML =
        '<div class="m-ava" data-act="openProfile" data-id="'+NG.esc(m.uid||'')+'" data-name="'+NG.esc(m.name||'?')+'" role="button" tabindex="0">'+
        (m.ava ? '<img src="'+NG.esc(m.ava)+'" alt="" referrerpolicy="no-referrer">' : NG.esc((m.name||'?')[0].toUpperCase()))+'</div>'+
        '<div class="m-main"><div class="m-meta">'+
        '<b data-act="openProfile" data-id="'+NG.esc(m.uid||'')+'" data-name="'+NG.esc(m.name||'?')+'">'+NG.esc(m.name||'???')+'</b>'+
        (rc ? '<span class="rchip '+rc+'">'+rc+'</span>' : '')+
        '<span>'+(m.ts ? new Date(m.ts).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '')+'</span></div>'+
        '<div class="bubble">'+NG.esc(m.text||'')+'</div>'+
        '<div class="m-tools">'+
        '<button class="m-like'+(liked?' liked':'')+'" data-act="like" data-id="'+snap.key+'">♥ <span class="lc">'+(m.likes||0)+'</span></button>'+
        ((mine || NG.resolveRole()==='DEV') ? '<button class="m-del" data-act="delMsg" data-id="'+snap.key+'">XOÁ</button>' : '')+
        '</div></div>';
      var openProf = function(){
        if(m.uid && !mine) NG.openUserProfile(m.uid, { ava:m.ava, name:m.name, role:m.role });
      };
      var av = el.querySelector('.m-ava'); if(av) av.addEventListener('click', openProf);
      var nm = el.querySelector('.m-meta b'); if(nm) nm.addEventListener('click', openProf);
    }
    body.appendChild(el); this.els.set(snap.key, el);
    if(this.els.size > 100){
      var k = this.els.keys().next().value, old = this.els.get(k);
      if(old) old.remove(); this.els.delete(k);
    }
    if(this.nearBottom) this.scrollBottom(false);
  },
  scrollBottom: function(smooth){
    var b = NG.$('#gBody');
    b.scrollTo({ top:b.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    this.nearBottom = true;
  },
  send: function(text){
    if(!NG.state.user) return NG.openLoginModal();
    if(NG.isBanActive(NG.state.control)) return NG.notify('Tài khoản bị cấm','🚫','bn');
    if(NG.isMuted()) return NG.notify('Bạn đang bị mute','🔇','mu');
    var now = Date.now();
    if(now - this.lastSend < 1200) return NG.notify('Gửi quá nhanh','⚡','fast');
    this.lastSend = now;
    var u = NG.state.user;
    NG.db.ref('nox_chat').push({
      uid:u.uid, name:u.username||u.name, ava:u.avatar||'', role:NG.resolveRole(),
      text:String(text).slice(0,500), ts:NG.serverTS()
    }).then(function(){ NG.SND.play('buy'); })
      .catch(function(){ NG.notify('Không gửi được','✕','cs'); });
  }
};

/* ---- FRIENDS ---- */
var friends = NG.friends = [], friendsRef = null;
NG.bindFriends = function(){
  if(!NG.state.user || !NG.FB_LIVE || friendsRef) return;
  var key = NG.state.user.uid.replace(/[.#$/\[\]]/g,'_');
  friendsRef = NG.lref('nox_friends/' + key);
  friendsRef.on('value', function(s){
    try{ friends = Object.keys(s.val() || {}); }catch(e){}
  });
};
NG.unbindFriends = function(){
  if(friendsRef){ NG.unref(friendsRef); friendsRef = null; }
  friends = [];
};
NG.addFriend = function(uid, name, ava){
  if(!NG.state.user) return NG.openLoginModal();
  if(uid === NG.state.user.uid) return NG.notify('Không thể tự kết bạn','✕','fr');
  if(friends.indexOf(uid) >= 0) return NG.notify('Đã là bạn bè','🤝','frd');
  var myKey = NG.state.user.uid.replace(/[.#$/\[\]]/g,'_');
  var theirKey = uid.replace(/[.#$/\[\]]/g,'_');
  NG.db.ref('nox_friends/' + myKey + '/' + uid).set({ name:name||'?', ava:ava||'', ts:NG.serverNow() })
    .then(function(){
      return NG.db.ref('nox_friends/' + theirKey + '/' + NG.state.user.uid)
        .set({ name:NG.state.user.username||NG.state.user.name||'?', ava:NG.state.user.avatar||'', ts:NG.serverNow() });
    })
    .then(function(){
      NG.notify('Đã kết bạn với ' + name,'🤝','fr');
      NG.logAct('🤝','Kết bạn: ' + name);
    })
    .catch(function(){ NG.notify('Không kết bạn được','✕','fr'); });
};

/* ---- PROFILE VIEWER ---- */
NG.openUserProfile = function(uid, fb){
  fb = fb || {}; if(!uid) return;
  var pv = NG.$('#pvFull');
  pv.classList.add('show'); pv.style.pointerEvents = 'auto';
  NG.$('#pvBody').innerHTML = '<div class="pv-hero"><div class="pv-ava">…</div><b style="font:600 18px/1.3 var(--fd)">Đang tải…</b></div>';
  NG.db.ref('nox_users_registry/' + uid).once('value').then(function(s){
    NG.db.ref('nox_users_control/' + uid).once('value').then(function(cs){
      renderPV(uid, s && s.val ? s.val() : null, fb, (cs && cs.val ? cs.val() : null) || {});
    }).catch(function(){ renderPV(uid, s && s.val ? s.val() : null, fb, {}); });
  }).catch(function(){ renderPV(uid, null, fb, {}); });
};
function renderPV(uid, u, fb, c){
  var name = (u && (u.username || u.name)) || fb.name || 'Người dùng';
  var ava = (u && u.avatar) || fb.ava || '';
  var role = (u && (u.email||'').toLowerCase() === NG.DEV_EMAIL) ? 'DEV'
    : ((c && c.role) || (u && u.role) || fb.role || 'USER');
  var dev = role === 'DEV';
  var lv = dev ? NG.MAX_LV + 1 : Math.min(NG.MAX_LV, (u && u.level) || fb.level || 1);
  var xp = (u && u.xp) || 0;
  var coins = (u && typeof u.coins === 'number') ? u.coins : null;
  var created = (u && u.createdAt) || 0;
  var pct = lv > NG.MAX_LV ? 100 : Math.min(100, Math.round((xp - (lv-1)*250)/250*100));
  var isF = NG.state.user && NG.friends.indexOf(uid) >= 0;
  var isSelf = NG.state.user && uid === NG.state.user.uid;
  NG.$('#pvBody').innerHTML =
    '<div class="pv-hero lg"><div style="position:relative">'+
    '<div class="pv-ava">'+(ava ? '<img src="'+NG.esc(ava)+'" alt="">' : NG.esc((name[0]||'N').toUpperCase()))+'</div>'+
    (dev ? '<span class="dv-crown">👑</span>' : '')+'</div>'+
    '<div><b style="font:600 20px/1.2 var(--fd)">'+NG.esc(name)+'</b></div>'+
    '<div class="pv-chips"><span class="ui-chip mono'+(dev?' chip-dev':'')+'">'+(dev?'🛠 DEV':NG.esc(role))+'</span>'+
    '<span class="ui-chip mono">'+NG.esc(NG.lvlTitle(lv))+'</span>'+
    (c && c.banned ? '<span class="ui-chip" style="color:#ff9a8f">BANNED</span>' : '')+
    (isF ? '<span class="ui-chip" style="color:var(--acc)">🤝 Bạn bè</span>' : '')+'</div>'+
    '<span class="ui-chip mono">LEVEL '+lv+'</span>'+
    '<div class="xp-bar" style="width:240px"><i style="width:'+pct+'%"></i></div>'+
    (!isSelf && NG.state.user ?
      '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;justify-content:center">'+
      (isF ? '' : '<button class="btn primary" data-act="pvFriend" data-id="'+NG.esc(uid)+'" data-name="'+NG.esc(name)+'" data-ava="'+NG.esc(ava)+'">🤝 Kết bạn</button>')+
      '</div>' : '')+
    '</div>'+
    '<div class="pv-rows lg" style="border-radius:20px;padding:8px 18px;margin-top:14px">'+
    '<div class="pv-row">UID<b>'+NG.esc(uid.slice(0,20))+'</b></div>'+
    '<div class="pv-row">XP<b>'+xp+'</b></div>'+
    (coins != null ? '<div class="pv-row">Xu<b style="color:#f2c14e">'+NG.fmtN(coins)+'</b></div>' : '')+
    (created ? '<div class="pv-row">Tham gia<b>'+new Date(created).toLocaleDateString('vi-VN')+'</b></div>' : '')+
    '</div>';
}
NG.closePV = function(){
  var pv = NG.$('#pvFull');
  pv.classList.remove('show'); pv.style.pointerEvents = 'none';
};
})();
