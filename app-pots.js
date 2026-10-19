/* ===== GAME ===== */
async function loadGames(){
  const el=$("games");if(view==="games")region(el,"loading");
  try{
    games=(await dbGet("pub/games"))||{};
    const pg=$("fpGame"),pv=pg.value,ids=gameIds();
    pg.innerHTML=`<option value="">${esc(t("f.nogame"))}</option>`+ids.map(i=>`<option value="${esc(i)}">${esc(games[i].name)}</option>`).join("");pg.value=pv;
    renderGames();if(all.length&&view==="home")renderPosts();
  }catch(e){if(gone(e)){games={};renderGames();return}region(el,"error",e,loadGames)}
}
const gameIds=()=>Object.keys(games).filter(i=>games[i]&&games[i].published!==false).sort((a,b)=>(games[a].order||0)-(games[b].order||0));
function renderGames(){
  const el=$("games"),ids=gameIds();
  if(!ids.length)return region(el,"empty",t("games.none"));
  region(el,"success");
  el.innerHTML=ids.map(i=>`<div class="card" tabindex="0" onkeydown="if(event.key==='Enter')this.click()" onclick="go('g/'+${jsq(i)})"><div class="th" style="${bgs(games[i].img)}"></div><div class="cb"><span class="ti">${esc(games[i].name)}</span><p class="ds">${esc(games[i].desc||"")}</p></div></div>`).join("");
}

/* ===== DANH SÁCH BÀI ===== */
async function loadPosts(silent){
  const el=$("posts"),k=curGame+"|"+curType+"|"+limit;loadKey=k;
  if(!(silent&&all.length))region(el,"loading");
  renderHead();
  try{
    let qs=`?orderBy="createdAt"&limitToLast=${limit}`;
    if(curGame)qs=`?orderBy="gameId"&equalTo=${JSON.stringify(curGame)}&limitToLast=${limit}`;
    else if(curType)qs=`?orderBy="type"&equalTo=${JSON.stringify(curType)}&limitToLast=${limit}`;
    let d;
    try{d=await dbGet("pub/posts",qs)}
    catch(e){
      /* Firebase báo lỗi 400 khi chưa khai báo ".indexOn" cho createdAt/type/gameId.
         Thử lại bằng truy vấn theo khóa (không cần index) và lọc ở phía trình duyệt. */
      if(e.status!==400)throw e;
      d=await dbGet("pub/posts",`?orderBy="$key"&limitToLast=${limit*4}`);
    }
    d=d||{};
    if(k!==loadKey)return;
    all=Object.entries(d).filter(([,v])=>v&&typeof v==="object").map(([id,v])=>({id,...v}));
    await liveAuthors(all);if(k!==loadKey)return;
    renderPosts();
  }catch(e){if(k!==loadKey)return;if(gone(e)){all=[];renderPosts();return}region(el,"error",e,()=>loadPosts())}
}
function filtered(){
  const q=$("q").value.trim().toLowerCase();
  const a=q?all.filter(p=>[p.title,p.desc,p.authorName,(games[p.gameId]||{}).name,catName(p.type),(p.tags||[]).join(" ")].join(" ").toLowerCase().includes(q)):all.filter(p=>(!curType||p.type===curType)&&(!curGame||p.gameId===curGame));
  const cmp=sortBy==="views"?(x,y)=>(y.views||0)-(x.views||0):sortBy==="likes"?(x,y)=>(y.likeCount||0)-(x.likeCount||0):(x,y)=>(y.pinned?1:0)-(x.pinned?1:0)||y.createdAt-x.createdAt;
  return a.sort(cmp);
}
function cardHtml(p){
  const g=games[p.gameId],n=p.ratingCount||0;
  return `<article class="card" tabindex="0" onkeydown="if(event.key==='Enter')this.click()" onclick="openPost(${jsq(p.id)})"><div class="th" style="${bgs(p.thumb||(g&&g.img)||catImg(p.type))}"><span class="ov">${badge(p.type)}${p.featured?`<span class="tag bd">${esc(t("feat"))}</span>`:""}${p.pinned?`<span class="tag bd">${esc(t("pinned"))}</span>`:""}${(p.labels||[]).slice(0,2).map(l=>`<span class="tag bd">${esc(l)}</span>`).join("")}</span><button class="shb" onclick="event.stopPropagation();openShare('p',${jsq(p.id)})" onkeydown="event.stopPropagation()" aria-label="${esc(t("share"))}">${svg("share",15)}</button></div>
  <div class="cb"><h3 class="ti">${esc(p.title)}</h3><p class="ds">${esc(p.desc||"")}</p>
  <div class="au lk" onclick="event.stopPropagation();openProfile(${jsq(p.authorId||"")})">${avatar(p.authorName,p.authorPic)}<div><b>${esc(p.authorName||t("anon"))}</b><span class="mu">${esc(fmt(p.createdAt))}</span></div></div>
  <div class="ft"><span class="gm">${g?esc(g.name):""}</span><span class="sts"><span>${svg("heart",13)}${p.likeCount||0}</span><span>${svg("star",13)}${n?(p.ratingSum/n).toFixed(1):"0.0"}</span><span>${svg("eyeview",13)}${p.views||0}</span></span></div></div></article>`;
}
function renderHead(){
  const ttl=curGame&&games[curGame]?games[curGame].name:curType?catName(curType):t("home.title");
  $("hhead").innerHTML=(siteCfg.announcement?`<div class="ann">${svg("msg",18)}<span>${esc(siteCfg.announcement)}</span></div>`:"")+`<div class="hrow"><h2>${esc(ttl)}</h2>${curGame||curType?`<button class="gh" onclick="go('')">${svg("x",14)}${esc(t("clear"))}</button>`:""}</div>`;
}
function renderPosts(){
  const a=filtered(),el=$("posts"),q=$("q").value.trim();
  curPosts={...curPosts,...Object.fromEntries(all.map(p=>[p.id,p]))};
  renderHead();
  if(!a.length)region(el,"empty",q||curGame||curType?t("home.nomatch"):t("home.none"));
  else{region(el,"success");el.innerHTML=a.map(cardHtml).join("")}
  $("more").hidden=!(all.length>=limit&&!q);
}
function loadMore(){limit+=PAGE;loadPosts(true)}
let dt;
function onSearch(){clearTimeout(dt);dt=setTimeout(()=>{
  if(view!=="home"||curType||curGame){curType="";curGame="";limit=PAGE;homeDirty=true;if(location.hash!=="#/")history.replaceState(null,"","#/");show("home","",true)}else renderPosts()
},250)}

/* ===== SEO động + chi tiết bài ===== */
const meta=s=>document.querySelector(s);
function seo(ti,d){document.title=ti;meta('meta[name=description]').content=d;meta('meta[property="og:title"]').content=ti;meta('meta[property="og:description"]').content=d}
function closeDetail(silent){closeM($("mDetail"));openId=null;if(!silent)history.replaceState(null,"",viewHash());seo(T0,D0)}
function voteHtml(id){
  const p=curPosts[id],v=myVotes[id]||{},n=p.ratingCount||0,hl=v.stars||Math.round(n?p.ratingSum/n:0);
  return `<button class="hb ${v.liked?"on":""}" onclick="like(${jsq(id)})" aria-label="${esc(t("v.like"))}">${svg("heart",16)}${p.likeCount||0}</button><span>${[1,2,3,4,5].map(i=>`<button class="sb ${hl>=i?"on":""}" onclick="rate(${jsq(id)},${i})" aria-label="${esc(t("v.star",i))}">★</button>`).join("")}</span><span class="mu">${n?(p.ratingSum/n).toFixed(1):"0.0"} · ${esc(t("v.n",n))}</span>`;
}
function refreshVote(id){const el=$("vote");if(el&&openId===id)el.innerHTML=voteHtml(id)}
function applyVote(id,r){Object.assign(curPosts[id],{likeCount:r.likeCount,ratingCount:r.ratingCount,ratingSum:r.ratingSum});myVotes[id]={liked:r.liked,stars:r.stars};refreshVote(id);if(view==="home")renderPosts()}
async function like(id){if(!me)return openAuth();try{applyVote(id,await api("/posts/"+id+"/like","POST"))}catch(e){toast(e.message)}}
async function rate(id,s){if(!me)return openAuth();try{applyVote(id,await api("/posts/"+id+"/rate","POST",{stars:s}))}catch(e){toast(e.message)}}
async function openPost(id){
  const p=curPosts[id];if(!p)return;
  if(!p._bl){p._bl=1;try{const b=await dbGet("pub/postBody/"+id);if(b)Object.assign(p,b)}catch(e){}}
  openId=id;
  const g=games[p.gameId],a=catActions(p.type),own=me&&(me.userId===p.authorId||me.role==="dev");
  const open=a.includes("open")&&safeUrl(p.url),dl=a.includes("download")&&safeUrl(p.dl);
  const lnk=(h,l,pri)=>`<a class="btn${pri?" pri":""}" href="${esc(h)}" target="_blank" rel="noopener noreferrer nofollow ugc">${esc(l)}</a>`;
  $("detail").innerHTML=`<div class="th big" style="${bgs(p.thumb||(g&&g.img)||catImg(p.type))}"></div>
  <h2 class="dt">${esc(p.title)}</h2>
  <div class="row" style="margin-top:0">${badge(p.type)}${g?`<span class="tag">${esc(g.name)}</span>`:""}${p.version?`<span class="tag">v${esc(p.version)}</span>`:""}<span class="mu" style="display:inline-flex;align-items:center;gap:4px">${svg("eyeview",13)}${p.views||0}</span></div>
  <div class="au lk" style="margin:14px 0" onclick="closeDetail();openProfile(${jsq(p.authorId||"")})">${avatar(p.authorName,p.authorPic,true)}<div><b style="font-size:14px">${esc(p.authorName||t("anon"))}</b><span class="mu">${esc(t("posted",fmt(p.createdAt)))}${p.updatedAt?esc(t("edited",fmt(p.updatedAt))):""}</span></div></div>
  <p style="white-space:pre-wrap">${esc(p.desc||"")}</p>
  ${p.note?`<p class="mu" style="margin-top:8px">${esc(t("c.by",p.note))}</p>`:""}
  ${imgsHtml(p.images)}
  ${p.code?`<pre>${esc(p.code)}</pre>`:""}
  <div class="row" style="margin-top:8px">${(p.tags||[]).map(x=>`<span class="tag">#${esc(x)}</span>`).join("")}</div>
  <div class="row" id="vote">${voteHtml(id)}</div>
  <div class="row">${a.includes("copy")&&p.code?`<button class="pri" onclick="copyCode(${jsq(id)})">${esc(t("copy"))}</button>`:""}
  ${dl?lnk(dl,t("download"),1):""}${open?lnk(open,t("open"),!dl):""}
  <button onclick="share(${jsq(id)})">${esc(t("share"))}</button><button onclick="reportPost(${jsq(id)})">${esc(t("report"))}</button>
  ${own?`<button onclick="editPost(${jsq(id)})">${esc(t("edit"))}</button><button class="danger" onclick="delPost(${jsq(id)})">${esc(t("del"))}</button>`:""}</div>`;
  openM($("mDetail"));
  history.replaceState(null,"","#/post/"+id);
  seo(p.title+" — SKIBIDISCRIPT",(p.desc||p.title).replace(/\s+/g," ").slice(0,155));
  bumpView(id);
  if(me&&!myVotes[id])api("/posts/"+id+"/vote").then(v=>{myVotes[id]=v;refreshVote(id)}).catch(()=>{});
}
const seenV=new Set();
function bumpView(id){
  if(seenV.has(id)||!fbInit())return;seenV.add(id);
  fbDb.ref("pub/posts/"+id+"/views").transaction(c=>(c||0)+1).then(r=>{const p=curPosts[id];if(p&&r&&r.snapshot)p.views=r.snapshot.val()}).catch(()=>{});
}
function copyCode(id){navigator.clipboard.writeText(curPosts[id].code).then(()=>toast(t("copied"))).catch(()=>{})}
/* ===== CHIA SẺ LIÊN KẾT RIÊNG — chỉ cho nội dung đã đăng =====
   /p/{id}  bài trong pub/posts (Script, APK, iOS, Link và mục khác do dev tạo) · /w/{id}  bài World trong pub/world/posts
   Trên Vercel, api/share.js trả trang có thẻ Open Graph (bản xem trước khi gửi qua app nhắn tin) rồi chuyển người mở sang #/post/{id} hoặc #/w/{id}.
   Link luôn trỏ tới bản ghi gốc trong Firebase (không tạo bản sao). Bài đã xóa/bị ẩn/không có quyền => hiện thông báo tương ứng. */
const SITE="https://skibidiscript.vercel.app";
const shareBase=()=>/^https?:$/.test(location.protocol)?location.origin+location.pathname.replace(/[^\/]*$/,""):SITE+"/";
const shareUrl=(k,id)=>shareBase()+"#/"+(k==="p"?"post":"w")+"/"+encodeURIComponent(id);
const oneLine=(s,n)=>String(s||"").replace(/\s+/g," ").trim().slice(0,n);
let shCtx=null;
/* đọc dữ liệu công khai: ưu tiên SDK (mang theo đăng nhập, tuân theo Rules), dự phòng REST */
async function readShared(path){
  if(fbInit()){
    try{return await snap(path)}
    catch(e){if(/permission[_ -]?denied/i.test(String((e&&e.code)||"")+" "+String((e&&e.message)||"")))throw fbErr(403,"denied");throw e}
  }
  return dbGet(path);
}
function openShare(k,id,ttl){
  id=String(id||"");
  if(!/^[\w-]{1,60}$/.test(id))return toast(t("sh.badid"));
  let label="",text="",title="";
  if(k==="p"){const p=curPosts[id];label=ttl||(p&&p.title)||"";text=p?oneLine(p.desc,120):"";title=(label||"SKIBIDISCRIPT")+" — SKIBIDISCRIPT"}
  else{const p=wFind(id)||{};text=oneLine(p.text,120);title=t("sh.wtitle",p.authorName||t("anon"))+" — SKIBIDISCRIPT";label=text||t("sh.wtitle",p.authorName||t("anon"))}
  shCtx={k,id,title,text,url:shareUrl(k,id)};
  $("shTitle").textContent=oneLine(label,90);$("shUrl").value=shCtx.url;
  const can=typeof navigator.share==="function";
  $("shNative").disabled=!can;
  if(can)setMsg("shMsg","");else setMsg("shMsg",t("sh.nosupport"),"warn");
  openM($("mShare"));
}
const share=id=>openShare("p",id);
async function copyText(s){
  try{if(navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext){await navigator.clipboard.writeText(s);return true}}catch(e){}
  const ta=document.createElement("textarea");
  try{
    ta.value=s;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:0;left:0;width:1px;height:1px;min-height:0;opacity:0";
    document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,s.length);
    return document.execCommand("copy")===true;
  }catch(e){return false}finally{ta.remove()}
}
async function shareCopy(){
  const c=shCtx;if(!c)return;
  const b=$("shCopy");b.disabled=true;
  const ok=await copyText(c.url);
  b.disabled=false;
  if(ok){closeM($("mShare"));toast(t("linkcopied"))}
  else{setMsg("shMsg",t("sh.fail"),"bad");toast(t("sh.fail"));const i=$("shUrl");i.focus();i.select()}
}
async function shareNative(){
  const c=shCtx;if(!c)return;
  const d={title:c.title,url:c.url};if(c.text)d.text=c.text;
  if(typeof navigator.share!=="function"||(typeof navigator.canShare==="function"&&!navigator.canShare(d)))return setMsg("shMsg",t("sh.nosupport"),"warn");
  try{await navigator.share(d);closeM($("mShare"))}
  catch(e){if(e&&e.name==="AbortError")return;console.warn("[share]",e);setMsg("shMsg",t("sh.err"),"bad");toast(t("sh.err"))}
}
/* Hộp thông báo khi mở link tới bài không còn / không có quyền / lỗi tải */
function showUnavailable(k,retry){
  openId="!";
  const act=k==="sh.denied.login"?`<button class="pri" onclick="closeDetail(true);openAuth()">${esc(t("login"))}</button>`:retry?`<button class="pri" onclick="closeDetail(true);openFromHash()">${esc(t("reload"))}</button>`:"";
  $("detail").innerHTML=`<div class="st" style="min-height:240px"><span class="sti">${svg("doc",22)}</span><b>${esc(t(k))}</b><div class="row c">${act}<button onclick="closeDetail();go('')">${esc(t("sh.home"))}</button></div></div>`;
  openM($("mDetail"));
}
function editPost(id){closeDetail();openForm(curPosts[id])}
async function delPost(id){
  if(!await yes({title:t("d.confirm"),text:t("d.confirm.t"),ok:t("del"),danger:true}))return;
  try{await api("/posts/"+id,"DELETE");closeDetail();toast(t("deleted"));loadPosts()}catch(e){toast(e.message)}
}
async function openFromHash(){
  const m=location.hash.match(/^#\/post\/([\w-]+)$/);if(!m)return;
  const id=m[1],h=location.hash;
  if(!curPosts[id]){
    let d;
    try{d=await readShared("pub/posts/"+id)}
    catch(e){
      if(location.hash!==h)return;
      const den=!!e&&(e.status===401||e.status===403);
      return showUnavailable(den?(me?"sh.denied":"sh.denied.login"):"sh.loaderr",!den);
    }
    if(location.hash!==h)return;
    if(!d||typeof d!=="object")return showUnavailable("sh.gone");
    curPosts[id]={id,...d};
  }
  openPost(id);
}
const reportPost=id=>openReport({type:"post",id,title:(curPosts[id]||{}).title||id});

/* ===== ĐĂNG BÀI + ẢNH ===== */
function syncForm(){
  const a=catActions($("fpType").value);
  $("wCode").hidden=!a.includes("copy");$("wUrl").hidden=!a.includes("open");$("wDl").hidden=!a.includes("download");
}
function prevThumb(){const s=imgSrc($("fThumb").value.trim());$("thPrev").innerHTML=s?`<img class="gi" src="${esc(s)}" alt="">`:""}
function renderGal(){$("galPrev").innerHTML=gal.map((g,i)=>`<span class="gp"><img class="gi" src="${esc(imgSrc(g))}" alt=""><button type="button" onclick="gal.splice(${i},1);renderGal()" aria-label="${esc(t("del"))}">✕</button></span>`).join("")}
function addGalImg(){if(gal.length>=4)return $("formMsg").textContent=t("f.max4");pickFile(v=>{if(gal.length<4){gal.push(v);renderGal()}})}
function shrink(file,mx){
  mx=mx||800;
  return new Promise((ok,no)=>{
    const i=new Image(),u=URL.createObjectURL(file);
    i.onload=()=>{
      URL.revokeObjectURL(u);let d="";
      for(const[max,q]of[[mx,.72],[mx*.75,.6],[mx*.55,.5]]){
        const r=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement("canvas");
        c.width=Math.round(i.width*r);c.height=Math.round(i.height*r);c.getContext("2d").drawImage(i,0,0,c.width,c.height);
        d=c.toDataURL("image/jpeg",q);if(d.length<(mx<=420?70000:190000))break;
      }
      ok(d);
    };
    i.onerror=()=>no(new Error(t("img.bad")));i.src=u;
  });
}
/* chọn ảnh từ máy → tải lên → cb(id ảnh). Dùng chung cho mọi nơi cần ảnh */
let fileCb=null,fileMx=800;
function pickFile(cb,mx){fileCb=cb;fileMx=mx||800;$("fileX").click()}
async function onFile(inp){
  const f=inp.files[0];inp.value="";if(!f||!fileCb)return;const cb=fileCb;
  toast(t("up.ing"));
  try{const r=await api("/upload","POST",{data:await shrink(f,fileMx)});cb(r.id);toast(t("up.ok"))}catch(e){toast(e.message)}
}
async function openForm(p){
  if(!me)return openAuth();
  if(p&&p.id&&!p._bl){try{p={...p,...await api("/posts/"+p.id+"/full")}}catch(e){toast(e.message);return}}
  editing=p&&p.id?p.id:null;p=p||{};gal=[...(p.images||[])];
  fillType(p.type||curType||navCats()[0]||"");
  $("fTitle").value=p.title||"";$("fpGame").value=p.gameId||"";$("fDesc").value=p.desc||"";$("fThumb").value=p.thumb||"";$("fCode").value=p.code||"";$("fUrl").value=p.url||"";$("fDl").value=p.dl||"";$("fVer").value=p.version||"";$("fTags").value=(p.tags||[]).join(", ");$("fNote").value=p.note||"";
  $("addCatBtn").hidden=!isDev();
  prevThumb();renderGal();syncForm();$("formMsg").textContent="";openM($("mForm"));
}
async function submitPost(){
  const b={id:editing,title:$("fTitle").value.trim(),type:$("fpType").value,gameId:$("fpGame").value,desc:$("fDesc").value,thumb:$("fThumb").value.trim(),images:gal,code:$("fCode").value,url:$("fUrl").value.trim(),dl:$("fDl").value.trim(),version:$("fVer").value,tags:$("fTags").value.split(",").map(s=>s.trim()).filter(Boolean),note:$("fNote").value};
  const fm=$("formMsg");
  if(!b.title)return fm.textContent=t("f.needt");
  if(!b.type)return fm.textContent=t("f.needcat");
  if(b.url&&!safeUrl(b.url)||b.dl&&!safeUrl(b.dl))return fm.textContent=t("f.badurl");
  if(b.thumb&&!imgSrc(b.thumb))return fm.textContent=t("f.badthumb");
  fm.textContent=t("f.sending");
  try{const r=await api("/posts","POST",b);fm.textContent="";closeM($("mForm"));toast(r.message||t("f.sent"));loadPosts();if(view==="mine")loadMine()}
  catch(e){fm.textContent=e.message}
}
async function loadMine(){
  const el=$("mine");if(!me)return;region(el,"loading");
  try{
    const {posts}=await api("/me/posts");
    if(!posts||!posts.length)return region(el,"empty",t("mine.none"));
    window._mine=Object.fromEntries(posts.map(p=>[p.id,p]));region(el,"success");
    el.innerHTML=posts.map(p=>`<div class="item"><div><b>${esc(p.title)}</b> ${badge(p.type)} <span class="tag">${esc(p.status)}</span>
    <div class="mu">${esc(t("created",fmt(p.createdAt)))}${p.updatedAt?esc(t("edited",fmt(p.updatedAt))):""}${p.rejectReason?" · "+esc(t("reason",p.rejectReason)):""}</div></div>
    <div class="row" style="margin:0">${p.status==="published"?`<button onclick="openShare('p',${jsq(p.id)},${jsq(p.title)})">${svg("share",16)}${esc(t("share"))}</button>`:""}${p.locked?`<span class="mu">${esc(t("locked"))}</span>`:`<button onclick="openForm(_mine[${jsq(p.id)}])">${esc(t("edit"))}</button><button class="danger" onclick="delMine(${jsq(p.id)})">${esc(t("del"))}</button>`}</div></div>`).join("");
  }catch(e){if(gone(e))return region(el,"empty",t("mine.none"));region(el,"error",e,loadMine)}
}
async function delMine(id){
  if(!await yes({title:t("d.confirm"),text:t("d.confirm.t"),ok:t("del"),danger:true}))return;
  try{await api("/posts/"+id,"DELETE");toast(t("deleted"));loadMine();loadPosts()}catch(e){toast(e.message)}
}
async function loadLiked(){
  const el=$("liked");if(!me)return;region(el,"loading");
  try{
    const {posts}=await api("/me/likes");
    if(!posts||!posts.length)return region(el,"empty",t("liked.none"));
    posts.forEach(p=>{curPosts[p.id]=p});region(el,"success");el.innerHTML=posts.map(cardHtml).join("");
  }catch(e){if(gone(e))return region(el,"empty",t("liked.none"));region(el,"error",e,loadLiked)}
}
;(window.__ok=window.__ok||[]).push("app-posts.js");
