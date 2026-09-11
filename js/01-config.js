/* NOXGARDEN — CONFIG + STATE (một namespace duy nhất: NG) */
(function(){
'use strict';
var NG = window.NG = window.NG || {};

NG.DEV_EMAIL = 'hminhgalaxy@gmail.com';
NG.DEV_CODE  = '1313';
NG.MAX_LV    = 100;
NG.NPLOTS    = 12;
NG.IS_LIVE   = /^(www\.)?skibidiscript\.vercel\.app$/i.test(location.hostname);
NG.REDUCE    = matchMedia('(prefers-reduced-motion: reduce)').matches;
NG.LOWEND    = (innerWidth < 700) || ((navigator.hardwareConcurrency || 8) <= 4);

/* State tập trung — không module nào tự tạo state riêng */
NG.state = {
  user: null, control: null,
  cur: 'home',
  pickPlot: -1,      // ô đất đang chọn hạt
  moveFrom: -1,      // chế độ chuyển cây
  utilKind: null,    // tiện ích đang mở
  fbOK: false
};

/* localStorage an toàn */
NG.store = {
  get: function(k, f){ try{ var v = localStorage.getItem('noxg2-' + k); return v ? JSON.parse(v) : f; }catch(e){ return f; } },
  set: function(k, v){ try{ localStorage.setItem('noxg2-' + k, JSON.stringify(v)); }catch(e){} },
  del: function(k){ try{ localStorage.removeItem('noxg2-' + k); }catch(e){} }
};

/* Boot an toàn — log lỗi thật, không che giấu */
NG.safeBoot = function(name, fn){
  try{ fn(); }
  catch(e){ console.error('[NOXG][' + name + ']', e); }
};
NG.safeCall = function(fn){ try{ return fn(); }catch(e){ console.error('[NOXG]', e); } };
})();
