/* ===== DỮ LIỆU ===== */
async function dbGet(path,qs=""){
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),8000);
  const r=await fetch(DB_URL+"/"+path+".json"+qs,{signal:ac.signal}).finally(()=>clearTimeout(tm));
  if(!r.ok){const er=new Error("db "+r.status+" "+path);er.status=r.status;throw er}
  return r.json();
}
/* ===== FIREBASE AUTH: đăng ký / đăng nhập / Google / hồ sơ chạy thẳng trên trình duyệt (không cần backend /api) =====
   Dữ liệu hồ sơ: pub/users/{uid} = {name,pic,bio,createdAt} · pub/names/{tênviếtthường} = uid · pub/roles/{uid} = "dev" (chỉ sửa trong Console) */
let fbAuth=null,fbDb=null,srvOff=0,authBusy=0;
const NAME_CD=7*864e5,srvNow=()=>Date.now()+srvOff;
/* Mọi thao tác đăng nhập chạy trong busy(); xong là tự đối chiếu lại phiên Firebase => dù API báo lỗi giữa chừng
   (ví dụ ghi hồ sơ bị chặn) mà Firebase đã đăng nhập thì giao diện vẫn vào đúng tài khoản, không cần tải lại trang */
const busy=async f=>{authBusy++;try{return await f()}finally{authBusy--;setTimeout(()=>syncAuth(),0)}};
/* ===== Phiên Google: độc lập hoàn toàn với Firebase Auth (do login.html lưu trong localStorage) ===== */
const GKEY="skibidi_google_session";
function googleSession(){try{const s=JSON.parse(localStorage.getItem(GKEY));return s&&s.sub&&s.exp>Date.now()?s:null}catch(e){return null}}
async function googleMe(s){
  const id="g_"+s.sub;let p=null;try{p=await Promise.race([rdb("pub/users/"+id),new Promise(r=>setTimeout(()=>r(null),4000))])}catch(e){}
  return{userId:id,name:(p&&p.name)||s.name||(s.email||"user").split("@")[0],pic:(p&&p.pic)||s.picture||"",bio:(p&&p.bio)||"",handle:(p&&p.handle)||"",handleSet:!!(p&&(p.handleSet||p.handle)),nameChangedAt:(p&&p.nameChangedAt)||0,role:"user",email:s.email||"",createdAt:(p&&p.createdAt)||0,hasPassword:false,googleLinked:true,google:true};
}
/* người dùng hiện tại cho thao tác dữ liệu: Firebase (email) hoặc Google */
const curUser=()=>(me&&me.google?{uid:me.userId}:null)||(fbAuth&&fbAuth.currentUser)||null;
let syncSeq=0;
async function syncAuth(silent){
  if(!fbAuth||authBusy||(me&&me.google))return;
  const u=fbAuth.currentUser,seq=++syncSeq;
  try{
    if(!u){if(me){me=null;myVotes={};setUnread(0);renderAuth();if(["mine","liked","inbox"].includes(view))go("");else show(view,viewArg,true)}return}
    if(me&&me.userId===u.uid)return;
    const m=await fbMe(u);
    if(seq!==syncSeq||fbAuth.currentUser!==u||authBusy)return;
    me=m;if(silent){renderAuth();pollUnread()}else afterAuth();
  }catch(e){console.warn("[auth]",e)}
}
/* SDK Firebase tải lỗi (mạng chập chờn) => tự tải lại vài lần thay vì chết cả web */
const loadScript=src=>new Promise(r=>{const s=document.createElement("script");s.src=src;s.onload=()=>r(true);s.onerror=()=>r(false);document.head.appendChild(s)});
const sdkOk=()=>!!(window.firebase&&firebase.initializeApp&&firebase.auth&&firebase.database);
async function ensureSdk(){
  for(let i=0;i<3&&!sdkOk();i++){
    for(const n of ["app","auth","database"]){
      const has=n==="app"?window.firebase&&firebase.initializeApp:window.firebase&&firebase[n];
      if(!has)await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-"+n+"-compat.js?r="+i);
    }
  }
  return sdkOk();
}
/* Realtime Database nằm ở khu vực nào cũng được: dò URL đúng (.firebaseio.com hoặc *.firebasedatabase.app) rồi mới khởi tạo */
async function pickDb(){
  const pid=firebaseConfig.projectId,c=[firebaseConfig.databaseURL];
  ["asia-southeast1","europe-west1","us-central1"].forEach(r=>c.push("https://"+pid+"-default-rtdb."+r+".firebasedatabase.app"));
  c.push("https://"+pid+"-default-rtdb.firebaseio.com");
  const list=[...new Set(c)].filter(Boolean);
  const probe=u=>new Promise((ok,no)=>{const ac=new AbortController(),tm=setTimeout(()=>{ac.abort();no()},2500);fetch(u+"/pub/roles.json?shallow=true",{signal:ac.signal}).then(r=>{clearTimeout(tm);(r.ok||r.status===401)?ok(u):no()}).catch(()=>{clearTimeout(tm);no()})});
  try{const u=await probe(list[0]);DB_URL=u;firebaseConfig.databaseURL=u;return u}catch(e){}
  try{const u=await Promise.any(list.slice(1).map(probe));DB_URL=u;firebaseConfig.databaseURL=u;return u}catch(e){}
  return DB_URL;
}
function fbInit(){
  if(fbAuth)return true;
  if(!sdkOk()||!firebaseConfig.apiKey)return false;
  if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
  fbAuth=firebase.auth();fbDb=firebase.database();
  /* mọi lượt đọc database đều có hạn chót: mạng/database lỗi => coi như chưa có dữ liệu, không bao giờ quay mãi */
  try{[firebase.database.Query,firebase.database.Reference].forEach(C=>{const o=C&&C.prototype&&C.prototype.once;if(o&&!o._t){const w=function(...a){return Promise.race([o.apply(this,a),new Promise((_,j)=>setTimeout(()=>j(Object.assign(new Error("db timeout"),{status:404})),5000))])};w._t=1;C.prototype.once=w}})}catch(e){}
  try{fbDb.ref(".info/serverTimeOffset").on("value",s=>{srvOff=+s.val()||0})}catch(e){}return true;
}
const fbErr=(status,msg)=>{const e=new Error(msg);e.status=status;return e};
function mapFb(e,google){
  const c=(e&&e.code)||"";console.warn("[firebase]",c,e&&e.message);
  if(google&&["auth/invalid-credential","auth/invalid-oauth-client-id","auth/invalid-idp-response","auth/argument-error"].includes(c)){const er=fbErr(403,t("fb.google"));er.google=true;return er}
  if(["auth/invalid-credential","auth/wrong-password","auth/user-not-found","auth/invalid-login-credentials","auth/invalid-email"].includes(c))return fbErr(401,t("auth.wrong"));
  if(["auth/email-already-in-use","auth/credential-already-in-use","auth/provider-already-linked"].includes(c))return fbErr(409,t("auth.exists"));
  if(c==="auth/account-exists-with-different-credential")return fbErr(409,t("fb.diff"));
  if(c==="auth/too-many-requests")return fbErr(429,t("e.429"));
  if(c==="auth/configuration-not-found"||c==="auth/api-key-not-valid"||c==="auth/invalid-api-key")return fbErr(403,t("fb.config"));
  if(c==="auth/unauthorized-domain")return fbErr(403,t("fb.domain"));
  if(c==="auth/popup-closed-by-user"||c==="auth/popup-blocked"||c==="auth/cancelled-popup-request")return fbErr(0,t("g.popup.closed"));
  if(c==="auth/network-request-failed")return fbErr(0,t("e.gen"));
  if(c==="auth/operation-not-allowed")return fbErr(403,t("fb.off"));
  if(c==="auth/user-disabled")return fbErr(403,t("e.403"));
  if(c==="auth/requires-recent-login")return fbErr(401,t("fb.recent"));
  if(c==="auth/weak-password")return fbErr(400,t("v.pw.weak"));
  return fbErr(0,(e&&e.message)||t("e.gen"));
}
/* Đọc bằng SDK (có kèm phiên đăng nhập) trước, REST chỉ là dự phòng => tên/ảnh luôn tải đúng ngay sau khi đăng nhập */
const rdb=async p=>{try{return await snap(p)}catch(e){return dbGet(p).catch(()=>null)}};
/* đọc có phân biệt "không có dữ liệu" (ok, null) với "đọc lỗi" (ok=false) — để lỗi mạng không bao giờ làm ghi đè hồ sơ thật */
const readNode=async p=>{try{return{ok:true,v:await snap(p)}}catch(e){try{return{ok:true,v:await dbGet(p)}}catch(e2){return{ok:false,v:null}}}};
/* Hồ sơ "sống": tên/ảnh hiện tại của tác giả lấy thẳng từ Realtime Database, nên đổi tên/ảnh là mọi bài cũ đổi theo */
const liveC={};
const bustUser=()=>{if(me){delete liveC[me.userId];delete picC[me.userId]}};
function liveUser(id){
  const c=liveC[id];if(c&&Date.now()-c.t<300000)return c.p;
  const p=rdb("pub/users/"+id).then(v=>v&&typeof v==="object"?{name:v.name||"",pic:v.pic?(/^data:/.test(v.pic)?"u:"+id:v.pic):""}:null).catch(()=>null);
  liveC[id]={t:Date.now(),p};return p;
}
async function liveAuthors(arr){
  const ids=[...new Set((arr||[]).map(x=>x&&x.authorId).filter(Boolean))].slice(0,80);
  if(!ids.length)return arr;
  const res=await Promise.race([Promise.all(ids.map(async id=>[id,await liveUser(id)])),new Promise(r=>setTimeout(()=>r([]),2000))]);
  const m=Object.fromEntries(res);
  arr.forEach(x=>{const u=x&&m[x.authorId];if(u){if(u.name)x.authorName=u.name;x.authorPic=u.pic}});
  return arr;
}
/* Tài khoản chưa có hồ sơ (ghi lỗi lúc đăng ký…) => tự tạo (chỉ khi thật sự chưa có) để không bao giờ "không tìm thấy người dùng" */
async function ensureProfile(u){
  const viaPw=u.providerData.some(x=>x.providerId==="password");
  const raw=(viaPw?u.displayName:null)||(u.email||"").split("@")[0]||u.displayName||"user";
  let base=raw.replace(/[^\p{L}\p{N}_]/gu,"_").slice(0,18);
  if(base.length<3)base=(base+"user").slice(0,18);
  let name=base,ok=false;
  for(let i=0;i<6&&!ok;i++){
    if(i)name=base.slice(0,14)+Math.floor(1000+Math.random()*9000);
    try{if(!await nameFree(name,u.uid))continue;await claimName(name,u.uid);ok=true}catch(e){if(e&&e.status&&e.status!==409)break}
  }
  const d={name:ok?name:base,pic:u.photoURL||"",bio:"",createdAt:srvNow()};
  try{const r=await fbDb.ref("pub/users/"+u.uid).transaction(c=>c||d);const v=r&&r.snapshot&&r.snapshot.val();return v&&typeof v==="object"?v:d}
  catch(e){console.warn("[profile]",e);return d}
}
/* fbMe KHÔNG BAO GIỜ ném lỗi: dù đọc/ghi hồ sơ trục trặc, tài khoản đã đăng nhập vẫn vào được và mở được hồ sơ */
async function fbMe(u){
  let p=null,r=null;
  try{
    const [pr,rr]=await Promise.all([readNode("pub/users/"+u.uid),readNode("pub/roles/"+u.uid)]);
    r=rr.v;p=pr.v;
    if(pr.ok&&!p)p=await ensureProfile(u);
  }catch(e){console.warn("[me]",e)}
  const pv=u.providerData.map(x=>x.providerId);
  return{userId:u.uid,name:(p&&p.name)||u.displayName||(u.email||"user").split("@")[0],pic:(p&&p.pic)||u.photoURL||"",bio:(p&&p.bio)||"",handle:(p&&p.handle)||"",handleSet:!!(p&&(p.handleSet||p.handle)),nameChangedAt:(p&&p.nameChangedAt)||0,role:r==="dev"?"dev":"user",email:u.email||"",createdAt:(p&&p.createdAt)||0,hasPassword:pv.includes("password"),googleLinked:pv.includes("google.com")};
}
/* Hồ sơ công khai của bất kỳ người dùng nào (nhận uid hoặc ID tùy chỉnh). Không bao giờ báo "không tìm thấy". */
async function guessUser(id){
  if(me&&me.userId===id)return me;
  const hit=[...Object.values(curPosts),...wList].find(p=>p&&p.authorId===id&&p.authorName);
  if(hit)return{name:hit.authorName,pic:hit.authorPic};
  if(fbInit())for(const path of ["pub/posts","pub/world/posts"]){
    try{const a=kids(await R(path).orderByChild("authorId").equalTo(id).limitToFirst(1).once("value"));if(a[0]&&a[0].authorName)return{name:a[0].authorName,pic:a[0].authorPic}}catch(e){}
  }
  return{};
}
async function profileOf(x){
  if(me&&me.google&&me.userId===x)return{userId:me.userId,name:me.name,pic:me.pic,bio:me.bio,handle:me.handle,role:isDevMe()?"dev":"user",createdAt:me.createdAt||0};
  let id=x,p=await rdb("pub/users/"+x);
  if(!p){
    /* không phải uid => thử ID tùy chỉnh (@id), rồi tên đăng nhập */
    const k=String(x).replace(/^@/,"").toLowerCase();
    const h=/^[a-z0-9_]{3,20}$/.test(k)?await rdb("pub/handles/"+k):null;
    const n=!h&&k&&!/[.$#\[\]\/]/.test(k)?await rdb("pub/names/"+k):null;
    const hit=typeof h==="string"&&h?h:typeof n==="string"&&n?n:"";
    if(hit){id=hit;p=await rdb("pub/users/"+hit)}
  }
  const r=await rdb("pub/roles/"+id),role=r==="dev"?"dev":"user";
  if(p)return{userId:id,name:p.name||t("p.unknown"),pic:p.pic||"",bio:p.bio||"",handle:p.handle||"",role,createdAt:p.createdAt||0};
  const f=await guessUser(id);
  return{userId:id,name:f.name||t("p.unknown"),pic:f.pic||"",bio:"",handle:"",role,createdAt:0};
}
const nameKey=n=>"pub/names/"+encodeURIComponent(String(n).toLowerCase());
async function nameFree(n,uid){const v=await dbGet(nameKey(n)).catch(()=>null);return !v||v===uid}
async function claimName(n,uid){
  try{await fbDb.ref("pub/names/"+String(n).toLowerCase()).set(uid)}catch(e){
    if(await nameFree(n,uid))throw fbErr(403,t("fb.rules"));
    throw fbErr(409,t("auth.nametaken"));
  }
}
async function authApi(path,method,body){
  const k=method+" "+path;
  const um=path.match(/^\/users\/([^/]+)$/);
  if(!(k==="POST /me/link-popup"||k==="POST /auth/logout"||k==="GET /me"||k==="POST /me/link-google"||k==="POST /me/profile"||k==="POST /me/name"||k==="POST /me/handle"||k==="POST /me/password"||(method==="GET"&&um)))return undefined;
  if(um)return profileOf(decodeURIComponent(um[1]));
  if(!fbInit())throw fbErr(0,t("fb.noload"));
  const u=fbAuth.currentUser;
  if(!u&&me&&me.google&&method!=="GET"&&k!=="POST /auth/logout"){const er=fbErr(401,t("act.need"));er.need=true;openActivate();throw er}
  switch(k){
    case "POST /auth/logout":await fbAuth.signOut();return{ok:true};
  }
  if(!u)throw fbErr(401,t("e.expired"));
  switch(k){
    case "GET /me":return fbMe(u);
    case "POST /me/link-popup":
      try{await u.linkWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){throw mapFb(e)}
      await u.reload();return fbMe(fbAuth.currentUser);
    case "POST /me/link-google":
      try{await u.linkWithCredential(firebase.auth.GoogleAuthProvider.credential(body.credential))}catch(e){throw mapFb(e,true)}
      await u.reload();return fbMe(fbAuth.currentUser);
    case "POST /me/profile":{
      const d={bio:String(body.bio||"").slice(0,200),pic:body.pic||""};
      try{await fbDb.ref("pub/users/"+u.uid).update(d)}catch(e){throw fbErr(403,t("fb.rules"))}
      return d;
    }
    case "POST /me/name":{
      const n=String(body.name||"").trim(),old=me&&me.name;
      /* chỉ được đổi tên 7 ngày một lần (đọc mốc thời gian từ server, không tin dữ liệu trên máy) */
      const prev=+(await rdb("pub/users/"+u.uid+"/nameChangedAt"))||0;
      if(prev&&prev+NAME_CD>srvNow())throw fbErr(429,t("s.name.cool",new Date(prev+NAME_CD).toLocaleString(loc())));
      if(!await nameFree(n,u.uid))throw fbErr(409,t("n.taken"));
      await claimName(n,u.uid);
      const diff=!old||old.toLowerCase()!==n.toLowerCase();
      try{await fbDb.ref("pub/users/"+u.uid).update({name:n,nameChangedAt:TS()})}
      catch(e){if(diff)fbDb.ref("pub/names/"+n.toLowerCase()).remove().catch(()=>{});throw fbErr(403,t("fb.rules"))}
      if(old&&diff)fbDb.ref("pub/names/"+old.toLowerCase()).remove().catch(()=>{});
      try{await u.updateProfile({displayName:n})}catch(e){}
      return{name:n,nameChangedAt:srvNow()};
    }
    case "POST /me/handle":{
      /* ID tùy chỉnh: đặt tùy thích nhưng chỉ 1 lần duy nhất, sau đó khóa vĩnh viễn */
      const h=String(body.handle||"").trim().replace(/^@/,""),lk=h.toLowerCase(),er=vHandle(h);
      if(er)throw fbErr(400,er);
      const cur=await rdb("pub/users/"+u.uid);
      if(cur&&(cur.handleSet||cur.handle))throw fbErr(403,t("s.id.locked"));
      let res;try{res=await fbDb.ref("pub/handles/"+lk).transaction(c=>c?undefined:u.uid)}catch(e){throw fbErr(403,t("fb.rules"))}
      if(!res.committed||res.snapshot.val()!==u.uid)throw fbErr(409,t("s.id.taken"));
      try{await fbDb.ref("pub/users/"+u.uid).update({handle:h,handleSet:true})}
      catch(e){fbDb.ref("pub/handles/"+lk).remove().catch(()=>{});throw fbErr(403,t("fb.rules"))}
      return{handle:h,handleSet:true};
    }
    case "POST /me/password":
      /* bắt buộc nhập đúng mật khẩu đang dùng (nếu tài khoản có mật khẩu) và mật khẩu mới phải khác */
      if(me&&me.hasPassword!==false){
        if(!body.current)throw fbErr(401,t("s.pass.wrong"));
        if(body.current===body.password)throw fbErr(400,t("s.pass.same"));
      }
      try{
        if(me&&me.hasPassword!==false){
          await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,body.current||""));
          await u.updatePassword(body.password);
        }else await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,body.password));
      }catch(e){throw mapFb(e)}
      return{ok:true};
  }
}
;(window.__ok=window.__ok||[]).push("app-firebase.js");
