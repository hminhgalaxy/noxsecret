/* NOXGARDEN — FIREBASE an toàn + presence (fallback LOCAL khi offline) */
(function(){
'use strict';
var NG = window.NG;

NG.FB_LIVE = false;
NG.db = null;
NG.lisN = 0;
var serverOffset = 0;

try{
  if(typeof firebase !== 'undefined' && firebase.initializeApp){
    firebase.initializeApp({
      apiKey: "AIzaSyDNGa1YNLJk1n5C_cxCqsGlx7_hP7DjetA",
      authDomain: "noxgalaxy-2cd71.firebaseapp.com",
      databaseURL: "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "noxgalaxy-2cd71",
      appId: "1:632801709671:web:d239eb4bc8e0f7acab4ec2"
    });
    NG.db = firebase.database();
    NG.FB_LIVE = true;
  }
}catch(e){ console.warn('[NOXG] Firebase init lỗi — chạy LOCAL:', e.message); }

/* Mock khi Firebase không có — mọi lệnh đều an toàn, không crash */
if(!NG.FB_LIVE){
  NG.db = { ref: function(){
    var node = function(){ return {
      on:function(){}, off:function(){},
      once:function(){ return Promise.resolve({ val:function(){ return null; }, exists:function(){ return false; } }); },
      set:function(){ return Promise.resolve(); },
      update:function(){ return Promise.resolve(); },
      remove:function(){ return Promise.resolve(); },
      transaction:function(f){ var v = null; try{ v = f(null); }catch(e){}
        return Promise.resolve({ snapshot:{ val:function(){ return v; }, exists:function(){ return !!v; } } }); },
      child:function(){ return node(); },
      push:function(){ return node(); },
      limitToLast:function(){ return node(); },
      onDisconnect:function(){ return { remove:function(){ return Promise.resolve(); }, set:function(){ return Promise.resolve(); } }; }
    }; };
    return node();
  } };
}

/* Helper timestamp — KHÔNG BAO GIỜ dùng firebase.* trực tiếp khi FB_LIVE=false */
NG.serverTS = function(){ return NG.FB_LIVE ? firebase.database.ServerValue.TIMESTAMP : Date.now(); };
NG.serverNow = function(){ return Date.now() + serverOffset; };

NG.lref = function(p){ NG.lisN++; NG.updLis(); return NG.db.ref(p); };
NG.unref = function(r){ if(!r) return; NG.lisN = Math.max(0, NG.lisN - 1); NG.updLis(); r.off(); };
NG.updLis = function(){ var a = NG.$('#dgListen'); if(a) a.textContent = NG.lisN; };

NG.setOnline = function(on){
  try{
    NG.state.fbOK = NG.FB_LIVE ? on : false;
    var lbl = !NG.FB_LIVE ? 'LOCAL' : (NG.state.fbOK ? (NG.IS_LIVE ? 'ACTIVE' : 'ONLINE') : 'OFFLINE');
    ['#netDot','#dgDot'].forEach(function(s){
      var el = NG.$(s); if(el) el.classList.toggle('on', NG.state.fbOK);
    });
    var dc = NG.$('#dgConn');
    if(dc) dc.textContent = NG.FB_LIVE ? (NG.state.fbOK ? 'Đã kết nối' : 'Mất kết nối') : 'Chế độ LOCAL (offline)';
    var sb = NG.$('#sysBadge'); if(sb) sb.classList.toggle('off', !NG.state.fbOK);
    var sbt = NG.$('#sysBadgeTx'); if(sbt) sbt.textContent = lbl;
    if(NG.state.fbOK && setOnline._f) sweepPresence();
    setOnline._f = 1;
  }catch(e){ console.error(e); }
};

if(NG.FB_LIVE){
  NG.db.ref('.info/connected').on('value', function(s){ NG.setOnline(!!s.val()); }); NG.lisN++; NG.updLis();
  NG.db.ref('.info/serverTimeOffset').on('value', function(s){ serverOffset = s.val() || 0; }); NG.lisN++; NG.updLis();
}
NG.setOnline(false);
addEventListener('offline', function(){ NG.setOnline(false); });

NG.pingDb = function(){
  if(!NG.FB_LIVE){ var p = NG.$('#dgPing'); if(p) p.textContent = 'LOCAL'; return; }
  var t0 = performance.now();
  NG.db.ref('.info/serverTimeOffset').once('value')
    .then(function(){ var p = NG.$('#dgPing'); if(p) p.textContent = Math.round(performance.now() - t0) + ' ms'; })
    .catch(function(){ var p = NG.$('#dgPing'); if(p) p.textContent = '—'; });
};

/* ---- PRESENCE (số người online) ---- */
var presCount = 0, presRef = null, hbTimer = null;
NG.db.ref('nox_presence').on('value', function(s){
  try{
    presCount = s.numChildren ? s.numChildren() : Object.keys(s.val() || {}).length;
    updatePresUI();
  }catch(e){}
}); NG.lisN++; NG.updLis();

function updatePresUI(){
  ['#presCount','#hStatO'].forEach(function(s){
    var el = NG.$(s); if(el) el.textContent = presCount;
  });
}
NG.updatePresUI = updatePresUI;

NG.goOnlinePresence = function(){
  if(!NG.state.user || !NG.FB_LIVE) return;
  var k = NG.state.user.uid.replace(/[.#$/\[\]]/g, '_');
  if(presRef) NG.unref(presRef);
  presRef = NG.lref('nox_presence/' + k);
  presRef.onDisconnect().remove();
  presRef.set({ name: (NG.state.user.username || NG.state.user.name || '?').slice(0, 20), ts: NG.serverNow() });
  clearInterval(hbTimer);
  hbTimer = setInterval(function(){ if(NG.state.fbOK && presRef) presRef.child('ts').set(NG.serverNow()); }, 180000);
};
NG.goOfflinePresence = function(){
  if(presRef){ try{ presRef.remove(); }catch(e){} NG.unref(presRef); presRef = null; }
  clearInterval(hbTimer);
};
function sweepPresence(){
  if(!NG.FB_LIVE) return;
  NG.db.ref('nox_presence').once('value').then(function(s){
    var v = s.val() || {};
    Object.keys(v).forEach(function(k){
      if(v[k] && v[k].ts && NG.serverNow() - v[k].ts > 6e5) NG.db.ref('nox_presence/' + k).remove();
    });
  }).catch(function(){});
}
})();
