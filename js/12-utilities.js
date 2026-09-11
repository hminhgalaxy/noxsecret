/* NOXGARDEN — UTILITIES: Script/APK/Link/iOS + đóng góp */
(function(){
'use strict';
var NG = window.NG;

var Util = NG.Util = {
  scripts:[], apk:[], links:[], ios:[],
  inited:false, loading:false, kind:null,
  load: function(){
    if(this.inited || this.loading) return;
    this.loading = true;
    var self = this;
    NG.db.ref('nox_data').once('value').then(function(s){
      var d = (s && s.val ? s.val() : null) || {};
      self.scripts = norm(d.scripts); self.apk = norm(d.apk);
      self.links = norm(d.links); self.ios = norm(d.ios);
      self.inited = true; self.loading = false;
      NG.renderUtilGrid();
      if(NG.state.utilKind) self.renderDetail();
    }).catch(function(){
      self.loading = false;
      NG.notify('Không tải được dữ liệu tiện ích','⚠','uerr');
    });
  },
  renderGrid: function(){
    var g = NG.$('#utilGridBox'); if(!g) return;
    var items = [
      ['script','Script','Sao chép · vault', this.scripts.length],
      ['apk','APK','Mở link tải', this.apk.length],
      ['link','Link','Chỉ mở', this.links.length],
      ['ios','iOS','Mẹo · hướng dẫn', this.ios.length]
    ];
    g.innerHTML = items.map(function(it){
      return '<button class="util-item" data-act="utilDet" data-id="'+it[0]+'">'+
        '<span class="ui-ic'+(it[0]==='apk'?' apk':'')+'">'+(it[0]==='script'?'📜':it[0]==='apk'?'📦':it[0]==='link'?'🔗':'🍎')+'</span>'+
        '<span class="ui-body"><b>'+it[1]+'</b><small>'+it[2]+'</small></span>'+
        '<span class="ui-chip">'+it[3]+' mục</span></button>';
    }).join('');
  },
  openDetail: function(kind){
    this.kind = kind; NG.state.utilKind = kind;
    ['#face-menu','#face-grid'].forEach(function(s){ NG.$(s).classList.add('hidden'); });
    NG.$('#face-detail').classList.remove('hidden');
    NG.$('#detailTitle').textContent = { script:'Script', apk:'APK', link:'Link', ios:'iOS' }[kind] || kind;
    this.renderDetail(); this.load();
  },
  backToGrid: function(){
    ['#face-menu','#face-detail'].forEach(function(s){ NG.$(s).classList.add('hidden'); });
    NG.$('#face-grid').classList.remove('hidden');
  },
  backToMenu: function(){
    ['#face-grid','#face-detail'].forEach(function(s){ NG.$(s).classList.add('hidden'); });
    NG.$('#face-menu').classList.remove('hidden');
  },
  renderDetail: function(){
    var kind = this.kind, box = NG.$('#utilDetail');
    if(!box || !kind) return;
    var dev = NG.resolveRole() === 'DEV';
    var list = this[kind] || [];
    var h = '<div class="vault-sub"><h4>'+({script:'📜 SCRIPT VAULT',apk:'📦 APK',link:'🔗 LINK',ios:'🍎 iOS'})[kind]+'</h4>'+
      '<span style="display:flex;gap:8px">'+
      (dev ? '<button class="mini-btn" data-act="devAdd2" data-id="'+kind+'">＋ Thêm</button>' : '')+
      '<button class="mini-btn" data-act="contrib" data-id="'+kind+'">＋ Đóng góp</button></span></div>';
    if(!list.length)
      h += '<div class="statebox">📭<span>Chưa có mục nào.</span><small>DEV thêm qua Dev Panel · bạn có thể Đóng góp.</small></div>';
    list.forEach(function(it, i){
      var url = NG.safeUrl(it.url);
      if(kind === 'script' && it.code){
        h += '<div class="row" data-act="copyScript" data-i="'+i+'" role="button" tabindex="0" style="cursor:pointer">'+
          '<span class="row-ic">📜</span><span class="row-tx"><b>'+NG.esc(it.name||'(không tên)')+'</b>'+
          '<small class="wb">'+NG.esc(it.desc||'')+'</small>'+
          '<div class="code-scroll"><code>'+NG.esc(it.code.slice(0,140))+(it.code.length>140?'…':'')+'</code></div></span>'+
          '<span class="row-act"><span class="ui-chip">SAO CHÉP</span></span></div>';
      }
      else if(url){
        h += '<button class="row" data-act="openU" data-k="'+kind+'" data-i="'+i+'">'+
          '<span class="row-ic">'+(kind==='apk'?'📦':kind==='ios'?'🍎':'🔗')+'</span>'+
          '<span class="row-tx"><b>'+NG.esc(it.name||'(không tên)')+'</b>'+
          '<small class="wb">'+NG.esc(it.desc||url)+'</small></span>'+
          '<span class="row-act"><span class="ui-chip">MỞ ↗</span></span></button>';
      }
      else{
        h += '<div class="row"><span class="row-ic">ℹ️</span>'+
          '<span class="row-tx"><b>'+NG.esc(it.name||'(không tên)')+'</b>'+
          '<small class="wb">'+NG.esc(it.desc||'')+'</small></span></div>';
      }
    });
    box.innerHTML = h;
  },
  addModal: function(kind){
    if(NG.resolveRole() !== 'DEV') return NG.notify('Chỉ DEV','🔒','dv');
    var fields = kind === 'scripts' ? [['name','Tên script'],['desc','Mô tả'],['code','Mã code','area']] :
      kind === 'apk' ? [['name','Tên APK'],['url','URL tải'],['desc','Mô tả']] :
      kind === 'links' ? [['name','Tên link'],['url','URL'],['desc','Mô tả']] :
      [['name','Tiêu đề'],['url','URL (tuỳ chọn)'],['desc','Chi tiết']];
    var F = fields.map(function(f){
      return '<label class="f-label" for="de_'+f[0]+'">'+f[1]+'</label>'+
        (f[2]==='area' ? '<textarea class="f-area" id="de_'+f[0]+'"></textarea>'
                       : '<input class="f-input" id="de_'+f[0]+'">');
    }).join('');
    NG.openModal('Thêm · ' + kind, F,
      [{ label:'Huỷ', onClick: NG.closeModal },
       { label:'Đăng lên', primary:true, onClick:function(){
          var obj = {};
          fields.forEach(function(f){
            var e = document.getElementById('de_'+f[0]);
            if(e) obj[f[0]] = e.value.trim();
          });
          if(!obj.name) return NG.notify('Cần điền tên','✕','de');
          obj.createdAt = NG.serverNow();
          NG.db.ref('nox_data/' + kind).push(obj)
            .then(function(){ NG.closeModal(); NG.notify('Đã đăng','✅','de'); Util.load(); })
            .catch(function(){ NG.notify('Không ghi được — kiểm tra Firebase Rules (WRITE)','✕','de'); });
       }}]);
  },
  del: function(key){
    var pr = key.split(':'), kind = pr[0], k = pr[1];
    NG.openModal('Xoá mục?', '<p>Xoá khỏi ' + kind + '?</p>',
      [{ label:'Huỷ', onClick: NG.closeModal },
       { label:'XOÁ', danger:true, onClick:function(){
          NG.db.ref('nox_data/' + kind + '/' + k).remove()
            .then(function(){ NG.closeModal(); NG.notify('Đã xoá','🗑','dd'); Util.load(); })
            .catch(function(){ NG.notify('Không xoá được','✕','dd'); });
       }}]);
  }
};

function norm(v){
  if(!v) return [];
  var arr;
  if(Array.isArray(v)) arr = v.map(function(o,i){
    return (typeof o === 'object' && o) ? Object.assign({_k:String(i)}, o) : { name:String(o), _k:String(i) };
  });
  else if(typeof v === 'object') arr = Object.keys(v).map(function(k){
    return (typeof v[k] === 'object' && v[k]) ? Object.assign({_k:k}, v[k]) : { name:String(v[k]), _k:k };
  });
  else return [];
  return arr.filter(function(it){ return it && typeof it === 'object'; }).map(function(it){
    return { _k:it._k,
      name: it.name != null ? it.name : (it.title != null ? it.title : ''),
      desc: it.desc != null ? it.desc : (it.d != null ? it.d : ''),
      code: it.code != null ? it.code : (it.script != null ? it.script : ''),
      url:  it.url  != null ? it.url  : (it.link != null ? it.link  : ''),
      by: it.by || '', copies: it.copies || 0 };
  }).filter(function(it){ return it.name || it.code || it.url; });
}

NG.contribModal = function(kind){
  if(!NG.state.user) return NG.openLoginModal();
  var fields = kind === 'Script' ? [['n','Tên script','VD: Garden Hub'],['d','Mô tả','Dành cho game nào…'],['c','Mã script','loadstring(...)']] :
    kind === 'APK' ? [['n','Tên APK',''],['d','Mô tả',''],['u','URL tải','https://…']] :
    kind === 'Link' ? [['n','Tên',''],['u','URL','https://…'],['d','Mô tả','']] :
    [['n','Tiêu đề','Mẹo iOS'],['d','Chi tiết','Cách làm'],['u','URL (tuỳ chọn)','https://…']];
  var F = fields.map(function(f){
    return '<label class="f-label" for="vc_'+f[0]+'">'+f[1]+'</label><input class="f-input" id="vc_'+f[0]+'" placeholder="'+f[2]+'">';
  }).join('');
  NG.openModal('Đóng góp · ' + kind, F,
    [{ label:'Huỷ', onClick: NG.closeModal },
     { label:'Gửi', primary:true, onClick:function(btn){
        var vals = {};
        fields.forEach(function(f){ vals[f[0]] = document.getElementById('vc_'+f[0]).value.trim(); });
        if(!vals.n) return NG.notify('Cần điền tên','✕','vc');
        btn.disabled = true; btn.classList.add('loading');
        var data = { name:vals.n, desc:vals.d, code:vals.c, url:vals.u,
          by:NG.state.user.username||NG.state.user.name, uid:NG.state.user.uid, ts:NG.serverNow() };
        NG.db.ref('nox_contributions/' + kind.toLowerCase() + '_vault').push(Object.assign({}, data, { status:'pending' }))
          .then(function(){
            NG.closeModal(); NG.notify('Đã gửi đóng góp — chờ DEV duyệt','✅','vc');
            NG.logAct('🎁','Đóng góp ' + kind); NG.unlock('creator'); NG.addXp(10);
            return NG.db.ref('nox_data/' + kind.toLowerCase()).push(data);
          })
          .then(function(){ Util.load(); })
          .catch(function(){ NG.closeModal(); NG.notify('Không gửi được','✕','vc'); });
     }}]);
};
})();
