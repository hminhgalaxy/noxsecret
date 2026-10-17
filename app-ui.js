/* ===== GIAO DIỆN SÁNG / TỐI ===== */
let themePref="light";try{themePref=localStorage.getItem("theme")||"light"}catch(e){}
const mq=window.matchMedia?matchMedia("(prefers-color-scheme:dark)"):null;
function applyTheme(p,save){
  themePref=p;if(save){try{localStorage.setItem("theme",p)}catch(e){}}
  const d=p==="system"?(mq&&mq.matches?"dark":"light"):p;
  document.documentElement.dataset.theme=d;$("tc").content=d==="dark"?"#09090b":"#f4f4f5";
}
if(mq&&mq.addEventListener)mq.addEventListener("change",()=>{if(themePref==="system")applyTheme("system")});
function setLang(l){
  lang=l==="en"?"en":"vi";try{localStorage.setItem("lang",lang)}catch(e){}
  applyStatic();renderAuth();if(view==="home")renderPosts();else show(view,viewArg,true);
  if($("mSet").classList.contains("on"))renderSettings();
}

/* ===== MỤC (do dev tạo) + ẩn/hiện menu ===== */
const catIds=()=>Object.keys(cats).filter(c=>!BASE.includes(c)&&/^[\w-]+$/.test(c));
const catHidden=c=>!!(cats[c]&&cats[c].hidden);
const navCats=()=>catIds().filter(c=>isDev()||!catHidden(c));
const navHidden=k=>!!(siteCfg.hiddenNav&&siteCfg.hiddenNav[k]);
const catName=c=>(cats[c]&&cats[c].name)||BN[c]||c;
const catActions=c=>(cats[c]&&cats[c].actions)||DEFACT[c]||["detail"];
const catImg=c=>(cats[c]&&cats[c].img)||"";
const badge=ty=>`<span class="tag bd">${esc(catName(ty))}</span>`;
const ico=c=>catImg(c)&&imgSrc(catImg(c))?`<span class="ci" style="${bgs(catImg(c))}"></span>`:"";
const isDev=()=>isDevMe();
function fillType(sel){
  const ids=navCats();if(sel&&!ids.includes(sel))ids.push(sel);
  $("fpType").innerHTML=ids.length?ids.map(i=>`<option value="${esc(i)}">${esc(catName(i))}</option>`).join(""):`<option value="">${esc(t("f.nocat"))}</option>`;
  if(sel&&ids.includes(sel))$("fpType").value=sel;
}
function fillCats(){fillType($("fpType").value);renderNav();renderPop();if(all.length&&view==="home")renderPosts()}
async function loadCats(){
  try{const d=(await dbGet("pub/categories"))||{};cats={};for(const[k,v]of Object.entries(d))cats[k]=typeof v==="string"?{name:v,actions:["detail"]}:v}catch(e){cats={}}
  fillCats();
}
async function loadCfg(){
  try{siteCfg=(await dbGet("pub/settings"))||{}}catch(e){siteCfg={}}
  renderNav();renderPop();if(view==="home")renderHead();
  if(!isDev()&&((view==="games"&&navHidden("games"))||(view==="world"&&navHidden("world"))))go("");
}
function addCat(){if(!isDev())return toast(t("f.onlydev"));closeM($("mForm"));devTab="cats";openDev()}

/* ===== TÀI KHOẢN ===== */
function renderAuth(){
  const a=$("accBtn"),d=$("dauth");
  $("inboxBtn").hidden=!me;
  if(!me){
    a.innerHTML=svg("user");a.setAttribute("aria-label",t("login"));
    d.innerHTML=authReady?`<button class="pri" onclick="openAuth('login');toggleMenu(false)">${esc(t("login"))}</button><button onclick="openAuth('reg');toggleMenu(false)">${esc(t("register"))}</button>`:"";
  }else{
    a.innerHTML=avatar(me.name,me.pic);a.setAttribute("aria-label",t("a.profile"));
    d.innerHTML=`<div class="au lk" onclick="openProfile(${jsq(me.userId)});toggleMenu(false)">${avatar(me.name,me.pic,true)}<div><b>${esc(me.name)}${devTag(me.role)}</b><span class="mu">${esc(idOf(me))}</span></div></div><button onclick="logout()">${svg("logout",16)}${esc(t("logout"))}</button>`;
  }
  renderNav();renderPop();
}
const onAcc=()=>me?openProfile(me.userId):openAuth();
/* Đăng nhập / đăng ký là TRANG RIÊNG (login.html / register.html), không còn popup. Quay lại đúng chỗ đang xem sau khi xong. */
function openAuth(m){
  const next=location.pathname+location.search+location.hash;
  location.href=(m==="reg"?"register.html":"login.html")+"?next="+encodeURIComponent(next);
}
function eye(id,b){const i=$(id),s=i.type==="password";i.type=s?"text":"password";b.innerHTML=svg(s?"eyeoff":"eye");b.setAttribute("aria-label",t(s?"a.hidepw":"a.showpw"))}
function vName(v){
  if(!v)return t("v.name.empty");
  if(/\s/.test(v))return t("v.name.space");
  if(v.length<3)return t("v.name.short");
  if(v.length>24)return t("v.name.long");
  if(!/^[\p{L}\p{N}_]+$/u.test(v))return t("v.name.chars");
  return"";
}
function vHandle(v){
  if(!v)return t("v.id.empty");
  if(/\s/.test(v))return t("v.name.space");
  if(v.length<3)return t("v.id.short");
  if(v.length>20)return t("v.id.long");
  if(!/^[A-Za-z0-9_]+$/.test(v))return t("v.id.chars");
  return"";
}
function vEmail(v){
  if(!v)return t("v.em.empty");
  if(/\s/.test(v))return t("v.em.space");
  if(!v.includes("@"))return t("v.em.at");
  const p=v.split("@");
  if(p.length>2)return t("v.em.at2");
  if(p[1]!=="gmail.com")return t("v.em.dom");
  if(p[0].length<6||p[0].length>30)return t("v.em.len");
  if(!/^[a-z0-9.]+$/.test(p[0]))return t("v.em.chars");
  if(/^\.|\.$|\.\./.test(p[0]))return t("v.em.dots");
  return"";
}
function pwCheck(p){
  const r={len:p.length>=8,up:/\p{Lu}/u.test(p),sp:/[^\p{L}\p{N}\s]/u.test(p),ns:!/\s/.test(p)};
  const extra=[/\p{Ll}/u.test(p),/\d/.test(p),p.length>=12].filter(Boolean).length;
  let lv=p?1:0;
  if(r.len&&r.up&&r.sp&&r.ns){lv=2;if(extra===3)lv=3}
  return{r,lv};
}
function pwErr(p){
  if(!p)return t("v.pw.empty");
  if(/\s/.test(p))return t("v.pw.space");
  if(pwCheck(p).lv<2)return t("v.pw.weak");
  return"";
}
function afterAuth(){
  /* làm mới toàn bộ dữ liệu theo tài khoản mới, không cần tải lại trang */
  wList=[];wRep={};wGroups=[];homeDirty=true;unreadFails=0;
  renderAuth();pollUnread();loadRoles();loadCats();loadCfg();loadGames();
  show(view,viewArg,true);if(/^#\/post\//.test(location.hash)&&!openId)openFromHash();
}
async function logout(){
  try{localStorage.removeItem(GKEY)}catch(e){}
  try{await api("/auth/logout","POST")}catch(e){}
  me=null;myVotes={};wList=[];wRep={};wGroups=[];setUnread(0);toggleMenu(false);closeRoom();renderAuth();
  if(["mine","liked","inbox"].includes(view))go("");else show(view,viewArg,true);
}
/* Khôi phục phiên: tối đa chờ 3 giây — web (bài, game, mục…) KHÔNG phụ thuộc đăng nhập nên luôn hiện được dù Auth chậm */
let booted=false;
async function restore(){
  const gs=googleSession();
  if(gs){try{me=await googleMe(gs)}catch(e){console.warn("[google]",e)}loadRoles();authReady=true;return}
  try{
    if(fbInit()){
      let first;const fp=new Promise(r=>first=r);
      fbAuth.onAuthStateChanged(async()=>{
        try{await syncAuth(!booted)}catch(e){console.warn("[auth]",e)}
        first();
      });
      await Promise.race([fp,new Promise(r=>setTimeout(r,3000))]);
    }
  }catch(e){console.warn("[restore]",e)}
  loadRoles();authReady=true;
}

/* --- Gắn Gmail vào tài khoản đang đăng nhập (đăng nhập Google nằm ở login.html) --- */
async function linkGoogle(btn){
  if(btn)btn.disabled=true;setMsg("gLinkMsg",t("g.verify"));
  try{const u=await api("/me/link-popup","POST");Object.assign(me,u,{googleLinked:true});renderAuth();renderSettings();toast(t("s.gmail.done"))}
  catch(e){setMsg("gLinkMsg",e.message,"bad");if(btn)btn.disabled=false}
}

/* ===== ĐIỀU HƯỚNG ===== */
const viewHash=()=>"#/"+({home:curGame?"g/"+curGame:curType?"c/"+curType:"",games:"games",world:"world",liked:"liked",mine:"mine",inbox:"inbox"+(viewArg?"/"+encodeURIComponent(viewArg):""),profile:"u/"+encodeURIComponent(viewArg)}[view]||"");
function go(h){
  const n="#/"+h;
  if(location.hash===n||(h===""&&(location.hash===""||location.hash==="#"||location.hash==="#/")))route();
  else location.hash=n;
}
function route(){
  const p=location.hash.replace(/^#\/?/,"").split("/").map(x=>{try{return decodeURIComponent(x)}catch(e){return x}});let k=p[0];
  if(k!=="post"&&openId)closeDetail(true);
  if(k!=="w")wFocus=null;
  closeRoom();
  if(["liked","mine","inbox"].includes(k)&&!me){openAuth("login");history.replaceState(null,"","#/");k=""}
  if((k==="games"||k==="world")&&navHidden(k)&&!isDev()){history.replaceState(null,"","#/");k=""}
  if(k==="games"||k==="world"||k==="liked"||k==="mine")show(k);
  else if(k==="inbox")show("inbox",p[1]||"");
  else if(k==="u"&&p[1])show("profile",p[1]);
  else if(k==="c"&&p[1])showHome(p[1]);
  else if(k==="g"&&p[1])showHome("",p[1]);
  else if(k==="w"&&p[1]){
    if(navHidden("world")&&!isDev()){if(!viewReady)showHome();showUnavailable("sh.denied");return}
    wFocus={id:p[1],post:null,st:"load"};wTab="posts";show("world");
  }
  else if(k==="post"&&p[1]){if(!viewReady)showHome();openFromHash()}
  else showHome();
}
function showHome(type="",game=""){
  const ch=curType!==type||curGame!==game||view!=="home";
  curType=type;curGame=game;$("q").value="";
  if(ch){limit=PAGE;homeDirty=true}
  show("home");
}
function show(v,arg="",keep){
  const prevV=view;view=v;viewArg=arg;viewReady=true;document.body.dataset.view=v;
  for(const k of ["home","games","world","liked","mine","inbox","profile"])$("v"+k[0].toUpperCase()+k.slice(1)).hidden=k!==v;
  stopPoll("thread");
  if(v==="home"){if(homeDirty||!all.length){homeDirty=false;loadPosts()}else renderPosts()}
  else if(v==="games"){if(Object.keys(games).length)renderGames();else loadGames()}
  else if(v==="world")loadWorld();
  else if(v==="liked")loadLiked();
  else if(v==="mine")loadMine();
  else if(v==="inbox"){if(arg)openThread(arg);else loadInbox()}
  else if(v==="profile")loadProfile(arg);
  renderNav();renderPop();
  if(!keep&&prevV!==undefined)scrollTo({top:0,behavior:"smooth"});
}
const activeKey=()=>view==="home"?(curGame?"games":curType?"c:"+curType:"home"):view;
function navList(){
  const L=[{k:"home",l:t("nav.home"),i:svg("home"),h:""}];
  if(!navHidden("games")||isDev())L.push({k:"games",l:t("nav.games"),i:svg("game"),h:"games",hid:navHidden("games")});
  if(!navHidden("world")||isDev())L.push({k:"world",l:"World",i:svg("world"),h:"world",hid:navHidden("world")});
  navCats().forEach(c=>L.push({k:"c:"+c,l:catName(c),i:ico(c)||svg("hash"),h:"c/"+c,hid:catHidden(c)}));
  return L;
}
function renderNav(){
  const act=activeKey();
  const btn=(k,l,i,h,x)=>`<button class="${act===k?"on":""}" onclick="go(${jsq(h)});toggleMenu(false)">${i}<span>${esc(l)}</span>${x||""}</button>`;
  let h=navList().map(x=>btn(x.k,x.l,x.i,x.h,x.hid?`<em class="tag">${esc(t("hidden"))}</em>`:"")).join("");
  if(me){
    h+='<div class="dsep"></div>'+btn("liked",t("nav.liked"),svg("heart"),"liked")+btn("mine",t("nav.mine"),svg("doc"),"mine")+btn("inbox",t("nav.inbox"),svg("mail"),"inbox",unread?'<i class="dot in"></i>':"");
    h+=`<button onclick="openForm();toggleMenu(false)">${svg("plus")}<span>${esc(t("nav.post"))}</span></button>`;
    if(isDev())h+=`<button onclick="openDev();toggleMenu(false)">${svg("shield")}<span>Dev Panel</span></button>`;
  }
  h+=`<div class="dsep"></div><button onclick="openReport();toggleMenu(false)">${svg("flag")}<span>${esc(t("nav.report"))}</span></button><button onclick="openSettings();toggleMenu(false)">${svg("gear")}<span>${esc(t("nav.settings"))}</span></button>`;
  $("dnav").innerHTML=h;
}
const toggleMenu=o=>{$("drawer").classList.toggle("on",o);document.body.classList.toggle("lock",o||!!document.querySelector(".modal.on"))};
function renderPop(){
  const act=activeKey();
  $("popCats").innerHTML=navList().map(x=>`<button class="${act===x.k?"on":""}" onclick="go(${jsq(x.h)});closePop()">${x.k.startsWith("c:")?ico(x.k.slice(2)):""}${esc(x.l)}</button>`).join("")+(isDev()?`<button onclick="addCat();closePop()">${esc(t("newcat"))}</button>`:"");
  $("popSort").innerHTML=[["new","sort.new"],["views","sort.views"],["likes","sort.likes"]].map(([k,l])=>`<button class="${sortBy===k?"on":""}" onclick="sortBy='${k}';renderPosts();renderPop()">${esc(t(l))}</button>`).join("");
}
function togglePop(e){e.stopPropagation();const o=!$("pop").classList.contains("on");$("pop").classList.toggle("on",o);$("upBtn").classList.toggle("open",o)}
function closePop(){$("pop").classList.remove("on");$("upBtn").classList.remove("open")}
document.addEventListener("click",e=>{if(!e.target.closest("#pop,#sbar"))closePop()});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  if($("mAsk").classList.contains("on"))return askDone(null);
  if($("mImg").classList.contains("on"))return closeM($("mImg"));
  closePop();toggleMenu(false);
  const ms=[...document.querySelectorAll(".modal.on")],m=ms[ms.length-1];if(!m)return;
  if(m.id==="mDetail")closeDetail();else if(m.id==="mRoom")closeRoom();else closeM(m);
});

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

/* ===== HỒ SƠ NGƯỜI DÙNG ===== */
const openProfile=id=>{if(!id)return;go("u/"+encodeURIComponent(id))};
async function loadProfile(id){
  const el=$("profile");region(el,"loading");
  try{
    const u=await api("/users/"+encodeURIComponent(id));
    if(view!=="profile"||viewArg!==id)return;
    let posts=[];try{posts=(await api("/users/"+encodeURIComponent(u.userId)+"/posts")).posts||[]}catch(e){}
    if(view!=="profile"||viewArg!==id)return;
    posts.forEach(p=>{curPosts[p.id]=p});
    const mine=me&&me.userId===u.userId;
    if(mine)Object.assign(u,{name:me.name,pic:me.pic,bio:me.bio,handle:me.handle});
    const likes=posts.reduce((n,p)=>n+(p.likeCount||0),0);
    region(el,"success");
    el.innerHTML=`<div class="pcard">${avatar(u.name,u.pic,"xl")}<div class="pi"><h2>${esc(u.name)}${devTag(u.role)}</h2><span class="mu">ID ${esc(idOf(u))}</span>
    <p style="margin-top:8px;white-space:pre-wrap;word-break:break-word;color:${u.bio?"inherit":"var(--mu)"}">${esc(u.bio||t("p.nobio"))}</p>
    <div class="pst"><div><b>${posts.length}</b><span class="mu">${esc(t("p.posts"))}</span></div><div><b>${likes}</b><span class="mu">${esc(t("p.likes"))}</span></div>${u.createdAt?`<div><b>${esc(new Date(u.createdAt).toLocaleDateString(loc()))}</b><span class="mu">${esc(t("p.joined"))}</span></div>`:""}</div>
    <div class="row" style="margin-top:4px">${mine?`<button class="pri" onclick="openSettings('profile')">${svg("gear",16)}${esc(t("p.edit"))}</button>`:`<button class="pri" onclick="msgUser(${jsq(u.userId)})">${svg("mail",16)}${esc(t("in.msg"))}</button><button onclick="openReport({type:'user',id:${jsq(u.userId)},title:${jsq(u.name)}})">${svg("flag",16)}${esc(t("report"))}</button>`}</div></div></div>
    <div class="hrow"><h2>${esc(t("p.posts"))}</h2></div>
    ${posts.length?`<div class="grid">${posts.map(cardHtml).join("")}</div>`:`<div class="st" style="min-height:160px">${esc(t("p.none"))}</div>`}`;
  }catch(e){region(el,"error",e,()=>loadProfile(id))}
}
function msgUser(id){if(!me)return openAuth();go("inbox/"+encodeURIComponent(id))}

/* ===== POLLING ===== */
const polls={};
function startPoll(k,ms,fn){stopPoll(k);polls[k]=setInterval(()=>{if(!document.hidden)fn()},ms)}
function stopPoll(k){clearInterval(polls[k]);delete polls[k]}
let unreadFails=0;
function setUnread(n){unread=n||0;$("inDot").hidden=!unread;renderNav()}
async function pollUnread(){
  if(!me||unreadFails>=3)return;
  try{const r=await api("/inbox/unread");unreadFails=0;if((r.unread||0)!==unread)setUnread(r.unread||0)}catch(e){unreadFails++}
}

