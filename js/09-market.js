/* NOXGARDEN — MARKET (buy) + INVENTORY (5 tab) */
(function(){
'use strict';
var NG = window.NG;

NG.TOOLS = [
  { id:'wc',        n:'Bình tưới',        d:'Mở khoá "Tưới tất cả" một chạm',      c:400 },
  { id:'shears',    n:'Kéo tỉa',          d:'Mở khoá cắt tỉa (+8% tăng trưởng)',   c:600 },
  { id:'sprinkler', n:'Vòi phun tự động', d:'Tự tưới toàn bộ vườn mỗi 60s',        c:1500 }
];
NG.FERT = { id:'fert', n:'Phân bón', d:'Tăng +25% tăng trưởng tức thì', c:150 };
NG.DECORS = [
  { id:'lamp',     n:'Đèn vườn',     c:350 },
  { id:'gnome',    n:'Búp bê vườn',  c:280 },
  { id:'fountain', n:'Đài phun nước',c:900 },
  { id:'arch',     n:'Cổng hoa',     c:520 }
];

var CATS = [
  { id:'tree',    n:'🌳 Cây gỗ' }, { id:'flower', n:'🌸 Hoa' },
  { id:'bush',    n:'🌿 Bụi' },    { id:'special',n:'✨ Đặc biệt' },
  { id:'fert',    n:'🧪 Phân bón' },{ id:'tool',   n:'🛠 Công cụ' },
  { id:'decor',   n:'🏮 Trang trí' }
];
var MK = NG.MK = { tab:'tree', q:'', rar:'', sort:'def' };
var IV = NG.IV = { tab:'seeds' };

function desc(sp){
  var t = { tree:'Cây gỗ', flower:'Hoa', bush:'Bụi cây', special:'Đặc biệt' }[sp.cat];
  return t + ' · lớn ' + Math.round(sp.t/60) + ' phút · bán ' + NG.fmtN(sp.s) + ' xu' + (sp.glow ? ' · phát sáng' : '');
}

NG.Market = {
  items: function(){
    var list = [];
    if(['tree','flower','bush','special'].indexOf(MK.tab) >= 0){
      NG.PLANTS.forEach(function(sp){
        if(sp.cat === MK.tab) list.push({ kind:'seed', id:sp.id, n:sp.n+' (hạt)', rar:sp.rar,
          c:sp.c, g:sp.g, d:desc(sp), ic:NG.plantIcon(sp, 2), grow:sp.t });
      });
    } else if(MK.tab === 'fert'){
      list.push({ kind:'fert', id:'fert', n:FERT.n, rar:'common', c:FERT.c, g:0, d:FERT.d,
        ic:'<svg viewBox="0 0 36 52"><path d="M14 30h8v14a4 4 0 0 1-8 0z" fill="#8a6a3a"/><circle cx="18" cy="22" r="9" fill="#8fd99a"/><circle cx="15" cy="20" r="3" fill="#c8f0b8"/></svg>' });
    } else if(MK.tab === 'tool'){
      NG.TOOLS.forEach(function(t){
        list.push({ kind:'tool', id:t.id, n:t.n, rar:'uncommon', c:t.c, g:0, d:t.d, ic:'🛠' });
      });
    } else if(MK.tab === 'decor'){
      NG.DECORS.forEach(function(t){
        list.push({ kind:'decor', id:t.id, n:t.n, rar:'rare', c:t.c, g:0, d:'Xuất hiện ngay trong vườn 3D', ic:'🏮' });
      });
    }
    if(MK.q) list = list.filter(function(it){ return it.n.toLowerCase().indexOf(MK.q.toLowerCase()) >= 0; });
    if(MK.rar) list = list.filter(function(it){ return it.rar === MK.rar; });
    if(MK.sort === 'lo') list.sort(function(a,b){ return a.c - b.c; });
    else if(MK.sort === 'hi') list.sort(function(a,b){ return b.c - a.c; });
    else if(MK.sort === 'name') list.sort(function(a,b){ return a.n.localeCompare(b.n); });
    return list;
  },
  render: function(){
    var tabs = NG.$('#mkTabs'); if(!tabs) return;
    tabs.innerHTML = CATS.map(function(c){
      return '<button class="mk-tab'+(MK.tab===c.id?' on':'')+'" data-act="mkTab" data-id="'+c.id+'">'+c.n+'</button>';
    }).join('');
    var list = this.items(), grid = NG.$('#mkGrid');
    if(!list.length){ grid.innerHTML = '<div class="statebox" style="grid-column:1/-1">🔍<span>Không tìm thấy mục nào.</span></div>'; return; }
    grid.innerHTML = list.map(function(it, i){
      var owned = it.kind === 'tool' && NG.G && NG.G.tools[it.id];
      var afford = it.g ? NG.money.gems >= it.g : NG.money.coins >= it.c;
      var btn = owned ? '<button class="mini-btn ok" disabled>ĐÃ CÓ</button>'
        : (afford ? '<button class="mini-btn gold" data-act="buy" data-i="'+i+'">'+
            (it.g ? '<span class="price gem">'+it.g+' 💎</span>'
                  : '<span class="price"><span class="mini-coin"></span>'+NG.fmtN(it.c)+'</span>')+'</button>'
          : '<button class="mini-btn" disabled style="opacity:.45">'+(it.g ? 'Cần 💎'+it.g : 'Cần '+NG.fmtN(it.c)+' xu')+'</button>');
      var fertN = (it.kind === 'fert' && NG.G) ? (NG.G.inv.fert || 0) : 0;
      var icHtml = it.ic.charAt(0) === '<' ? '<span class="mi-ic">'+it.ic+'</span>' : '<span class="mi-ic" style="font-size:26px">'+it.ic+'</span>';
      return '<div class="mk-item"><div class="mi-top">'+icHtml+
        '<div class="mi-nm"><b>'+NG.esc(it.n)+'</b><small><span class="rar '+it.rar+'">'+it.rar.toUpperCase()+'</span>'+
        (it.grow ? '<span>⏱ '+Math.round(it.grow/60)+'p</span>' : '')+'</small></div></div>'+
        '<div class="mi-desc">'+NG.esc(it.d)+'</div>'+
        '<div class="mi-foot">'+(fertN ? '<span class="ui-chip">x'+fertN+'</span>' : '')+btn+'</div></div>';
    }).join('');
  },
  buy: function(el){
    var it = this.items()[+el.dataset.i]; if(!it) return;
    if(it.kind === 'tool' && NG.G.tools[it.id]) return;
    if(!NG.spend(it.c, it.g)) return NG.notify('Không đủ tiền!','✕','err');
    if(it.kind === 'seed'){
      NG.G.inv.seeds[it.id] = (NG.G.inv.seeds[it.id] || 0) + 1;
      NG.notify('Đã mua hạt ' + it.n, '🌱', 'b' + it.id);
      var kinds = Object.keys(NG.G.inv.seeds).length;
      if(kinds >= 8) NG.unlock('collector');
    }
    else if(it.kind === 'fert'){ NG.G.inv.fert = (NG.G.inv.fert || 0) + 1; NG.notify('Đã mua Phân bón ×1','🧪','bf'); }
    else if(it.kind === 'tool'){ NG.G.tools[it.id] = true; NG.notify('Đã mua ' + it.n + '!','🛠','bt' + it.id); }
    else if(it.kind === 'decor'){ NG.G.decor[it.id] = true; NG.notify('Đã mua ' + it.n + ' — ra vườn xem nhé!','🏮','bd' + it.id); }
    NG.logAct('🛒','Mua: ' + it.n);
    NG.Garden.save(); this.render(); if(NG.G3D) NG.G3D.refresh(); if(NG.renderInv) NG.renderInv();
  }
};

NG.renderMarket = function(){ NG.Market.render(); };

NG.renderInv = function(){
  var tabs = NG.$('#ivTabs'); if(!tabs || !NG.G) return;
  var tl = [['seeds','🌱 Hạt'],['growing','🌿 Đang lớn'],['fert','🧪 Phân'],['tools','🛠 Công cụ'],['decor','🏮 Trang trí']];
  tabs.innerHTML = tl.map(function(t){
    return '<button class="mk-tab'+(IV.tab===t[0]?' on':'')+'" data-act="ivTab" data-id="'+t[0]+'">'+t[1]+'</button>';
  }).join('');
  var rows = [], G = NG.G;
  if(IV.tab === 'seeds'){
    var any = false;
    Object.keys(G.inv.seeds).forEach(function(id){
      var q = G.inv.seeds[id]; if(q <= 0) return; any = true;
      var sp = NG.plantById(id); if(!sp) return;
      rows.push('<div class="mk-item"><div class="mi-top"><span class="mi-ic">'+NG.plantIcon(sp,2)+'</span>'+
        '<div class="mi-nm"><b>'+NG.esc(sp.n)+' × '+q+'</b><small><span class="rar '+sp.rar+'">'+sp.rar.toUpperCase()+'</span><span>⏱ '+Math.round(sp.t/60)+'p</span></small></div></div>'+
        '<div class="mi-foot"><button class="mini-btn ok" data-act="ivGoGarden">Trồng ngay →</button></div></div>');
    });
    if(!any) rows.push('<div class="statebox" style="grid-column:1/-1">🪴<span>Chưa có hạt giống nào.</span><small>Mua ở Market để bắt đầu!</small></div>');
  }
  else if(IV.tab === 'growing'){
    var n = 0;
    G.plots.forEach(function(p, i){
      if(p.st !== 'grow') return; n++;
      var sp = NG.plantById(p.seed); if(!sp) return;
      var st = NG.stageOf(p);
      rows.push('<div class="mk-item" data-act="plot" data-id="'+i+'" style="cursor:pointer"><div class="mi-top">'+
        '<span class="mi-ic">'+NG.plantIcon(sp, st)+'</span>'+
        '<div class="mi-nm"><b>'+NG.esc(p.name || sp.n)+'</b><small><span class="rar '+sp.rar+'">'+sp.rar.toUpperCase()+'</span><span>'+NG.STAGE_NAMES[st]+'</span></small></div></div>'+
        '<div class="gxp-bar" style="margin-top:4px"><i style="width:'+Math.round((p.prog||0)*100)+'%"></i></div></div>');
    });
    if(!n) rows.push('<div class="statebox" style="grid-column:1/-1">🌱<span>Chưa trồng gì cả.</span><small>Vào Garden chọn ô đất trống!</small></div>');
  }
  else if(IV.tab === 'fert'){
    var fn = G.inv.fert || 0;
    rows.push(fn ? '<div class="mk-item"><div class="mi-top"><span class="mi-ic" style="font-size:26px">🧪</span>'+
      '<div class="mi-nm"><b>Phân bón × '+fn+'</b><small><span class="rar common">COMMON</span></small></div></div>'+
      '<div class="mi-foot"><span class="ui-chip">Dùng trong Inspector cây</span></div></div>'
      : '<div class="statebox" style="grid-column:1/-1">Chưa có phân bón.</div>');
  }
  else if(IV.tab === 'tools'){
    NG.TOOLS.forEach(function(t){
      rows.push('<div class="mk-item"><div class="mi-top"><span class="row-ic">🛠</span>'+
        '<div class="mi-nm"><b>'+NG.esc(t.n)+'</b><small>'+NG.esc(t.d)+'</small></div></div>'+
        '<div class="mi-foot">'+(G.tools[t.id] ? '<span class="ui-chip" style="color:var(--acc)">ĐÃ CÓ</span>'
          : '<button class="mini-btn gold" data-act="buyTool" data-id="'+t.id+'">Mua '+NG.fmtN(t.c)+' xu</button>')+'</div></div>');
    });
  }
  else {
    NG.DECORS.forEach(function(t){
      rows.push('<div class="mk-item"><div class="mi-top"><span class="row-ic">🏮</span>'+
        '<div class="mi-nm"><b>'+NG.esc(t.n)+'</b><small>Trang trí vườn 3D</small></div></div>'+
        '<div class="mi-foot">'+(G.decor[t.id] ? '<span class="ui-chip" style="color:var(--acc)">ĐÃ CÓ</span>'
          : '<button class="mini-btn gold" data-act="buyDecor" data-id="'+t.id+'">Mua '+NG.fmtN(t.c)+' xu</button>')+'</div></div>');
    });
  }
  NG.$('#ivGrid').innerHTML = '<div class="mk-grid">' + rows.join('') + '</div>';
};
})();
