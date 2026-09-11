/* NOXGARDEN — DEV PANEL (duy nhất trong toàn project) */
(function(){
'use strict';
var NG = window.NG;

var Dev = NG.DevPanel = {
  openNow:false, tab:'info', _gActs:null, _mt:null, _dk:'scripts', _fpsN:0, _fpsR:0, _fpsI:null,
  toggle: function(){ this.openNow ? this.close() : this.open(); },
  open: function(){
    if(NG.resolveRole() !== 'DEV') return NG.notify('Chỉ DEV','🔒','dv');
    this.openNow = true;
    var p = NG.$('#devPanel');
    p.classList.add('show'); p.style.pointerEvents = 'auto';
    this.render();
  },
  close: function(){
    this.openNow = false;
    var p = NG.$('#devPanel');
    p.classList.remove('show'); p.style.pointerEvents = 'none';
    this.stopFps();
  },
  render: function(){
    var self = this;
    NG.$('#dvpTabs').innerHTML =
      [['info','📊 Info'],['garden','🌱 Garden'],['data','🗂 Dữ liệu'],['mt','🔧 Bảo trì']]
      .map(function(x){ return '<button class="dtab'+(self.tab===x[0]?' on':'')+'" data-act="devTab" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('');
    var B = NG.$('#dvpBody'); B.innerHTML = '';
    var fns = { info:this.tInfo.bind(this), garden:this.tGarden.bind(this),
                data:this.tData.bind(this), mt:this.tMt.bind(this) };
    (fns[this.tab] || fns.info)(B);
  },
  tInfo: function(B){
    var seeds = 0, growing = 0;
    if(NG.G){
      Object.keys(NG.G.inv.seeds).forEach(function(k){ seeds += NG.G.inv.seeds[k]; });
      NG.G.plots.forEach(function(p){ if(p.st === 'grow') growing++; });
    }
    B.innerHTML = '<div class="pv-rows">'+
      '<div class="pv-row">View hiện tại<b>'+NG.esc(NG.state.cur)+'</b></div>'+
      '<div class="pv-row">Firebase<b>'+(NG.FB_LIVE ? (NG.state.fbOK ? 'LIVE · kết nối' : 'LIVE · mất kết nối') : 'LOCAL fallback')+'</b></div>'+
      '<div class="pv-row">Listeners<b>'+NG.lisN+'</b></div>'+
      '<div class="pv-row">Garden 3D<b>'+(NG.G3D.ok ? 'WebGL ✓' : '2D fallback')+'</b></div>'+
      '<div class="pv-row">Shadows<b>'+(NG.G3D.shadows ? 'ON' : 'OFF')+'</b></div>'+
      '<div class="pv-row">Cây đang lớn<b>'+growing+'</b></div>'+
      '<div class="pv-row">Hạt trong kho<b>'+seeds+'</b></div>'+
      '<div class="pv-row">Xu / Ngọc<b>'+NG.fmtN(NG.money.coins)+' / '+NG.money.gems+'</b></div>'+
      '<div class="pv-row">Garden XP<b>'+NG.fmtN(NG.G ? NG.G.xp : 0)+'</b></div>'+
      '<div class="pv-row">Role<b>'+NG.esc(NG.resolveRole())+'</b></div>'+
      '<div class="pv-row">FPS<b class="mono" id="dvFps">—</b></div></div>';
    this.startFps();
  },
  startFps: function(){
    var self = this; this.stopFps(); this._fpsN = 0;
    function cnt(){ self._fpsN++; self._fpsR = requestAnimationFrame(cnt); }
    this._fpsR = requestAnimationFrame(cnt);
    this._fpsI = setInterval(function(){
      var el = NG.$('#dvFps'); if(el) el.textContent = self._fpsN; self._fpsN = 0;
    }, 1000);
  },
  stopFps: function(){
    if(this._fpsR) cancelAnimationFrame(this._fpsR);
    clearInterval(this._fpsI);
  },
  tGarden: function(B){
    var self = this;
    var acts = [
      ['💰 +100 xu',      function(){ NG.addCoins(100); }],
      ['💎 +1000 xu',     function(){ NG.addCoins(1000); }],
      ['💎 +10 Ngọc',     function(){ NG.addGems(10); }],
      ['⭐ +500 Garden XP',function(){ NG.Garden.addGxp(500); }],
      ['⚡ Grow All',      function(){ NG.G.plots.forEach(function(p){ if(p.st==='grow'){ p.prog=1; p.st='ready'; } }); NG.G3D.refresh(); NG.renderGardenUI(); }],
      ['🧺 Harvest All',   function(){ NG.G.plots.forEach(function(p, i){ if(p.st==='ready') NG.plotHarvest(i); }); }],
      ['💧 Water All',     function(){ NG.waterAll(); }],
      ['🏡 Unlock 12 ô',   function(){ NG.G.plots.forEach(function(p){ if(p.st==='locked') p.st='empty'; }); NG.Garden.save(); NG.G3D.refresh(); NG.renderGardenUI(); }],
      ['🌱 Seed Pack ×3',  function(){ NG.PLANTS.slice(0,10).forEach(function(sp){ NG.G.inv.seeds[sp.id]=(NG.G.inv.seeds[sp.id]||0)+3; }); NG.Garden.save(); NG.notify('Đã thêm hạt ×3','🌱','sp'); }],
      ['🗑 Reset Garden',  function(){ NG.openModal('Reset Garden?','<p>Xoá toàn bộ dữ liệu vườn?</p>',
        [{label:'Huỷ',onClick:NG.closeModal},{label:'RESET',danger:true,onClick:function(){ NG.devRegen(); NG.closeModal(); }}]); }],
      ['🗑 Reset LOCAL',   function(){ NG.openModal('Reset toàn bộ LOCAL?','<p>Xoá garden + money + achievements trên máy này.</p>',
        [{label:'Huỷ',onClick:NG.closeModal},{label:'RESET',danger:true,onClick:function(){
          ['garden','money','ach','quest','daily','acts'].forEach(function(k){ NG.store.del(k); });
          location.reload(); }}]); }],
      ['🔁 Toggle 2D/3D',  function(){
        if(NG.G3D.ok){ NG.G3D.paused = true; NG.G3D.ok = false;
          NG.$('#g3d').style.display = 'none'; NG.$('#g2d').classList.add('on'); NG.G2D.render(); }
        else location.reload(); }]
    ];
    this._gActs = acts;
    B.innerHTML = '<div class="mk-grid">' + acts.map(function(r, i){
      return '<button class="mk-item" data-act="devG" data-i="'+i+'"><div class="mi-top">'+
        '<div class="mi-nm"><b>'+r[0]+'</b></div></div></button>';
    }).join('') + '</div>';
  },
  tData: function(B){
    var kinds = [['scripts','Script'],['apk','APK'],['links','Link'],['ios','iOS']];
    B.innerHTML = '<div class="mk-bar">' + kinds.map(function(k){
      return '<button class="dtab'+(this._dk===k[0]?' on':'')+'" data-act="devDk" data-id="'+k[0]+'">'+k[1]+' ('+((NG.Util[k[0]]||[]).length)+')</button>';
    }, this).join('') + '</div>' +
    '<button class="btn primary wide" data-act="devAdd2" data-id="'+this._dk+'" style="margin-bottom:12px">＋ Thêm mục mới</button><div id="dvList"></div>';
    var k = this._dk, list = NG.Util[k] || [], lv = NG.$('#dvList');
    if(!list.length){ lv.innerHTML = '<p class="empty-log">Chưa có mục nào.</p>'; return; }
    list.forEach(function(it){
      var row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '8px';
      row.innerHTML = '<span class="row-ic">🗂</span><span class="row-tx"><b class="wb">'+NG.esc(it.name||'(không tên)')+'</b>'+
        '<small class="wb">'+NG.esc(String(it.desc||it.url||it.code||'').slice(0,70))+'</small></span>'+
        '<span class="row-act"><button class="mini-btn dgr" data-act="devDel2" data-id="'+k+':'+NG.esc(it._k)+'">🗑</button></span>';
      lv.appendChild(row);
    });
  },
  tMt: function(B){
    NG.db.ref('nox_maintenance').once('value').then(function(s){
      var m = s.val() || {};
      B.innerHTML =
        '<div class="set-row"><span class="set-tx"><b>Trạng thái: '+(m.on?'🔴 BẬT':'🟢 TẮT')+'</b>'+
        '<small>'+(m.end ? 'Tự tắt: '+new Date(m.end).toLocaleString('vi-VN') : 'Không hẹn giờ')+'</small></span>'+
        '<button class="mini-btn '+(m.on?'dgr':'ok')+'" data-act="devMtToggle">'+(m.on?'TẮT':'BẬT')+'</button></div>'+
        '<label class="f-label" for="mtR2">Lý do</label><input class="f-input" id="mtR2" value="'+NG.esc(m.reason||'Nâng cấp hệ thống.')+'">'+
        '<label class="f-label" for="mtH2">Kết thúc sau (phút) — 0 = không hẹn giờ</label>'+
        '<input class="f-input mono" id="mtH2" type="number" min="0" value="0">'+
        '<button class="btn primary wide" data-act="devMtSave" style="margin-top:12px">Lưu cấu hình</button>';
      Dev._mt = m;
    }).catch(function(){ B.innerHTML = '<div class="statebox err">Không đọc được nox_maintenance.</div>'; });
  }
};
})();
