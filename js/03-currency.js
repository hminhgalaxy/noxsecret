/* NOXGARDEN — CURRENCY (Coins + Gems) + XP — MỘT state duy nhất */
(function(){
'use strict';
var NG = window.NG;

var money = NG.money = { coins: 0, gems: 0 };

NG.loadMoney = function(){
  var l = NG.store.get('money', null);
  if(NG.state.user && NG.state.user.provider === 'google'){
    money.coins = NG.state.user.coins || 0;
    money.gems  = NG.state.user.gems  || 0;
    /* merge: lấy giá trị lớn hơn giữa cloud và local (chống mất khi offline) */
    if(l){ money.coins = Math.max(money.coins, l.coins || 0); money.gems = Math.max(money.gems, l.gems || 0); }
  } else if(l){ money.coins = l.coins || 0; money.gems = l.gems || 0; }
  else { money.coins = 60; money.gems = 3; NG.saveMoney(); } /* quà khởi đầu */
  NG.renderMoney();
};

var _saveT = null;
NG.saveMoney = function(){
  money.upd = Date.now();
  NG.store.set('money', money);
  if(NG.state.user && NG.state.user.provider === 'google' && NG.FB_LIVE){
    clearTimeout(_saveT);
    _saveT = setTimeout(function(){
      NG.db.ref('nox_users_registry/' + NG.state.user.uid)
        .update({ coins: money.coins, gems: money.gems, moneyUpd: Date.now() })
        .catch(function(){});
    }, 800);
  }
};

NG.renderMoney = function(){
  ['#lbCoinsTx','#mkCoins','#hStatC','#statCoins'].forEach(function(s){
    var el = NG.$(s); if(el) el.textContent = NG.fmtN(money.coins);
  });
  ['#lbGemsTx','#mkGems','#statGems'].forEach(function(s){
    var el = NG.$(s); if(el) el.textContent = NG.fmtN(money.gems);
  });
};

NG.addCoins = function(n){ money.coins = Math.max(0, Math.round(money.coins + n)); NG.saveMoney(); NG.renderMoney(); };
NG.addGems  = function(n){ money.gems  = Math.max(0, Math.round(money.gems  + n)); NG.saveMoney(); NG.renderMoney(); };

/* trả về false nếu không đủ — KHÔNG trừ khi thiếu */
NG.spend = function(coins, gems){
  gems = gems || 0;
  if(money.coins < coins || money.gems < gems) return false;
  money.coins -= coins; money.gems -= gems;
  NG.saveMoney(); NG.renderMoney(); return true;
};

/* ---- ACCOUNT XP ---- */
NG.displayLevel = function(){
  return NG.resolveRole() === 'DEV' ? NG.MAX_LV + 1 : Math.min(NG.MAX_LV, (NG.state.user && NG.state.user.level) || 1);
};
NG.lvlTitle = function(lv){
  return lv > NG.MAX_LV ? 'DEV · Master' : lv >= 80 ? 'Huyền thoại' : lv >= 60 ? 'Bậc thầy' : lv >= 40 ? 'Chiến binh' : lv >= 20 ? 'Nhà thám hiểm' : 'Tân binh';
};
NG.setLevelUI = function(lv, xp){
  var s1 = NG.$('#statLevel'); if(s1) s1.textContent = lv > NG.MAX_LV ? 'DEV' : lv;
  var xl = NG.$('#xpLevel'); if(xl) xl.textContent = (lv > NG.MAX_LV ? 'DEV · ' : '') + 'Level ' + lv;
  if(lv > NG.MAX_LV){
    var x1 = NG.$('#xpText'); if(x1) x1.textContent = 'VÔ HẠN · ' + xp + ' XP';
    var f1 = NG.$('#xpFill'); if(f1) f1.style.width = '100%'; return;
  }
  var x2 = NG.$('#xpText'); if(x2) x2.textContent = xp + ' / ' + (lv * 250) + ' XP';
  var f2 = NG.$('#xpFill'); if(f2) f2.style.width = Math.min(100, Math.max(0, Math.round((xp - (lv-1)*250) / 250 * 100))) + '%';
};
NG.addXp = function(n, srcEl){
  var u = NG.state.user; if(!u || !n) return;
  if(srcEl) NG.fpop(srcEl, '+' + n + ' XP');
  var was = NG.displayLevel();
  if(u.provider === 'guest'){
    u.xp = (u.xp || 0) + n;
    u.level = Math.min(NG.MAX_LV, Math.max(1, Math.floor(u.xp / 250) + 1));
    NG.store.set('gl', u.level); NG.store.set('gx', u.xp);
    if(u.level > was){ NG.notify('LEVEL UP! ' + u.level, 'trophy', 'lv' + u.level); NG.confetti(); }
    NG.setLevelUI(NG.displayLevel(), u.xp); return;
  }
  NG.db.ref('nox_users_registry/' + u.uid + '/xp').transaction(function(x){ return (x || 0) + n; })
  .then(function(r){
    var nx = (r && r.snapshot && r.snapshot.val()) || 0;
    var nl = Math.min(NG.MAX_LV, Math.max(1, Math.floor(nx / 250) + 1));
    if(nl > was){
      NG.db.ref('nox_users_registry/' + u.uid + '/level').set(nl).catch(function(){});
      u.level = nl; NG.notify('LEVEL UP! ' + nl, 'trophy', 'lv' + nl); NG.confetti();
    }
    u.xp = nx; NG.setLevelUI(NG.displayLevel(), nx);
  }).catch(function(){});
};
})();
