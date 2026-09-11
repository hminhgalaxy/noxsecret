/* NOXGARDEN — PROFILE + avatar secret + diagnostics */
(function(){
'use strict';
var NG = window.NG;
var avaTaps = 0;

NG.fillProfile = function(){
  var u = NG.state.user, role = NG.resolveRole();
  NG.syncDevUI();
  var av = NG.$('#pAva'); if(!av) return;
  if(!u){
    NG.$('#pName').textContent = 'Khách vãng lai';
    NG.$('#pBio').textContent = 'Đăng nhập để đồng bộ khu vườn lên mây.';
    NG.$('#pChips').innerHTML = '<span class="ui-chip">GUEST MODE</span>';
    av.innerHTML = '<div class="ava-in"><span>N</span></div>';
    NG.setLevelUI(1, 0); NG.renderAchList(); return;
  }
  var name = u.username || u.name, lv = NG.displayLevel(), dev = role === 'DEV';
  NG.$('#pName').textContent = name;
  NG.$('#pBio').textContent = 'Cùng NOXGARDEN từ ' + new Date(u.createdAt || Date.now()).toLocaleDateString('vi-VN') + '.';
  var chips = '<span class="ui-chip mono">' + NG.esc((u.uid||'').toUpperCase().slice(0,16)) + '</span>' +
    '<span class="ui-chip mono'+(dev?' chip-dev':'')+'">'+(dev?'🛠 DEV':NG.esc(role))+'</span>' +
    '<span class="ui-chip mono">'+NG.esc(NG.lvlTitle(lv))+'</span>';
  if(u.email) chips += '<span class="ui-chip mono wb">'+NG.esc(u.email)+'</span>';
  NG.$('#pChips').innerHTML = chips;
  av.innerHTML = '<div class="ava-in">'+(u.avatar ? '<img alt="" referrerpolicy="no-referrer">' : '<span>'+NG.esc((name.trim()[0]||'N').toUpperCase())+'</span>')+'</div>';
  if(u.avatar){ var im = av.querySelector('img'); if(im) im.src = u.avatar; }
  if(dev){
    if(!av.querySelector('.dev-aura')){ var a = document.createElement('span'); a.className='dev-aura'; av.appendChild(a); }
    if(!av.querySelector('.dv-crown')){ var c = document.createElement('span'); c.className='dv-crown'; c.textContent='👑'; av.appendChild(c); }
  } else {
    var da = av.querySelector('.dev-aura'); if(da) da.remove();
    var dc = av.querySelector('.dv-crown'); if(dc) dc.remove();
  }
  NG.setLevelUI(lv, u.xp || 0);
  if(NG.G && NG.Garden) NG.Garden.setGxUI();
  NG.renderAchList();
};

NG.editProfileModal = function(){
  if(!NG.state.user) return NG.openLoginModal();
  var u = NG.state.user;
  NG.openModal('Chỉnh sửa hồ sơ',
    '<label class="f-label" for="fName">Biệt danh</label>'+
    '<input class="f-input" id="fName" maxlength="24" value="'+NG.esc(u.username||u.name)+'">',
    [{ label:'Huỷ', onClick: NG.closeModal },
     { label:'Lưu', primary:true, onClick:function(){
        var name = document.getElementById('fName').value.trim().slice(0,24) || (u.username||u.name);
        u.username = name; u.name = name;
        if(u.provider === 'google' && NG.FB_LIVE)
          NG.db.ref('nox_users_registry/'+u.uid).update({ name:name, username:name }).catch(function(){});
        else { var g = NG.store.get('guest', null); if(g){ g.name = name; NG.store.set('guest', g); } }
        NG.fillProfile(); NG.closeModal(); NG.notify('Đã cập nhật','✏️','prof');
     }}]);
};

/* avatar: 3 taps -> vuông; 3 taps nữa -> mã bí mật DEV */
NG.$('#pAva').addEventListener('click', function(){
  var av = NG.$('#pAva'); avaTaps++;
  if(!av.classList.contains('sq')){
    if(avaTaps >= 3){
      avaTaps = 0; av.classList.add('sq');
      NG.notify('Khung đổi VUÔNG — chạm 3 lần nữa để mở mã bí mật','⭐','ava3');
    }
    return;
  }
  if(avaTaps >= 3){
    avaTaps = 0;
    NG.openModal('Mã bí mật',
      '<p>Nhập mã để mở quyền DEV.</p>'+
      '<label class="f-label" for="secCode">Mã số</label>'+
      '<input class="f-input mono" id="secCode" inputmode="numeric" maxlength="8" placeholder="••••" style="text-align:center;font-size:22px;letter-spacing:.4em">'+
      '<p style="margin-top:12px;font-size:12px;color:var(--ink3)" id="secHint">Chỉ người biết mã mới mở được.</p>',
      [{ label:'Huỷ', onClick: NG.closeModal },
       { label:'Mở khóa', primary:true, onClick:function(){
          var v = document.getElementById('secCode').value.trim();
          if(v === NG.DEV_CODE){
            NG.store.set('devUnlock', true); NG.closeModal(); NG.syncDevUI();
            NG.notify('Mã đúng! Quyền DEV kích hoạt','🛠','devk');
            NG.liveMsg('🛠','DEV MODE',3500);
            NG.fillProfile(); NG.updateDiag();
          } else {
            var h = document.getElementById('secHint');
            if(h){ h.textContent = 'Sai mã.'; h.style.color = '#ff9a8f'; }
            NG.notify('Sai mã','✕','devk');
          }
       }}]);
    setTimeout(function(){ var sc = document.getElementById('secCode'); if(sc) sc.focus(); }, 120);
  }
});

NG.updateDiag = function(){
  var u = NG.state.user;
  var el = NG.$('#dgSession');
  if(el) el.textContent = u ? u.provider.toUpperCase() + ' · ' + (u.username||u.name) + ' · ' + NG.resolveRole() : 'Khách';
};
})();
