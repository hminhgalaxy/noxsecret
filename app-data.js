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
  try{[firebase.database.Query,firebase.database.Reference].forEach(C=>{const o=C&&C.prototype&&C.prototype.once;if(o&&!o._t){const w=function(...a){return Promise.race([o.apply(this,a),new Promise((_,j)=>setTimeout(()=>j(Object.assign(new Error("db timeout"),{status:404})),8000))])};w._t=1;C.prototype.once=w}})}catch(e){}
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
/* ===== DỮ LIỆU: bài đăng, vote, World, nhóm chat, hòm thư, báo cáo, Dev Panel — toàn bộ chạy bằng Firebase Realtime Database =====
   Cấu trúc:
   pub/posts/{id}        bài đã đăng (nhẹ)          pub/postBody/{id}     ảnh thêm + code (nặng, tải khi mở bài)
   queue/{id}            bài chờ duyệt / bị ẩn      userPosts/{uid}/{id}  danh sách bài của tôi
   votes/{uid}/{id}      tim + sao của tôi          pub/games, pub/categories, pub/settings, pub/roles, pub/users, pub/names
   pub/world/posts, pub/world/replies               pub/groups, groupMembers, groupKeys, groupMsgs, userGroups
   dm/{uidA_uidB}        tin nhắn riêng             inboxIdx/{uid}/{otherUid}  danh sách hội thoại
   reports/{id}          báo cáo gửi dev */
const R=p=>fbDb.ref(p),TS=()=>firebase.database.ServerValue.TIMESTAMP;
const clean=o=>JSON.parse(JSON.stringify(o));
const clip=(s,n)=>String(s==null?"":s).slice(0,n);
const slug=s=>String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,20)||"x";
const snap=async p=>{const v=await Promise.race([R(p).once("value"),new Promise((_,j)=>setTimeout(()=>j(Object.assign(new Error("db timeout"),{status:404})),6000))]);return v.val()};
const kids=s=>{const a=[];s.forEach(c=>{const v=c.val();a.push(v&&typeof v==="object"?{id:c.key,...v}:{id:c.key,value:v})});return a};
const isDevEmail=()=>!!me&&String(me.email||"").toLowerCase()===DEV_EMAIL;
const isDevMe=()=>!!me&&(me.role==="dev"||isDevEmail());
const picRef=()=>me&&me.pic?(/^data:/.test(me.pic)?"u:"+me.userId:me.pic):"";
let rolesC=null;
async function loadRoles(){try{rolesC=(await dbGet("pub/roles"))||{}}catch(e){rolesC=rolesC||{}}return rolesC}
const roleOf=id=>rolesC&&rolesC[id]==="dev"?"dev":"";
const bump=(ref,d)=>ref.transaction(c=>Math.max(0,(c||0)+d));
const pairKey=(a,b)=>[a,b].sort().join("_");
async function pwHash(gid,pw){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(gid+":"+pw));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function stamped(path,obj){const ref=R(path).push();await ref.set(clean({...obj,createdAt:TS()}));const v=(await ref.once("value")).val();return{id:ref.key,...v}}
async function locate(id){
  let d=await snap("pub/posts/"+id);if(d)return{where:"pub",path:"pub/posts/"+id,data:d};
  try{d=await snap("queue/"+id)}catch(e){d=null}
  return d?{where:"queue",path:"queue/"+id,data:d}:null;
}
const upMeta=(aid,id,patch)=>R("userPosts/"+aid+"/"+id).update(clean(patch));
const slimUser=async id=>{const [p]=await Promise.all([snap("pub/users/"+id)]);return p?{userId:id,name:p.name,pic:p.pic?(/^data:/.test(p.pic)?"u:"+id:p.pic):"",role:roleOf(id)}:{userId:id,name:id,pic:"",role:""}};

async function savePost(b){
  const x=curUser(),dev=isDevMe();
  const title=clip(b.title,120).trim();if(!title)throw fbErr(400,t("f.needt"));
  const type=clip(b.type,40);if(!/^[\w-]+$/.test(type))throw fbErr(400,t("f.needcat"));
  const light={title,type,gameId:clip(b.gameId,40),desc:clip(b.desc,2000),thumb:imgSrc(b.thumb)?b.thumb:"",url:safeUrl(b.url)||"",dl:safeUrl(b.dl)||"",version:clip(b.version,30),tags:(Array.isArray(b.tags)?b.tags:[]).map(v=>clip(v,30)).filter(Boolean).slice(0,10),note:clip(b.note,300)};
  const body={images:(Array.isArray(b.images)?b.images:[]).filter(i=>imgSrc(i)).slice(0,4),code:clip(b.code,30000)};
  if(b.id){
    const loc=await locate(b.id);if(!loc)throw fbErr(404,t("e.404"));
    const p=loc.data;
    if(p.authorId!==x.uid&&!dev)throw fbErr(403,t("e.403"));
    if(p.locked&&!dev)throw fbErr(403,t("locked"));
    const patch={...light,updatedAt:TS()};
    let st=p.status;
    if(p.status==="rejected"&&!dev){patch.status="pending";st="pending"}
    await R(loc.path).update(clean(patch));
    await R("pub/postBody/"+b.id).set(clean(body));
    await upMeta(p.authorId,b.id,{title,type,status:st,updatedAt:TS()});
    return{id:b.id,message:t("f.sent")};
  }
  const mod=(await snap("pub/settings/moderation"))===true&&!dev;
  const ref=R(mod?"queue":"pub/posts").push(),id=ref.key;
  await ref.set(clean({...light,authorId:x.uid,authorName:me.name,authorPic:picRef(),createdAt:TS(),likeCount:0,ratingCount:0,ratingSum:0,views:0,status:mod?"pending":"published"}));
  const created=(await ref.once("value")).val();
  await R("pub/postBody/"+id).set(clean(body));
  await R("userPosts/"+x.uid+"/"+id).set(clean({title,type,status:created.status,createdAt:created.createdAt}));
  return{id,message:mod?t("f.pending"):t("f.sent")};
}
async function castVote(id,patch){
  const x=curUser(),vr=R("votes/"+x.uid+"/"+id),old=(await vr.once("value")).val()||{};
  const nv={liked:patch.liked!==undefined?patch.liked:!old.liked,stars:patch.stars!==undefined?patch.stars:(old.stars||0)};
  const pr=R("pub/posts/"+id);if(!(await pr.child("title").once("value")).exists())throw fbErr(404,t("e.404"));
  await vr.set(nv);
  const dl=(nv.liked?1:0)-(old.liked?1:0),ds=nv.stars-(old.stars||0),dc=(nv.stars?1:0)-(old.stars?1:0);
  if(dl)await bump(pr.child("likeCount"),dl);
  if(ds)await bump(pr.child("ratingSum"),ds);
  if(dc)await bump(pr.child("ratingCount"),dc);
  const p=await snap("pub/posts/"+id)||{};
  return{likeCount:p.likeCount||0,ratingCount:p.ratingCount||0,ratingSum:p.ratingSum||0,liked:nv.liked,stars:nv.stars};
}
const wFix=(p,uid)=>{const l=p.likes||{};const o={...p,liked:!!(uid&&l[uid]),likeCount:Object.keys(l).length,authorRole:roleOf(p.authorId)};delete o.likes;return o};

async function dataApi(path,method,body){
  const u=new URL(path,"http://x"),P=u.pathname,Q=u.searchParams,D=decodeURIComponent;let m;
  const M=r=>(m=P.match(r))!==null;
  const user=()=>{const x=curUser();if(!x||!me)throw fbErr(401,t("e.expired"));return x};
  const dev=()=>{user();if(!isDevMe())throw fbErr(403,t("e.403"))};
  body=body||{};
  /* đã đăng nhập Firebase nhưng hồ sơ chưa nạp (me rỗng) => nạp ngay để không bị kẹt "chưa đăng nhập" khi gửi bài/tin */
  if(fbAuth.currentUser&&!me&&!authBusy){try{me=await fbMe(fbAuth.currentUser);renderAuth()}catch(e){console.warn("[me]",e)}}

  /* ---------- bài đăng ---------- */
  if(method==="GET"&&M(/^\/posts\/([\w-]+)\/vote$/)){const v=(await snap("votes/"+user().uid+"/"+m[1]))||{};return{liked:!!v.liked,stars:v.stars||0}}
  if(method==="GET"&&M(/^\/posts\/([\w-]+)\/full$/)){
    const loc=await locate(m[1]);if(!loc)throw fbErr(404,t("e.404"));
    const b=(await snap("pub/postBody/"+m[1]))||{},full={id:m[1],...loc.data,...b,_bl:1};
    await liveAuthors([full]);return full;
  }
  if(method==="POST"&&M(/^\/posts\/([\w-]+)\/like$/)){user();return castVote(m[1],{})}
  if(method==="POST"&&M(/^\/posts\/([\w-]+)\/rate$/)){user();const s=Math.max(0,Math.min(5,Math.round(+body.stars||0)));return castVote(m[1],{stars:s})}
  if(method==="POST"&&P==="/posts"){user();return savePost(body)}
  if(method==="DELETE"&&M(/^\/posts\/([\w-]+)$/)){
    const x=user(),id=m[1],loc=await locate(id);if(!loc)throw fbErr(404,t("e.404"));
    if(loc.data.authorId!==x.uid&&!isDevMe())throw fbErr(403,t("e.403"));
    await R("pub/postBody/"+id).remove();await R("userPosts/"+loc.data.authorId+"/"+id).remove();await R(loc.path).remove();
    return{ok:true};
  }
  if(method==="GET"&&P==="/me/posts"){
    const x=user(),a=kids(await R("userPosts/"+x.uid).once("value"));
    a.sort((p,q)=>(q.createdAt||0)-(p.createdAt||0));return{posts:a};
  }
  if(method==="GET"&&P==="/me/likes"){
    const x=user(),v=(await snap("votes/"+x.uid))||{};
    const ids=Object.keys(v).filter(k=>v[k]&&v[k].liked).slice(0,60);
    const a=(await Promise.all(ids.map(id=>snap("pub/posts/"+id).then(d=>d?{id,...d}:null).catch(()=>null)))).filter(Boolean);
    await liveAuthors(a);a.sort((p,q)=>(q.createdAt||0)-(p.createdAt||0));return{posts:a};
  }
  if(method==="GET"&&M(/^\/users\/([^/]+)\/posts$/)){
    const a=kids(await R("pub/posts").orderByChild("authorId").equalTo(D(m[1])).once("value"));
    await liveAuthors(a);a.sort((p,q)=>(q.createdAt||0)-(p.createdAt||0));return{posts:a};
  }
  if(method==="POST"&&P==="/upload"){
    user();const d=body.data;
    if(typeof d!=="string"||d.length>700000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d))throw fbErr(400,t("img.bad"));
    return{id:d};
  }
  if(method==="POST"&&P==="/reports"){
    const x=user();
    await R("reports").push().set(clean({authorId:x.uid,authorName:me.name,kind:clip(body.kind,20),severity:clip(body.severity,10),text:clip(body.text||body.reason,1500),refType:clip(body.refType,20),refId:clip(body.refId,80),postId:clip(body.postId,80),createdAt:TS()}));
    return{ok:true};
  }

  /* ---------- Dev Panel ---------- */
  if(method==="GET"&&P==="/dev/posts"){
    dev();const st=Q.get("status");let a=kids(await R("queue").once("value"));
    if(st==="pending")a=a.filter(p=>p.status==="pending");
    else a=a.concat(kids(await R("pub/posts").orderByChild("createdAt").limitToLast(100).once("value")));
    a.sort((p,q)=>(q.createdAt||0)-(p.createdAt||0));return{posts:a};
  }
  if(method==="POST"&&M(/^\/dev\/posts\/([\w-]+)$/)){
    dev();const id=m[1];let loc=await locate(id);if(!loc)throw fbErr(404,t("e.404"));
    const aid=loc.data.authorId;
    if(body.status){
      const st=String(body.status);if(!["published","rejected","hidden","pending"].includes(st))throw fbErr(400,t("e.400"));
      const rec={...loc.data,status:st};if(st==="published")delete rec.rejectReason;else if(body.reason)rec.rejectReason=clip(body.reason,200);
      const toPub=st==="published",dest=(toPub?"pub/posts/":"queue/")+id;
      if(dest!==loc.path){await R(dest).set(clean(rec));await R(loc.path).remove()}else await R(dest).update({status:st});
      loc={path:dest};
      await upMeta(aid,id,{status:st,rejectReason:rec.rejectReason||null});
    }
    const f={};["featured","pinned","locked"].forEach(k=>{if(typeof body[k]==="boolean")f[k]=body[k]||null});
    if(Object.keys(f).length){await R(loc.path).update(f);if("locked"in f)await upMeta(aid,id,{locked:f.locked===null?null:true})}
    return{ok:true};
  }
  if(method==="GET"&&P==="/dev/games"){dev();const g=(await snap("pub/games"))||{};return{games:Object.entries(g).map(([id,v])=>({id,...v}))}}
  if(method==="POST"&&P==="/dev/games"){
    dev();const b=body;
    if(b.id){const d={};["name","img","desc","order","published"].forEach(k=>{if(b[k]!==undefined)d[k]=b[k]});await R("pub/games/"+b.id).update(clean(d));return{id:b.id,...d}}
    const name=clip(b.name,40).trim();if(!name)throw fbErr(400,t("e.400"));
    const id=slug(name)+"-"+Math.random().toString(36).slice(2,6),d={name,img:b.img||"",desc:clip(b.desc,200),order:+b.order||0,published:true};
    await R("pub/games/"+id).set(clean(d));return{id,...d};
  }
  if(method==="DELETE"&&M(/^\/dev\/games\/([\w-]+)$/)){dev();await R("pub/games/"+m[1]).remove();return{ok:true}}
  if(method==="POST"&&(P==="/categories"||M(/^\/dev\/categories\/([\w-]+)$/))){
    dev();const id=P==="/categories"?slug(body.name)+"-"+Math.random().toString(36).slice(2,5):m[1];
    const d={name:clip(body.name,24).trim(),img:body.img||"",actions:(body.actions&&body.actions.length?body.actions:["detail"]),hidden:!!body.hidden};
    if(!d.name)throw fbErr(400,t("e.400"));
    await R("pub/categories/"+id).set(clean(d));return{id,...d};
  }
  if(method==="DELETE"&&M(/^\/dev\/categories\/([\w-]+)$/)){dev();await R("pub/categories/"+m[1]).remove();return{ok:true}}
  if(method==="GET"&&P==="/dev/settings"){dev();return(await snap("pub/settings"))||{}}
  if(method==="POST"&&P==="/dev/settings"){
    dev();const d={moderation:!!body.moderation,announcement:clip(body.announcement,300),hiddenNav:body.hiddenNav||{}};
    await R("pub/settings").set(clean(d));return d;
  }
  if(method==="GET"&&P==="/dev/reports"){
    dev();const a=kids(await R("reports").once("value"));a.sort((p,q)=>(q.createdAt||0)-(p.createdAt||0));return{reports:a};
  }
  if(method==="DELETE"&&M(/^\/dev\/reports\/([\w-]+)$/)){dev();await R("reports/"+m[1]).remove();return{ok:true}}

  /* ---------- World: bài viết + trả lời ---------- */
  if(method==="GET"&&P==="/world/posts"){
    if(!rolesC)await loadRoles();
    const lim=Math.min(40,+Q.get("limit")||20),before=+Q.get("before")||0,uid=(curUser()||{}).uid;
    let q=R("pub/world/posts").orderByChild("createdAt");if(before)q=q.endAt(before-1);
    const a=kids(await q.limitToLast(lim).once("value")).reverse();
    await liveAuthors(a);
    return{posts:a.map(p=>wFix(p,uid))};
  }
  if(method==="POST"&&P==="/world/posts"){
    const x=user(),text=clip(body.text,1500).trim(),images=(Array.isArray(body.images)?body.images:[]).filter(i=>imgSrc(i)).slice(0,4);
    if(!text&&!images.length)throw fbErr(400,t("w.empty"));
    const p=await stamped("pub/world/posts",{text,images,authorId:x.uid,authorName:me.name,authorPic:picRef(),replyCount:0});
    return wFix(p,x.uid);
  }
  if(method==="DELETE"&&M(/^\/world\/posts\/([\w-]+)$/)){
    const x=user(),ow=await snap("pub/world/posts/"+m[1]+"/authorId");
    if(ow&&ow!==x.uid&&!isDevMe())throw fbErr(403,t("e.403"));
    await R("pub/world/replies/"+m[1]).remove().catch(()=>{});await R("pub/world/posts/"+m[1]).remove();return{ok:true};
  }
  if(method==="POST"&&M(/^\/world\/posts\/([\w-]+)\/like$/)){
    const x=user(),lr=R("pub/world/posts/"+m[1]+"/likes"),on=!!(await snap("pub/world/posts/"+m[1]+"/likes/"+x.uid));
    await lr.child(x.uid).set(on?null:true);
    const l=(await lr.once("value")).val()||{};return{liked:!on,likeCount:Object.keys(l).length};
  }
  if(method==="GET"&&M(/^\/world\/posts\/([\w-]+)\/replies$/)){
    if(!rolesC)await loadRoles();
    const a=kids(await R("pub/world/replies/"+m[1]).orderByChild("createdAt").limitToLast(100).once("value"));
    await liveAuthors(a);
    return{replies:a.map(r=>({...r,authorRole:roleOf(r.authorId)}))};
  }
  if(method==="POST"&&M(/^\/world\/posts\/([\w-]+)\/replies$/)){
    const x=user(),text=clip(body.text,500).trim(),images=(Array.isArray(body.images)?body.images:[]).filter(i=>imgSrc(i)).slice(0,4);
    if(!text&&!images.length)throw fbErr(400,t("w.empty"));
    const r=await stamped("pub/world/replies/"+m[1],{text,images,authorId:x.uid,authorName:me.name,authorPic:picRef()});
    await bump(R("pub/world/posts/"+m[1]+"/replyCount"),1);return{...r,authorRole:roleOf(x.uid)};
  }
  if(method==="DELETE"&&M(/^\/world\/posts\/([\w-]+)\/replies\/([\w-]+)$/)){
    const x=user(),ow=await snap("pub/world/replies/"+m[1]+"/"+m[2]+"/authorId");
    if(ow&&ow!==x.uid&&!isDevMe())throw fbErr(403,t("e.403"));
    await R("pub/world/replies/"+m[1]+"/"+m[2]).remove();await bump(R("pub/world/posts/"+m[1]+"/replyCount"),-1);return{ok:true};
  }

  /* ---------- World: nhóm chat ---------- */
  if(method==="GET"&&P==="/world/groups"){
    const x=curUser(),g=(await snap("pub/groups"))||{},j=x?((await snap("userGroups/"+x.uid))||{}):{};
    const a=Object.entries(g).map(([id,v])=>({id,...v,joined:!!j[id]}));
    a.sort((p,q)=>(q.createdAt||0)-(p.createdAt||0));return{groups:a};
  }
  if(method==="POST"&&P==="/world/groups"){
    const x=user(),name=clip(body.name,30).trim(),pw=clip(body.password,40);
    if(name.length<2)throw fbErr(400,t("g.nameshort"));
    const ref=R("pub/groups").push(),id=ref.key;
    await ref.set(clean({name,desc:clip(body.desc,100),img:imgSrc(body.img)?body.img:"",ownerId:x.uid,createdAt:TS(),locked:!!pw,memberCount:1}));
    let mv=true;if(pw){mv=await pwHash(id,pw);await R("groupKeys/"+id).set(mv)}
    await R("groupMembers/"+id+"/"+x.uid).set(mv);await R("userGroups/"+x.uid+"/"+id).set(true);
    return{id,...(await ref.once("value")).val()};
  }
  if(method==="POST"&&M(/^\/world\/groups\/([\w-]+)\/join$/)){
    const x=user(),id=m[1],g=await snap("pub/groups/"+id);if(!g)throw fbErr(404,t("e.404"));
    const had=await R("groupMembers/"+id+"/"+x.uid).once("value").then(s=>s.exists()).catch(()=>false);
    if(!had){
      const mv=g.locked?await pwHash(id,clip(body.password,40)):true;
      try{await R("groupMembers/"+id+"/"+x.uid).set(mv)}catch(e){throw fbErr(403,t("g.wrongpw"))}
      await bump(R("pub/groups/"+id+"/memberCount"),1);
    }
    await R("userGroups/"+x.uid+"/"+id).set(true);return{ok:true};
  }
  if(method==="GET"&&M(/^\/world\/groups\/([\w-]+)\/messages$/)){
    user();const id=m[1],after=+Q.get("after")||0;
    let q=R("groupMsgs/"+id).orderByChild("createdAt");q=after?q.startAt(after+1):q.limitToLast(100);
    const a=kids(await q.once("value"));
    const g=await snap("pub/groups/"+id);
    return{group:g?{name:g.name,desc:g.desc,img:g.img,locked:g.locked,memberCount:g.memberCount||0}:null,messages:a};
  }
  if(method==="POST"&&M(/^\/world\/groups\/([\w-]+)\/messages$/)){
    const x=user(),text=clip(body.text,1000).trim(),images=(Array.isArray(body.images)?body.images:[]).filter(i=>imgSrc(i)).slice(0,4);
    if(!text&&!images.length)throw fbErr(400,t("w.empty"));
    return stamped("groupMsgs/"+m[1],{text,images,authorId:x.uid,authorName:me.name,authorPic:picRef()});
  }
  if(method==="POST"&&M(/^\/world\/groups\/([\w-]+)\/leave$/)){
    const x=user(),id=m[1];
    await R("groupMembers/"+id+"/"+x.uid).remove();await R("userGroups/"+x.uid+"/"+id).remove();await bump(R("pub/groups/"+id+"/memberCount"),-1);return{ok:true};
  }
  if(method==="POST"&&M(/^\/world\/groups\/([\w-]+)\/password$/)){
    const x=user(),id=m[1],pw=clip(body.password,40);
    if((await snap("pub/groups/"+id+"/ownerId"))!==x.uid&&!isDevMe())throw fbErr(403,t("e.403"));
    if(pw)await R("groupKeys/"+id).set(await pwHash(id,pw));else await R("groupKeys/"+id).remove();
    await R("pub/groups/"+id).update({locked:!!pw});return{ok:true};
  }
  if(method==="DELETE"&&M(/^\/world\/groups\/([\w-]+)$/)){
    const x=user(),id=m[1];
    if((await snap("pub/groups/"+id+"/ownerId"))!==x.uid&&!isDevMe())throw fbErr(403,t("e.403"));
    await R("groupKeys/"+id).remove();await R("groupMsgs/"+id).remove();await R("groupMembers/"+id).remove();await R("pub/groups/"+id).remove();return{ok:true};
  }

  /* ---------- Hòm thư ---------- */
  if(method==="GET"&&P==="/inbox/unread"){
    const x=user(),v=(await snap("inboxIdx/"+x.uid))||{};return{unread:Object.values(v).reduce((n,e)=>n+((e&&e.unread)||0),0)};
  }
  if(method==="GET"&&P==="/inbox"){
    if(!rolesC)await loadRoles();
    const x=user(),v=(await snap("inboxIdx/"+x.uid))||{};
    const th=Object.entries(v).map(([id,e])=>({withId:id,withName:e.withName||id,withPic:e.withPic||"",withRole:roleOf(id),last:e.last||"",lastAt:e.lastAt||0,unread:e.unread||0}));
    th.sort((a,b)=>b.lastAt-a.lastAt);return{threads:th,unread:th.reduce((n,e)=>n+e.unread,0)};
  }
  if(method==="GET"&&M(/^\/inbox\/([^/]+)$/)){
    if(!rolesC)await loadRoles();
    const x=user(),other=D(m[1]);
    const ms=kids(await R("dm/"+pairKey(x.uid,other)).orderByChild("createdAt").limitToLast(200).once("value"));
    const ir=R("inboxIdx/"+x.uid+"/"+other);
    if((await ir.child("unread").once("value")).val())await ir.child("unread").set(0);
    return{with:await slimUser(other),messages:ms};
  }
  if(method==="POST"&&P==="/inbox/send"){
    const x=user(),to=clip(body.toId,60),text=clip(body.text,1000).trim();
    if(!text||!to||to===x.uid)throw fbErr(400,t("e.400"));
    const msg=await stamped("dm/"+pairKey(x.uid,to),{text,authorId:x.uid,authorName:me.name,authorPic:picRef()});
    const other=await slimUser(to);
    await R("inboxIdx/"+x.uid+"/"+to).set(clean({withName:other.name,withPic:other.pic,last:text.slice(0,80),lastAt:msg.createdAt,unread:0}));
    await R("inboxIdx/"+to+"/"+x.uid).transaction(c=>({withName:me.name,withPic:picRef(),last:text.slice(0,80),lastAt:msg.createdAt,unread:((c&&c.unread)||0)+1}));
    return msg;
  }
  return undefined;
}
/* Điểm vào duy nhất: thử xử lý bằng Firebase; nếu không có route thì trả undefined để api() gọi backend dự phòng */
async function localApi(path,method,body){
  try{
    let r=await authApi(path,method,body);
    if(r===undefined){if(!fbInit())throw fbErr(0,t("fb.noload"));r=await dataApi(path,method,body)}
    return r;
  }catch(e){
    if(e&&e.status!==undefined)throw e;
    console.warn("[data]",method,path,e);
    const c=String((e&&e.code)||"")+" "+String((e&&e.message)||"");
    if(/permission[_ -]?denied/i.test(c))throw fbErr(403,t("fb.rules")+" ("+method+" "+String(path).split("?")[0]+")");
    if(/network|offline|disconnect/i.test(c)){const er=fbErr(0,t("e.gen"));er.net=true;throw er}
    throw fbErr(0,(e&&e.message)||t("e.gen"));
  }
}
async function api(path,method="GET",body){
  let L;
  try{L=await localApi(path,method,body)}
  catch(e){
    if(e&&e.status===401&&me&&!path.startsWith("/auth/")&&!(fbAuth&&fbAuth.currentUser)&&!(me&&me.google)){me=null;myVotes={};setUnread(0);renderAuth()}
    throw e;
  }
  if(L!==undefined)return L;
  let r;
  try{r=await fetch(API+path,{method,credentials:"include",headers:{"Content-Type":"application/json","X-Skibidi":"1"},body:body?JSON.stringify(body):undefined})}
  catch(e){console.warn("[api] network",method,path,e);const er=new Error(t("e.gen"));er.net=true;throw er}
  const raw=await r.text();let j=null;try{j=JSON.parse(raw)}catch(e){}
  if(!r.ok)console.warn("[api]",method,path,r.status,raw.slice(0,300));
  if(r.status===401&&me&&!path.startsWith("/auth/")){me=null;myVotes={};setUnread(0);renderAuth();throw new Error(t("e.expired"))}
  if(!r.ok){
    const sv=j&&j.error?String(j.error):"";let m;
    if(r.status>=500)m=t("e.server")+(sv?" ("+sv+")":" ["+r.status+"]");
    else if(r.status===404&&!j)m=t("e.unavail");
    else{m=t("e."+r.status)!=="e."+r.status?t("e."+r.status):t("e.code",r.status);m+=sv?": "+sv:""}
    const er=new Error(m);er.status=r.status;throw er;
  }
  if(j===null){const er=new Error(t("e.bad"));er.status=502;throw er}
  return j;
}

