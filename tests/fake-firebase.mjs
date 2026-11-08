/* Firebase compat SDK giả, lưu trong localStorage, ÁP DỤNG database.rules.json thật qua rules-engine.js. */
import fs from "node:fs";
const engineSrc = fs.readFileSync(new URL("./rules-engine.js", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8");
export const DEV_EMAIL = "hminhgalaxy@gmail.com";
export const SEED = {
  nox_data: {
    scripts: { "-s1": { name: "Auto Farm Script", desc: "Tự động farm", code: "print('farm')", copies: 2, createdAt: 1700000000000 },
               "-s2": { title: "Legacy Script", description: "Dữ liệu cũ dùng title/script", script: "print('old')", createdAt: 1690000000000 } },
    apks: { "-a1": { name: "Demo APK", desc: "APK demo", url: "https://example.com/demo.apk", vault: true, createdAt: 1700000100000 } },
    ios: { "-i1": { name: "Demo iOS", desc: "iOS demo", url: "https://example.com/demo.ipa", createdAt: 1700000200000 } },
    links: { "-l1": { name: "Discord", desc: "Cộng đồng", url: "https://discord.gg/example", createdAt: 1700000300000 } },
    mod: { "-m1": { name: "Mod Pack", desc: "Mod", url: "https://example.com/mod", createdAt: 1700000400000 } }
  },
  nox_categories: { "-c1": { name: "Mod", node: "mod", icon: "bolt", color: "#ff647c", sub: "Danh mục Mod", createdAt: 1700000000000 } },
  nox_updates: { "-u1": { title: "Thêm APK mới", body: "Đã thêm vài APK mới vào kho.", ts: 1700000600000 } },
  nox_maintenance: { enabled: false },
  nox_notice: { title: "Chào mừng", body: "Đây là thông báo thử nghiệm.", enabled: true, updatedAt: 1700000500000 },
  nox_theme: { bgType: "none", bgData: "", audioData: "", audioName: "", api: { endpoint: "https://baconbypass.xyz", key: "SECRET-KEY-123" } }
};
export function fakeFirebaseSource(opts = {}) {
  const seed = opts.seed || SEED;
  return `${engineSrc}
;(function(){
const RULES=${rules}, SEED=${JSON.stringify(seed)}, DEV=${JSON.stringify(DEV_EMAIL)};
const E=RulesEngine.create(RULES), split=RulesEngine.split, getAt=RulesEngine.getAt, clone=RulesEngine.clone;
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
let root=LS.get('fb_db')||clone(SEED); LS.set('fb_db',root);
const accounts=LS.get('fb_accounts')||{
  [DEV]:{uid:'uDEV',email:DEV,pw:'devpass',verified:true,name:'Dev Minh'},
  'devunverified@x.io':{uid:'uDEV2',email:DEV,pw:'unverified',verified:false,name:'Dev Unverified'},
  'user@example.com':{uid:'uUSER',email:'user@example.com',pw:'userpass',verified:true,name:'Người Dùng'}};
const UNV='devunverified@x.io';
let cur=LS.get('fb_user'); const authSubs=new Set(); window.__fbLog={listeners:0,reads:[],denied:[]};
const mk=u=>u&&{uid:u.uid,isAnonymous:!!u.anon,email:u.email,emailVerified:!!u.verified,displayName:u.name||'',photoURL:'',providerData:[{providerId:u.provider||'password'}],metadata:{creationTime:'Mon, 01 Jan 2024 00:00:00 GMT',lastSignInTime:'Tue, 03 Nov 2026 10:00:00 GMT'},sendEmailVerification(){window.__verifySent=(window.__verifySent||0)+1;return Promise.resolve()},updateProfile(p){return later().then(()=>{if(p&&p.displayName!=null){cur.name=p.displayName;Object.keys(accounts).forEach(k=>{if(accounts[k].uid===cur.uid)accounts[k].name=p.displayName});LS.set('fb_accounts',accounts);LS.set('fb_user',cur);window.__nameSet=p.displayName}})},reload(){return later().then(()=>{const a=Object.values(accounts).find(x=>x.uid===cur.uid);if(a){cur.verified=!!a.verified;cur.email=a.email;LS.set('fb_user',cur)}})},getIdToken(f){return later().then(()=>{if(f)refreshTok();return 'fk.'+cur.uid+'.'+cur.authTime})},getIdTokenResult(f){return later().then(()=>{if(f)refreshTok();return{claims:Object.assign({auth_time:cur.authTime},cur.tok||{})}})}};
const A=()=>cur?{uid:cur.uid,token:cur.anon?{firebase:{sign_in_provider:'anonymous'}}:Object.assign({email:cur.email,email_verified:!!cur.verified,auth_time:cur.authTime,firebase:{sign_in_provider:cur.provider==='google.com'?'google.com':'password'}},cur.tok||{})}:null;
const err=(code,message)=>Object.assign(new Error(message||code),{code});
const later=(v,ms=15)=>new Promise(r=>setTimeout(()=>r(v),ms));
const sess=a=>Object.assign({},a,{authTime:Math.floor(Date.now()/1000),tok:Object.assign({},a.claims||{})});
function refreshTok(){const a=Object.values(accounts).find(x=>x.uid===cur.uid);cur.tok=Object.assign({},(a&&a.claims)||{});LS.set('fb_user',cur);relisten()}
function setUser(u){cur=u;LS.set('fb_user',u);authSubs.forEach(f=>f(mk(cur)));relisten();}
const authObj={get currentUser(){return mk(cur)},setPersistence(){return Promise.resolve()},
 onAuthStateChanged(cb){authSubs.add(cb);setTimeout(()=>cb(mk(cur)),30);return()=>authSubs.delete(cb)},
 async signInWithEmailAndPassword(e,p){await later();const key=Object.keys(accounts).find(k=>accounts[k].email===e&&accounts[k].pw===p)||(accounts[e]&&accounts[e].pw===p?e:null);
   if(!key)throw err('auth/invalid-credential');if(accounts[key].disabled)throw err('auth/user-disabled');setUser(sess(accounts[key]));return{user:mk(cur)}},
 async createUserWithEmailAndPassword(e,p){await later();if(accounts[e])throw err('auth/email-already-in-use');if(p.length<6)throw err('auth/weak-password');
   accounts[e]={uid:'u'+Math.random().toString(36).slice(2,8),email:e,pw:p,verified:false};LS.set('fb_accounts',accounts);setUser(sess(accounts[e]));return{user:mk(cur)}},
 async signInWithCredential(c){await later();const m={'google:dev':accounts[DEV],'google:user':accounts['user@example.com']}[c.t];if(!m)throw err('auth/invalid-credential');
   if(m.disabled)throw err('auth/user-disabled');setUser(sess(Object.assign({},m,{provider:'google.com'})));return{user:mk(cur)}},
 async signInAnonymously(){await later();if(window.__anonOff)throw err('auth/operation-not-allowed');setUser(sess({uid:'g'+Math.random().toString(36).slice(2,8),anon:true,email:null,name:''}));return{user:mk(cur)}},
 async verifyPasswordResetCode(c){await later();const o=(LS.get('fb_oob')||{})[c];if(!o||o.mode!=='resetPassword')throw err('auth/invalid-action-code');if(o.expired)throw err('auth/expired-action-code');return o.email},
 async confirmPasswordReset(c,pw){await later();const all=LS.get('fb_oob')||{},o=all[c];if(!o||o.mode!=='resetPassword')throw err('auth/invalid-action-code');if(o.expired)throw err('auth/expired-action-code');if(pw.length<6)throw err('auth/weak-password');const k=Object.keys(accounts).find(x=>accounts[x].email===o.email);accounts[k].pw=pw;LS.set('fb_accounts',accounts);delete all[c];LS.set('fb_oob',all);window.__pwReset=o.email},
 async applyActionCode(c){await later();const all=LS.get('fb_oob')||{},o=all[c];if(!o)throw err('auth/invalid-action-code');if(o.expired)throw err('auth/expired-action-code');const k=Object.keys(accounts).find(x=>accounts[x].email===o.email);if(!k)throw err('auth/invalid-action-code');
   if(o.mode==='verifyEmail'){accounts[k].verified=true}else if(o.mode==='verifyAndChangeEmail'){const a=accounts[k];delete accounts[k];a.email=o.newEmail;a.verified=true;accounts[o.newEmail]=a;window.__emailChanged=o.newEmail}else throw err('auth/invalid-action-code');
   LS.set('fb_accounts',accounts);delete all[c];LS.set('fb_oob',all)},
 async signOut(){await later(5);setUser(null)},
 async sendPasswordResetEmail(e){await later();if(!/^[^@\\s]+@[^@\\s]+$/.test(e))throw err('auth/invalid-email');window.__resetSent=e}};
const authFn=()=>authObj; authFn.Auth={Persistence:{LOCAL:'local'}}; authFn.GoogleAuthProvider={credential:t=>({t})};
const L=[];
const snap=segs=>{const v=getAt(root,segs);return{val:()=>clone(v),exists:()=>v!==null,key:segs[segs.length-1]||null}};
const fire=(l,force)=>{const v=JSON.stringify(getAt(root,l.segs));if(force||v!==l.last){l.last=v;try{l.cb(snap(l.segs))}catch(e){console.error(e)}}};
function relisten(){L.slice().forEach(l=>{if(!E.canRead(l.segs,A(),root)){L.splice(L.indexOf(l),1);window.__fbLog.listeners=L.length;window.__fbLog.denied.push('/'+l.segs.join('/'));l.err&&l.err(err('PERMISSION_DENIED','Permission denied'))}else fire(l)})}
const stamp=v=>v&&typeof v==='object'?(v['.sv']==='timestamp'?Date.now():Object.fromEntries(Object.entries(v).map(([k,x])=>[k,stamp(x)]))):v;
function commit(sets){return later().then(()=>{const r=E.write(sets,A(),root);if(!r.ok){window.__fbLog.denied.push(r.reason);throw err('PERMISSION_DENIED',r.reason)}root=r.root;LS.set('fb_db',root);relisten()})}
let pushN=0;
const ref=path=>{const segs=split(path);const R={key:segs[segs.length-1]||null,
 child:p=>ref(segs.concat(split(p)).join('/')),
 on(ev,cb,eb){window.__fbLog.reads.push('/'+segs.join('/'));if(!E.canRead(segs,A(),root)){window.__fbLog.denied.push('read /'+segs.join('/'));setTimeout(()=>eb&&eb(err('PERMISSION_DENIED','Permission denied')),5);return cb}
   const l={segs,cb,err:eb,last:null};L.push(l);window.__fbLog.listeners=L.length;setTimeout(()=>fire(l,true),window.__fbDelay||10);return cb},
 off(ev,cb){for(let i=L.length-1;i>=0;i--)if(L[i].segs.join('/')===segs.join('/')&&(!cb||L[i].cb===cb))L.splice(i,1);window.__fbLog.listeners=L.length},
 async once(){await later();if(!E.canRead(segs,A(),root))throw err('PERMISSION_DENIED');return snap(segs)},
 set(v){return commit([{segs,value:stamp(v)}])},
 update(o){return commit(Object.keys(o).map(k=>({segs:segs.concat(split(k)),value:stamp(o[k])})))},
 remove(){return commit([{segs,value:null}])},
 push(v){const k='-N'+(++pushN)+Date.now().toString(36);const c=ref(segs.concat(k).join('/'));return v===undefined?c:Object.assign(c.set(v),{key:k})}};
 if(segs.length&&segs[segs.length-1]===undefined)R.key=null;return R};
const dbObj={ref:p=>{if(p===undefined)p='';if(p==='.info/connected'){return{on(e,cb){setTimeout(()=>cb({val:()=>true}),10);return cb},off(){}}}return ref(p)}};
const dbFn=()=>dbObj; dbFn.ServerValue={TIMESTAMP:{'.sv':'timestamp'}};
const apps=[]; window.firebase={apps,initializeApp(c){apps.push({options:c});return apps[0]},app:()=>apps[0],auth:authFn,database:dbFn};
const findU=uid=>Object.values(accounts).find(a=>a.uid===uid);
const rec=a=>a?{uid:a.uid,email:a.email,displayName:a.name||'',disabled:!!a.disabled,customClaims:a.claims||{},providerData:[{providerId:a.provider||'password'}]}:null;
const mkOob=(mode,email,newEmail)=>{const o=LS.get('fb_oob')||{};const c='OOB'+Math.random().toString(36).slice(2,10);o[c]={mode,email,newEmail};LS.set('fb_oob',o);return 'https://x.firebaseapp.com/__/auth/action?mode='+mode+'&oobCode='+c};
const dbw=(p,v)=>{root=RulesEngine.setAt(root,split(p),v);LS.set('fb_db',root);relisten()};
const admin={getUser:uid=>rec(findU(uid)),getUserByEmail:e=>rec(accounts[e]||Object.values(accounts).find(a=>a.email===e)),
 setClaims(uid,c){const a=findU(uid);a.claims=c;LS.set('fb_accounts',accounts);if(cur&&cur.uid===uid){cur.claims=c;LS.set('fb_user',cur)}},
 updateUser(uid,p){const a=findU(uid);const q=Object.assign({},p);if('password' in q){q.pw=q.password;delete q.password}if('emailVerified' in q){q.verified=q.emailVerified;delete q.emailVerified}Object.assign(a,q);LS.set('fb_accounts',accounts)},
 revoke(uid){if(cur&&cur.uid===uid)setUser(null)},
 passwordOk(e,pw){const a=accounts[e];return !!a&&a.pw===pw},
 link(mode,email,newEmail){return mkOob(mode,email,newEmail)},
 expireAll(){const o=LS.get('fb_oob')||{};Object.keys(o).forEach(k=>o[k].expired=true);LS.set('fb_oob',o)},
 verify(tok){const m=/^fk\\.([^.]+)\\.(\\d+)$/.exec(tok||'');if(!m||!cur||cur.uid!==m[1])return null;return Object.assign({uid:cur.uid,email:cur.email,email_verified:!!cur.verified,auth_time:Number(m[2]),firebase:{sign_in_provider:cur.anon?'anonymous':(cur.provider==='google.com'?'google.com':'password')}},cur.tok||{})},
 db:{get:p=>{const v=getAt(root,split(p));return v===undefined?null:clone(v)},set:(p,v)=>dbw(p,v),update:(p,o)=>{Object.keys(o).forEach(k=>dbw(p+'/'+k,o[k]))},remove:p=>dbw(p,null)}};
window.__fb={admin,getDb:()=>clone(root),setDb(v){root=clone(v);LS.set('fb_db',root);relisten()},reset(){localStorage.removeItem('fb_db');localStorage.removeItem('fb_user');location.reload()}};
})();`;
}
export const GIS_STUB = `window.google={accounts:{id:{initialize(o){window.__gis=o},renderButton(el){el.innerHTML='<button type="button" id="gstub">Continue with Google</button>';el.querySelector('#gstub').onclick=()=>window.__gis.callback({credential:window.__gisCred||'google:dev'})}}}};`;
