/* NOXGARDEN — GARDEN gameplay: trồng/tưới/phân/tỉa/thu hoạch/chuyển/đổi tên/nhổ */
(function(){
'use strict';
var NG = window.NG;
var PLOT_COST = [0,0,0,0,150,300,500,800,1200,1800,2600,3600];
NG.STAGE_NAMES = ['Hạt','Mầm','Non','Lớn','Trồi nụ','Sẵn sàng!'];

function freshG(){
  return { xp:0,
    plots: Array.apply(null, Array(NG.NPLOTS)).map(function(_, i){ return { st: i < 4 ? 'empty' : 'locked' }; }),
    inv: { seeds:{ oak:2, daisy:2 }, fert:0 },
    tools:{}, decor:{},
    stats:{ planted:0, harvested:0, earned:0, waters:0 },
    upd: Date.now() };
}
NG.G = null;

var Garden = NG.Garden = {
  absorb: function(cv){
    var f = freshG();
    G = NG.G = f;
    G.xp = +cv.xp || 0;
    G.inv = (cv.inv && typeof cv.inv === 'object') ? cv.inv : f.inv;
    G.inv.seeds = G.inv.seeds || {}; G.inv.fert = G.inv.fert || 0;
    G.tools = (cv.tools && typeof cv.tools === 'object') ? cv.tools : {};
    G.decor = (cv.decor && typeof cv.decor === 'object') ? cv.decor : {};
    G.stats = Object.assign(f.stats, cv.stats || {});
    G.plots = Array.isArray(cv.plots) ? cv.plots.slice(0, NG.NPLOTS) : f.plots;
    while(G.plots.length < NG.NPLOTS) G.plots.push({ st:'empty' });
    G.plots = G.plots.map(function(p){ return (p && typeof p === 'object') ? p : { st:'empty' }; });
    this.catchUp(); this.save(true);
  },
  load: function(){
    var l = NG.store.get('garden', null);
    G = NG.G = freshG();
    if(l && typeof l === 'object'){
      G.xp = +l.xp || 0;
      G.inv = (l.inv && typeof l.inv === 'object') ? l.inv : G.inv;
      G.inv.seeds = G.inv.seeds || {}; G.inv.fert = G.inv.fert || 0;
      G.tools = l.tools || {}; G.decor = l.decor || {};
      G.stats = Object.assign(G.stats, l.stats || {});
      if(Array.isArray(l.plots)){
        G.plots = l.plots.slice(0, NG.NPLOTS);
        while(G.plots.length < NG.NPLOTS) G.plots.push({ st:'empty' });
        G.plots = G.plots.map(function(p){ return (p && typeof p === 'object') ? p : { st:'empty' }; });
      }
    }
    if(NG.state.user && NG.state.user.provider === 'google' && NG.FB_LIVE){
      NG.db.ref('nox_gardens/' + NG.state.user.uid).once('value').then(function(s){
        var cv = s && s.val ? s.val() : null;
        if(cv && (!l || (cv.upd || 0) >= (l.upd || 0))){
          Garden.absorb(cv);
          NG.notify('Đã tải khu vườn từ mây','☁','gcl');
        } else Garden.save(true);
        NG.renderGardenUI(); if(NG.G3D) NG.G3D.refresh();
      }).catch(function(){ Garden.save(true); });
    } else Garden.save();
    this.catchUp();
  },
  save: function(im){
    if(!G) return;
    G.upd = Date.now();
    NG.store.set('garden', G);
    if(NG.state.user && NG.state.user.provider === 'google' && NG.FB_LIVE){
      if(im) NG.db.ref('nox_gardens/' + NG.state.user.uid).set(G).catch(function(){});
      else { clearTimeout(this._t); this._t = setTimeout(function(){
        NG.db.ref('nox_gardens/' + NG.state.user.uid).set(G).catch(function(){});
      }, 1500); }
    }
  },
  catchUp: function(){
    var ls = NG.store.get('seen', 0);
    NG.store.set('seen', Date.now());
    if(!ls || !G) return;
    var el = Math.min(7200, (Date.now() - ls) / 1000);
    if(el < 60) return;
    var grew = 0;
    G.plots.forEach(function(p){
      if(p.st !== 'grow') return;
      var sp = NG.plantById(p.seed); if(!sp) return;
      if((p.water || 0) > 0){
        p.prog = Math.min(1, (p.prog || 0) + el / sp.t);
        if(p.prog >= 1){ p.st = 'ready'; grew++; }
      }
    });
    if(grew){ NG.notify('Trong lúc vắng mặt: ' + grew + ' cây đã lớn!','🌿','cu'); NG.liveMsg('🌿', grew + ' cây chờ thu hoạch!', 3200); }
  },
  xpNeed: function(l){ return 120 + (l - 1) * 80; },
  gLevel: function(){
    var l = 1, x = G ? G.xp : 0;
    while(x >= this.xpNeed(l) && l < 99){ x -= this.xpNeed(l); l++; }
    return { lv:l, cur:x, need:this.xpNeed(l) };
  },
  addGxp: function(n, srcEl){
    if(!G || !n) return;
    if(srcEl) NG.fpop(srcEl, '+' + n + ' XP', '#8fd99a');
    G.xp += n;
    var was = this.gLevel().lv, now = this.gLevel();
    if(now.lv > was){
      NG.notify('✨ GARDEN LEVEL UP! Lv.' + now.lv, '🏆', 'glv' + now.lv);
      NG.liveMsg('🎉', 'Garden Level Up! Lv.' + now.lv, 3200);
      NG.SND.chime(); NG.confetti(); NG.logAct('🏆','Garden Lv.' + now.lv);
      NG.burstEl(NG.$('#g3dWrap'), 14);
    }
    this.setGxUI(); this.save();
  },
  setGxUI: function(){
    if(!G) return;
    var g = this.gLevel();
    ['#gxLevel','#gxLevel2'].forEach(function(s){ var el = NG.$(s); if(el) el.textContent = 'Garden Lv.' + g.lv; });
    var t1 = NG.$('#gxText'); if(t1) t1.textContent = NG.fmtN(g.cur) + ' / ' + NG.fmtN(g.need) + ' XP';
    var t2 = NG.$('#gxText2'); if(t2) t2.textContent = NG.fmtN(G.xp) + ' XP tổng';
    ['#gxFill','#gxFill2'].forEach(function(s){ var el = NG.$(s); if(el) el.style.width = Math.min(100, Math.round(g.cur/g.need*100)) + '%'; });
    var lg = NG.$('#lbGlv'); if(lg) lg.textContent = 'Lv ' + g.lv;
    var hg = NG.$('#hStatG'); if(hg) hg.textContent = 'Lv ' + g.lv;
    var sg = NG.$('#statGlv'); if(sg) sg.textContent = 'Lv ' + g.lv;
  }
};
function G(){ return NG.G; }

function stageOf(p){
  var pr = p.prog || 0;
  return pr >= 1 ? 5 : pr >= .8 ? 4 : pr >= .55 ? 3 : pr >= .3 ? 2 : pr >= .1 ? 1 : 0;
}
NG.stageOf = stageOf;

/* ---- UI ---- */
NG.renderGardenUI = function(){
  if(!G) return;
  Garden.setGxUI();
  var n = 0; G.plots.forEach(function(p){ if(p.st === 'grow') n++; });
  var hp = NG.$('#hStatP'); if(hp) hp.textContent = n;
  var sp = NG.$('#statPlanted'); if(sp) sp.textContent = NG.fmtN(G.stats.planted);
  var sh = NG.$('#statHarv'); if(sh) sh.textContent = NG.fmtN(G.stats.harvested);
  renderDaily(); renderQuests();
  if(NG.G2D) NG.G2D.render();
};

/* ---- DAILY ---- */
function renderDaily(){
  var c = NG.$('#dailyCard'); if(!c) return;
  var d = NG.store.get('daily', { d:'', s:0 }), today = new Date().toDateString();
  var rew = 30 + Math.min(d.s || 0, 7) * 10;
  c.innerHTML = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="font-size:30px">🎁</span>'+
    '<div style="flex:1;min-width:130px"><b style="display:block;font-size:14px">Quà hằng ngày</b>'+
    '<small style="color:var(--ink3)">Streak '+(d.s||0)+' ngày · +'+rew+' xu +1 💎</small></div>'+
    (d.d !== today ? '<button class="mini-btn gold" data-act="claimDaily">Nhận quà</button>' : '<span class="ui-chip">✓ Đã nhận</span>')+'</div>';
}
NG.claimDaily = function(el){
  var d = NG.store.get('daily', { d:'', s:0 }), today = new Date().toDateString();
  if(d.d === today) return NG.notify('Hôm nay đã nhận rồi','🎁','dcl');
  var yd = new Date(Date.now() - 864e5).toDateString();
  d.s = (d.d === yd) ? (d.s || 0) + 1 : 1; d.d = today;
  NG.store.set('daily', d);
  var rew = 30 + Math.min(d.s - 1, 7) * 10;
  NG.addCoins(rew); NG.addGems(1); Garden.addGxp(15, el);
  NG.fpop(el, '+' + rew + ' xu +1💎', '#f2c14e');
  NG.notify('Quà ngày ' + d.s + ': +' + rew + ' xu +1 💎','🎁','dc');
  NG.logAct('🎁','Quà hằng ngày'); renderDaily(); NG.burstEl(el, 10);
};

/* ---- QUESTS ---- */
var QPOOL = [
  { id:'plant',   n:'Trồng 3 cây',      t:3,   stat:'planted',   c:40,  xp:30 },
  { id:'water',   n:'Tưới 5 lần',       t:5,   stat:'waters',    c:30,  xp:25 },
  { id:'harvest', n:'Thu hoạch 4 cây',  t:4,   stat:'harvested', c:60,  xp:50 },
  { id:'earn',    n:'Bán 200 xu',       t:200, stat:'earned',    c:80,  xp:60 }
];
function renderQuests(){
  var q = NG.store.get('quest', null), today = new Date().toDateString();
  if(!q || q.date !== today){
    var pool = QPOOL.slice().sort(function(){ return Math.random() - .5; }).slice(0, 3);
    q = { date: today, list: pool.map(function(d){ return { id:d.id, prog:0, claimed:false }; }) };
    NG.store.set('quest', q);
    NG.notify('Nhiệm vụ mới hôm nay!','📜','qd');
  }
  var qd = NG.$('#qDate'); if(qd) qd.textContent = new Date().toLocaleDateString('vi-VN');
  var box = NG.$('#qList'); if(!box) return;
  box.innerHTML = q.list.map(function(Qu, i){
    var d = null;
    QPOOL.forEach(function(x){ if(x.id === Qu.id) d = x; });
    if(!d) return '';
    var done = (Qu.prog || 0) >= d.t, cl = Qu.claimed;
    return '<div class="row" style="margin-bottom:6px"><span class="row-ic">'+(cl ? '✅' : done ? '🏆' : '📜')+'</span>'+
      '<div class="row-tx"><b>'+NG.esc(d.n)+(cl ? ' · Đã nhận' : '')+'</b>'+
      '<div class="gxp-bar" style="margin-top:6px"><i style="width:'+Math.min(100,(Qu.prog||0)/d.t*100)+'%"></i></div></div>'+
      (cl ? '<span class="ui-chip">✓</span>' : done ? '<button class="mini-btn gold" data-act="claimQ" data-i="'+i+'">Nhận +'+d.c+'</button>' : '<span class="ui-chip">'+(Qu.prog||0)+'/'+d.t+'</span>')+'</div>';
  }).join('');
}
function questProg(stat, n){
  n = n || 1;
  var q = NG.store.get('quest', null); if(!q) return;
  q.list.forEach(function(Qu){
    var d = null; QPOOL.forEach(function(x){ if(x.id === Qu.id) d = x; });
    if(d && d.stat === stat && !Qu.claimed) Qu.prog = Math.min(d.t, (Qu.prog || 0) + n);
  });
  NG.store.set('quest', q); renderQuests();
}
NG.claimQ = function(el){
  var q = NG.store.get('quest', null); if(!q) return;
  var Qu = q.list[+el.dataset.i]; if(!Qu || Qu.claimed) return;
  var d = null; QPOOL.forEach(function(x){ if(x.id === Qu.id) d = x; });
  if(!d || (Qu.prog || 0) < d.t) return;
  Qu.claimed = true; NG.store.set('quest', q);
  NG.addCoins(d.c); Garden.addGxp(d.xp, el);
  NG.notify('Nhiệm vụ xong: +'+d.c+' xu, +'+d.xp+' XP','🏆','qc' + Qu.id);
  NG.logAct('🏆','Nhiệm vụ: ' + d.n); renderQuests();
};

/* ---- ACTIONS ---- */
function plotClick(i, srcEl){
  if(!G) return;
  var p = G.plots[i]; if(!p) return;
  if(NG.state.moveFrom >= 0){
    if(p.st !== 'empty' || i === NG.state.moveFrom){
      NG.state.moveFrom = -1; NG.notify('Chọn ô ĐẤT TRỐNG để chuyển','⚠','mv'); return;
    }
    var from = G.plots[NG.state.moveFrom];
    G.plots[NG.state.moveFrom] = p; G.plots[i] = from;
    NG.state.moveFrom = -1;
    NG.notify('Đã chuyển cây!','✅','mvok');
    Garden.save(); if(NG.G3D) NG.G3D.refresh(); NG.closeModal(); NG.renderGardenUI();
    return;
  }
  if(p.st === 'locked'){
    var cost = PLOT_COST[i] || 0;
    NG.openModal('Mở rộng khu vườn',
      '<p>Mở ô đất thứ <b>'+(i+1)+'</b> với giá <b style="color:#f2c14e">'+NG.fmtN(cost)+' xu</b>?</p>',
      [{ label:'Huỷ', onClick: NG.closeModal },
       { label:'Mở đất', primary:true, onClick: function(){
          if(!NG.spend(cost, 0)) return NG.notify('Không đủ xu!','✕','pc');
          p.st = 'empty'; NG.closeModal();
          NG.notify('Đã mở ô đất mới! 🎉','🌱','po' + i);
          NG.logAct('🌱','Mở ô đất ' + (i+1));
          NG.unlock('builder'); Garden.save();
          if(NG.G3D) NG.G3D.refresh();
          NG.renderGardenUI(); NG.burstEl(srcEl || NG.$('#g3dWrap'), 12);
       }}]);
    return;
  }
  if(p.st === 'empty'){ NG.state.pickPlot = i; openSeedPicker(); return; }
  openInspector(i, srcEl);
}
NG.plotClick = plotClick;

function openSeedPicker(){
  var i = NG.state.pickPlot, seeds = [];
  Object.keys(G.inv.seeds).forEach(function(id){ if(G.inv.seeds[id] > 0) seeds.push(id); });
  if(!seeds.length){
    NG.openModal('Chọn hạt giống',
      '<div class="statebox">🪴<span>Kho trống hạt giống!</span><small>Mua hạt ở Market.</small></div>',
      [{ label:'Mở Market', primary:true, onClick:function(){ NG.closeModal(); NG.go('market'); } },
       { label:'Đóng', onClick: NG.closeModal }]);
    return;
  }
  NG.openModal('Chọn hạt giống · Ô ' + (i+1),
    seeds.map(function(id){
      var sp = NG.plantById(id); if(!sp) return '';
      return '<button class="mk-item" data-act="plant" data-id="'+id+'" style="width:100%;margin-bottom:8px">'+
        '<div class="mi-top"><span class="mi-ic">'+NG.plantIcon(sp, 2)+'</span>'+
        '<div class="mi-nm"><b>'+NG.esc(sp.n)+' × '+G.inv.seeds[id]+'</b>'+
        '<small><span class="rar '+sp.rar+'">'+sp.rar.toUpperCase()+'</span><span>⏱ '+Math.round(sp.t/60)+'p</span><span>Bán '+NG.fmtN(sp.s)+'</span></small></div></div></button>';
    }).join(''),
    [{ label:'Đóng', onClick: NG.closeModal }]);
  if(NG.injectIcons) NG.injectIcons();
}
NG.plantSeed = function(id){
  var i = NG.state.pickPlot, sp = NG.plantById(id);
  if(i < 0 || !sp || !G) return;
  if((G.inv.seeds[id] || 0) <= 0) return NG.notify('Hết hạt này rồi','✕','pl');
  G.inv.seeds[id]--; if(G.inv.seeds[id] <= 0) delete G.inv.seeds[id];
  var p = G.plots[i];
  p.st = 'grow'; p.seed = id; p.name = ''; p.plantedAt = Date.now();
  p.prog = 0; p.water = 100; p.health = 100; p.fert = 0;
  G.stats.planted++; questProg('planted'); Garden.addGxp(3);
  NG.unlock('first_plant');
  if(sp.cat === 'special') NG.unlock('special');
  var kinds = Object.keys(G.inv.seeds).length;
  if(kinds >= 8) NG.unlock('collector');
  NG.closeModal(); NG.notify('Đã trồng ' + sp.n + '!','🌱','pl' + i);
  NG.SND.play('buy'); NG.logAct('🌱','Trồng ' + sp.n);
  Garden.save(); if(NG.G3D) NG.G3D.refresh();
  NG.renderGardenUI(); if(NG.renderInv) NG.renderInv();
};

function openInspector(i, srcEl){
  var p = G.plots[i];
  if(!p || (p.st !== 'grow' && p.st !== 'ready')) return;
  var sp = NG.plantById(p.seed); if(!sp) return;
  var st = stageOf(p), ready = p.st === 'ready' || st === 5;
  var val = Math.round(sp.s * (0.6 + 0.4*st) * (1 + (p.health || 100)/400));
  var nm = NG.esc(p.name || sp.n);
  var acts = [];
  if(ready) acts.push({ label:'🧺 Thu hoạch', primary:true, onClick:function(){ harvest(i, srcEl); } });
  acts.push({ label:'💧 Tưới', onClick:function(){ waterPlot(i, false); NG.closeModal(); } });
  if((G.inv.fert || 0) > 0 && !ready) acts.push({ label:'🧪 Bón phân', onClick:function(){ fertPlot(i); NG.closeModal(); } });
  if(G.tools.shears && !ready) acts.push({ label:'✂️ Cắt tỉa', onClick:function(){ prunePlot(i); NG.closeModal(); } });
  acts.push({ label:'✏️ Đổi tên', onClick:function(){ renamePlot(i); } });
  acts.push({ label:'🔁 Chuyển ô', onClick:function(){ NG.state.moveFrom = i; NG.closeModal(); NG.notify('Chọn ô đất TRỐNG để chuyển tới','ℹ️','mvh'); } });
  acts.push({ label:'🗑 Nhổ bỏ', danger:true, onClick:function(){ removePlot(i); } });
  acts.push({ label:'Đóng', onClick: NG.closeModal });
  NG.openModal(nm + ' · ' + NG.STAGE_NAMES[st],
    '<div class="ins-hero"><span class="mi-ic">'+NG.plantIcon(sp, ready ? 5 : st)+'</span>'+
    '<div><b style="font:600 16px/1.3 var(--fd)">'+nm+'</b>'+
    '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="rar '+sp.rar+'">'+sp.rar.toUpperCase()+'</span>'+
    '<span class="ui-chip">'+NG.STAGE_NAMES[st]+'</span></div></div></div>'+
    '<div class="gxp-bar" style="margin:8px 0 4px"><i style="width:'+Math.round((p.prog||0)*100)+'%"></i></div>'+
    '<div class="ins-grid">'+
    '<div class="pv-row">Giai đoạn<b>'+st+'/5</b></div>'+
    '<div class="pv-row">Nước<b style="color:'+((p.water||0)>30?'var(--acc)':'#ff9a8f')+'">'+Math.round(p.water||0)+'%</b></div>'+
    '<div class="pv-row">Sức khoẻ<b style="color:'+((p.health||100)>60?'var(--acc)':(p.health||100)>30?'#f2c14e':'#ff9a8f')+'">'+Math.round(p.health||100)+'%</b></div>'+
    '<div class="pv-row">Giá trị<b style="color:#f2c14e">'+NG.fmtN(val)+'</b></div>'+
    '<div class="pv-row">Tuổi<b>'+(p.plantedAt ? NG.timeAgo(p.plantedAt) : '—')+'</b></div>'+
    '<div class="pv-row">Trồng lúc<b>'+(p.plantedAt ? new Date(p.plantedAt).toLocaleDateString('vi-VN') : '—')+'</b></div></div>'+
    (ready ? '<p style="color:#8fd99a;font-weight:600">✨ Sẵn sàng thu hoạch!</p>' :
     ((p.water||0) <= 25 ? '<p style="color:#ff9a8f">💧 Cây đang khát nước!</p>' : '')),
    acts);
}

function waterPlot(i, auto){
  var p = G.plots[i]; if(!p || p.st !== 'grow') return false;
  p.water = 100; p.wet = Date.now();
  if((p.health || 100) < 100) p.health = Math.min(100, (p.health || 100) + 15);
  if(!auto){
    G.stats.waters++; questProg('waters'); Garden.addGxp(1);
    NG.SND.play('harvest');
  }
  Garden.save(); NG.renderGardenUI();
  if(NG.G3D) NG.G3D.refresh();
  return true;
}
NG.waterAll = function(){
  if(!G) return;
  if(!G.tools.wc) return NG.notify('Cần mua Bình tưới ở Market (🛠 Công cụ)','🔒','wc');
  var n = 0;
  G.plots.forEach(function(p, i){ if(p.st === 'grow' && waterPlot(i, true)) n++; });
  if(n) NG.notify('Đã tưới ' + n + ' cây 💧','💧','wa');
  else NG.notify('Không có cây nào cần tưới','💧','wa');
};
function fertPlot(i){
  var p = G.plots[i]; if(!p || p.st !== 'grow') return;
  if((G.inv.fert || 0) <= 0) return NG.notify('Hết phân bón — mua ở Market','✕','fp');
  G.inv.fert--;
  p.fert = (p.fert || 0) + 1;
  p.prog = Math.min(1, (p.prog || 0) + .25);
  if(p.prog >= 1) p.st = 'ready';
  NG.notify('🧪 Bón phân +25% tăng trưởng!','🧪','fp' + i);
  NG.SND.play('buy'); Garden.save(); NG.renderGardenUI();
  if(NG.G3D) NG.G3D.refresh(); if(NG.renderInv) NG.renderInv();
}
function prunePlot(i){
  var p = G.plots[i]; if(!p || p.st !== 'grow') return;
  var now = Date.now();
  if(p.pruneAt && now - p.pruneAt < 120000) return NG.notify('Cây vừa được tỉa — chờ 2 phút','⏱','pr');
  p.pruneAt = now;
  p.prog = Math.min(1, (p.prog || 0) + .08);
  p.health = Math.min(100, (p.health || 100) + 5);
  NG.notify('✂️ Cắt tỉa +8% tăng trưởng','✂️','pr' + i);
  Garden.addGxp(2); Garden.save(); NG.renderGardenUI();
  if(NG.G3D) NG.G3D.refresh(); NG.closeModal();
}
function renamePlot(i){
  var p = G.plots[i]; if(!p) return;
  var sp = NG.plantById(p.seed) || {};
  NG.openModal('Đổi tên cây',
    '<label class="f-label" for="rnIn">Tên mới</label><input class="f-input" id="rnIn" maxlength="24" value="'+NG.esc(p.name||'')+'" placeholder="'+NG.esc(sp.n||'')+'">',
    [{ label:'Huỷ', onClick: NG.closeModal },
     { label:'Lưu', primary:true, onClick:function(){
        p.name = document.getElementById('rnIn').value.trim().slice(0, 24);
        Garden.save(); NG.closeModal(); NG.notify('Đã đổi tên','✏️','rn');
     }}]);
}
function removePlot(i){
  var p = G.plots[i]; if(!p || p.st !== 'grow') return;
  var sp = NG.plantById(p.seed) || { n:'cây', c:0 };
  NG.openModal('Nhổ bỏ cây?',
    '<p>Nhổ <b>'+NG.esc(p.name || sp.n)+'</b>? Hoàn lại 30% giá hạt.</p>',
    [{ label:'Huỷ', onClick: NG.closeModal },
     { label:'Nhổ bỏ', danger:true, onClick:function(){
        NG.addCoins(Math.round((sp.c || 0) * .3));
        p.st = 'empty'; delete p.seed; delete p.name; delete p.prog; delete p.water; delete p.health;
        NG.closeModal(); NG.notify('Đã nhổ cây','🗑','rm' + i);
        Garden.save(); if(NG.G3D) NG.G3D.refresh(); NG.renderGardenUI();
     }}]);
}
function harvest(i, srcEl){
  var p = G.plots[i]; if(!p || p.st !== 'ready') return;
  var sp = NG.plantById(p.seed); if(!sp) return;
  var qty = 1 + Math.floor(Math.random()*2) + (sp.big ? 0 : 1);
  var val = Math.round(sp.s * qty * (1 + (p.health || 100)/400));
  NG.addCoins(val);
  G.stats.harvested++; G.stats.earned += val;
  questProg('harvested'); questProg('earned', val);
  Garden.addGxp(sp.xp, srcEl);
  if(srcEl) NG.fpop(srcEl, '+' + NG.fmtN(val) + ' xu', '#f2c14e');
  if(sp.rar === 'epic' && Math.random() < .5){ NG.addGems(1); NG.notify('💎 +1 Ngọc hiếm!','💎','gm' + i); }
  if(sp.rar === 'legend' || sp.rar === 'mythic'){ NG.addGems(2); NG.notify('💎 +2 Ngọc!','💎','gm' + i); }
  NG.notify('🧺 ' + sp.n + ' x' + qty + ' → +' + NG.fmtN(val) + ' xu · +' + sp.xp + ' XP','🧺','hv' + p.plantedAt);
  NG.SND.chime(); NG.logAct('🧺','Thu hoạch ' + sp.n + ' x' + qty);
  if(G.stats.harvested >= 20) NG.unlock('gardener20');
  if(G.stats.earned >= 10000) NG.unlock('rich');
  p.st = 'empty'; delete p.seed; delete p.name; delete p.prog; delete p.water; delete p.health;
  Garden.save(); NG.renderGardenUI();
  if(NG.G3D) NG.G3D.refresh(); if(NG.G2D) NG.G2D.render();
  NG.burstEl(NG.$('#g3dWrap'), 8);
}

/* ---- GROWTH TICK (1s) ---- */
setInterval(function(){
  if(!G) return;
  var ch = false, now = Date.now();
  G.plots.forEach(function(p){
    if(p.st !== 'grow') return;
    var sp = NG.plantById(p.seed);
    if(!sp){ p.st = 'empty'; ch = true; return; }
    if((p.water || 0) > 0){
      var mul = 1 + (p.fert || 0) * .15;
      p.prog = Math.min(1, (p.prog || 0) + mul / sp.t);
      p.water = Math.max(0, p.water - 100 / (sp.t * .5));
      if(p.prog >= 1 && p.st === 'grow'){
        p.st = 'ready'; ch = true;
        NG.notify('🌱 ' + (p.name || sp.n) + ' đã trưởng thành!','🌱','gr' + p.plantedAt);
        NG.liveMsg('🌿', (p.name || sp.n) + ' sẵn sàng thu hoạch!', 2600);
      }
      ch = true;
    } else {
      p.wet = p.wet || 0;
      if(now - p.wet > 60000){ p.health = Math.max(0, (p.health || 100) - .15); ch = true; }
    }
  });
  if(G.tools.sprinkler && now - (G._sprk || 0) > 60000){
    G._sprk = now;
    G.plots.forEach(function(p){ if(p.st === 'grow'){ p.water = 100; p.wet = now; } });
    NG.liveMsg('💦','Sprinkler đã tưới vườn', 2200); ch = true;
  }
  if(ch){
    Garden.save();
    if(NG.state.cur === 'garden'){ if(NG.G3D) NG.G3D.refresh(); if(NG.G2D) NG.G2D.render(); }
  }
}, 1000);
})();
