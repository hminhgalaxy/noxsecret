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
const snap=async p=>{const v=await Promise.race([R(p).once("value"),new Promise((_,j)=>setTimeout(()=>j(Object.assign(new Error("db timeout"),{status:404})),5000))]);return v.val()};
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
  const user=()=>{const x=curUser();if(!x||!me)throw fbErr(401,t("e.expired"));
    /* đăng nhập Google chỉ để xem: muốn ghi dữ liệu cần kích hoạt tài khoản (cửa sổ riêng) */
    if(me.google&&!(fbAuth&&fbAuth.currentUser)){const er=fbErr(401,t("act.need"));er.need=true;throw er}
    return x};
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
    if(e&&e.need&&method!=="GET")openActivate();
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
;(window.__ok=window.__ok||[]).push("app-api.js");
