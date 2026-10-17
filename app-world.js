/* ===== WORLD: bài viết + trả lời ===== */
let wTab="posts",wList=[],wMore=false,wImgs=[],wRep={},wOpen=new Set(),rImgs={};
let wFocus=null; /* bài World đang được mở từ link chia sẻ: {id,post,st:load|ok|gone|denied|err} */
const wFind=id=>wList.find(x=>x.id===id);
const bgRaw=u=>{const s=imgSrc(u);return s?`background-image:url("${s.replace(/["'()\\\s<>]/g,c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0"))}")`:""};
const canDel=a=>me&&(me.userId===a||me.role==="dev");
function loadWorld(){renderWComposer();renderWNote();wTabSet(wTab)}
function wTabSet(k){
  wTab=k;$("wtP").classList.toggle("on",k==="posts");$("wtG").classList.toggle("on",k==="groups");
  $("wPosts").hidden=k!=="posts";$("wGroups").hidden=k!=="groups";
  if(k==="posts")loadWPosts();else loadGroups();
}
function renderWComposer(){
  const el=$("wComp");
  if(!me){el.innerHTML=`<div class="cmpgate"><span class="mu" style="font-size:13px">${esc(t("w.login"))}</span><button class="pri" onclick="openAuth()">${esc(t("login"))}</button></div>`;return}
  el.innerHTML=`<div class="wc">${avatar(me.name,me.pic,true)}<div class="wcm"><textarea id="wText" maxlength="1500" rows="2" placeholder="${esc(t("w.ph"))}"></textarea><div class="gal sm" id="wGal"></div><div class="row" style="margin-top:6px"><button class="gh" onclick="addWImg()">${svg("image",16)}${esc(t("w.img"))}</button><button class="pri" id="wSend" onclick="sendWPost()" style="margin-left:auto">${esc(t("w.post"))}</button></div></div></div>`;
  renderWGal();
}
const thumbs=(arr,rm)=>arr.map((g,i)=>`<span class="gp"><img class="gi" src="${esc(imgSrc(g))}" alt=""><button type="button" onclick="${rm}(${i})" aria-label="${esc(t("del"))}">✕</button></span>`).join("");
function renderWGal(){const el=$("wGal");if(el)el.innerHTML=thumbs(wImgs,"rmWImg")}
function rmWImg(i){wImgs.splice(i,1);renderWGal()}
function addWImg(){if(wImgs.length>=4)return toast(t("w.max4"));pickFile(v=>{if(wImgs.length<4){wImgs.push(v);renderWGal()}})}
/* Mở link chia sẻ bài World: đọc đúng bản ghi gốc theo ID, đưa lên đầu bảng tin (không tạo bản sao) */
async function focusWPost(f){
  if(!/^[\w-]{1,60}$/.test(f.id)){f.st="gone";f.post=null;return}
  try{
    const d=await readShared("pub/world/posts/"+f.id);
    if(wFocus!==f)return;
    if(!d||typeof d!=="object"){f.st="gone";f.post=null;return}
    if(!rolesC)await loadRoles();
    const uid=(curUser()||{}).uid;
    f.post=wFix({id:f.id,...d},uid);f.st="ok";
  }catch(e){
    if(wFocus!==f)return;
    f.post=null;f.st=e&&(e.status===401||e.status===403)?"denied":"err";
  }
}
function renderWNote(){
  const el=$("wNote");if(!el)return;
  const f=wFocus;
  if(!f||f.st==="load"){el.innerHTML="";return}
  const m={ok:"sh.shared",gone:"sh.gone",denied:me?"sh.denied":"sh.denied.login",err:"sh.loaderr"}[f.st];
  const btn=f.st==="denied"&&!me?`<button class="pri" onclick="openAuth()">${esc(t("login"))}</button>`:f.st==="err"?`<button onclick="loadWPosts()">${esc(t("reload"))}</button>`:`<button onclick="go('world')">${esc(t("sh.all"))}</button>`;
  el.innerHTML=`<div class="ann">${svg(f.st==="ok"?"world":"flag",18)}<span style="flex:1;min-width:0">${esc(t(m))}</span>${btn}</div>`;
}
async function loadWPosts(more){
  const el=$("wFeed"),f=!more?wFocus:null;
  if(!more&&!wList.length)region(el,"loading");
  if(f){await focusWPost(f);renderWNote()}
  const pin=l=>f&&f.post?[f.post].concat(l.filter(x=>x.id!==f.post.id)):l;
  try{
    const q=more&&wList.length?"&before="+wList[wList.length-1].createdAt:"";
    const r=await api("/world/posts?limit=20"+q),ps=r.posts||[];
    wList=more?wList.concat(ps.filter(p=>!wList.some(x=>x.id===p.id))):pin(ps);wMore=ps.length>=20;
    renderWPosts();
  }catch(e){
    if(f&&f.post){wList=pin([]);renderWPosts();if(!gone(e))toast(e.message)}
    else if(wList.length)toast(e.message);
    else if(gone(e)){wList=[];renderWPosts()}
    else region(el,"error",e,()=>loadWPosts());
  }
}
function wpHtml(p){
  const open=wOpen.has(p.id),id=jsq(p.id);
  return `<article class="wp${wFocus&&wFocus.st==="ok"&&wFocus.id===p.id?" wfocus":""}" id="wp-${esc(p.id)}"><div class="wph"><div class="au lk" onclick="openProfile(${jsq(p.authorId||"")})">${avatar(p.authorName,p.authorPic,true)}<div><b>${esc(p.authorName||t("anon"))}${devTag(p.authorRole)}</b><span class="mu">${esc(ago(p.createdAt))}</span></div></div>${canDel(p.authorId)?`<button class="gh ic" onclick="delWPost(${id})" aria-label="${esc(t("del"))}">${svg("trash",16)}</button>`:""}</div>
  ${p.text?`<p class="wt">${esc(p.text)}</p>`:""}${imgsHtml(p.images)}
  <div class="wa"><button class="${p.liked?"on":""}" onclick="likeW(${id})" aria-label="${esc(t("v.like"))}">${svg("heart",15)}${p.likeCount||0}</button><button class="${open?"on":""}" onclick="toggleReplies(${id})" aria-label="${esc(t("w.replies"))}">${svg("msg",15)}${p.replyCount||0}</button><button onclick="openShare('w',${id})" aria-label="${esc(t("share"))}">${svg("share",15)}</button><button onclick="reportW(${id})" aria-label="${esc(t("report"))}">${svg("flag",15)}</button></div>
  <div class="wr" id="wr-${esc(p.id)}" ${open?"":"hidden"}></div></article>`;
}
function renderWPosts(){
  const el=$("wFeed");
  renderWNote();
  if(!wList.length)return region(el,"empty",t("w.none"));
  region(el,"success");
  el.innerHTML=wList.map(wpHtml).join("")+(wMore?`<div class="row c"><button onclick="loadWPosts(true)">${esc(t("more"))}</button></div>`:"");
  wOpen.forEach(id=>{if(wRep[id])paintReplies(id)});
}
function repaintWP(id){
  const p=wList.find(x=>x.id===id),el=$("wp-"+id);if(!p||!el)return;
  el.outerHTML=wpHtml(p);if(wOpen.has(id))paintReplies(id);
}
async function sendWPost(){
  const tx=$("wText").value.trim();if(!tx&&!wImgs.length)return toast(t("w.empty"));
  const b=$("wSend");b.disabled=true;
  try{
    const p=await api("/world/posts","POST",{text:tx,images:wImgs});wImgs=[];renderWComposer();
    if(p&&p.id){wList.unshift(p);renderWPosts()}else loadWPosts();
  }catch(e){toast(e.message);b.disabled=false}
}
async function delWPost(id){
  if(!await yes({title:t("w.del.t"),ok:t("del"),danger:true}))return;
  try{await api("/world/posts/"+id,"DELETE");wList=wList.filter(p=>p.id!==id);if(wFocus&&wFocus.id===id){wFocus.st="gone";wFocus.post=null}renderWPosts();toast(t("deleted"))}catch(e){toast(e.message)}
}
async function likeW(id){
  if(!me)return openAuth();
  try{const r=await api("/world/posts/"+id+"/like","POST"),p=wList.find(x=>x.id===id);if(p){p.liked=r.liked;p.likeCount=r.likeCount;repaintWP(id)}}catch(e){toast(e.message)}
}
function reportW(id){const p=wList.find(x=>x.id===id);openReport({type:"world",id,title:p?(p.text||"").slice(0,40)||p.authorName:id})}
function toggleReplies(id){
  if(wOpen.has(id)){wOpen.delete(id);const el=$("wr-"+id);if(el)el.hidden=true}else{wOpen.add(id);loadReplies(id)}
  const p=wList.find(x=>x.id===id);if(p){const b=document.querySelector("#wp-"+CSS.escape(id)+" .wa button:nth-child(2)");if(b)b.classList.toggle("on",wOpen.has(id))}
}
async function loadReplies(id){
  const el=$("wr-"+id);if(!el)return;el.hidden=false;
  if(!wRep[id])el.innerHTML='<div class="st" style="min-height:70px;padding:8px"><div class="sp" style="width:22px;height:22px;border-width:2px"></div></div>';
  try{wRep[id]=(await api("/world/posts/"+id+"/replies")).replies||[];paintReplies(id)}
  catch(e){el.innerHTML=`<div class="mu ln"><span>${esc(t("e.load"))}</span><button onclick="loadReplies(${jsq(id)})">${esc(t("reload"))}</button></div>`}
}
function replyHtml(pid,r){
  return `<div class="rp"><span onclick="openProfile(${jsq(r.authorId||"")})" style="cursor:pointer">${avatar(r.authorName,r.authorPic)}</span><div style="min-width:0"><div class="rb"><b onclick="openProfile(${jsq(r.authorId||"")})" style="cursor:pointer">${esc(r.authorName||t("anon"))}</b>${devTag(r.authorRole)}<div class="rt2">${esc(r.text||"")}</div>${imgsHtml(r.images)}</div>
  <div class="rm"><span>${esc(ago(r.createdAt))}</span>${me?`<button onclick="replyTo(${jsq(pid)},${jsq(r.authorName||"")})">${esc(t("w.replies"))}</button>`:""}${canDel(r.authorId)?`<button onclick="delReply(${jsq(pid)},${jsq(r.id)})">${esc(t("del"))}</button>`:""}</div></div></div>`;
}
function paintReplies(id){
  const el=$("wr-"+id);if(!el)return;
  const old=$("ri-"+id),keep=old?old.value:"";
  const form=me?`<div class="gal sm" id="rg-${esc(id)}"></div><div class="rf"><input id="ri-${esc(id)}" maxlength="500" placeholder="${esc(t("w.reply.ph"))}" onkeydown="if(event.key==='Enter')sendReply(${jsq(id)})"><button class="ic gh" onclick="addRImg(${jsq(id)})" aria-label="${esc(t("w.img"))}">${svg("image")}</button><button class="pri ic" onclick="sendReply(${jsq(id)})" aria-label="${esc(t("send"))}">${svg("send",16)}</button></div>`:`<div class="mu ln"><span>${esc(t("w.reply.login"))}</span><button onclick="openAuth()">${esc(t("login"))}</button></div>`;
  el.hidden=false;el.innerHTML=(wRep[id]||[]).map(r=>replyHtml(id,r)).join("")+form;
  const i=$("ri-"+id);if(i&&keep)i.value=keep;renderRGal(id);
}
function renderRGal(id){const el=$("rg-"+id);if(el)el.innerHTML=thumbs(rImgs[id]||[],`rmRImg.bind(null,${jsq(id)})`)}
function rmRImg(id,i){(rImgs[id]||[]).splice(i,1);renderRGal(id)}
function addRImg(id){const a=rImgs[id]=rImgs[id]||[];if(a.length>=4)return toast(t("w.max4"));pickFile(v=>{if(a.length<4){a.push(v);renderRGal(id)}})}
function replyTo(pid,name){const i=$("ri-"+pid);if(!i)return;if(name)i.value="@"+name+" "+i.value.replace(/^@\S+\s/,"");i.focus()}
async function sendReply(pid){
  if(!me)return openAuth();
  const inp=$("ri-"+pid),text=inp.value.trim(),imgs=rImgs[pid]||[];if(!text&&!imgs.length)return;
  inp.disabled=true;
  try{
    const r=await api("/world/posts/"+pid+"/replies","POST",{text,images:imgs});
    (wRep[pid]=wRep[pid]||[]).push(r);rImgs[pid]=[];
    const p=wList.find(x=>x.id===pid);if(p)p.replyCount=(p.replyCount||0)+1;
    inp.value="";repaintWP(pid);
  }catch(e){toast(e.message);inp.disabled=false}
}
async function delReply(pid,rid){
  if(!await yes({title:t("w.delr.t"),ok:t("del"),danger:true}))return;
  try{
    await api("/world/posts/"+pid+"/replies/"+rid,"DELETE");wRep[pid]=(wRep[pid]||[]).filter(r=>r.id!==rid);
    const p=wList.find(x=>x.id===pid);if(p)p.replyCount=Math.max(0,(p.replyCount||1)-1);repaintWP(pid);
  }catch(e){toast(e.message)}
}

/* ===== WORLD: nhóm chat ===== */
let wGroups=[],roomG=null,roomMsgs=[],roomImgs=[];
async function loadGroups(){
  const el=$("wGroupList");region(el,"loading");
  try{wGroups=(await api("/world/groups")).groups||[];renderGroups()}catch(e){if(gone(e)){wGroups=[];renderGroups()}else region(el,"error",e,loadGroups)}
}
function renderGroups(){
  const el=$("wGroupList");
  if(!wGroups.length)return region(el,"empty",t("g.none"));
  region(el,"success");
  el.innerHTML=wGroups.map(g=>`<button class="gcard" onclick="joinGroup(${jsq(g.id)})"><span class="gav" style="${bgs(g.img)}">${g.img&&imgSrc(g.img)?"":esc((g.name||"?").charAt(0).toUpperCase())}</span><span class="gm2"><b>${esc(g.name)}${g.locked?svg("lock",14):""}</b>${g.desc?`<span class="mu">${esc(g.desc)}</span>`:""}<span class="mu">${svg("users",13)}${esc(t("g.members",g.memberCount||0))}${g.joined?` <em class="tag">${esc(t("g.joined"))}</em>`:""}</span></span></button>`).join("");
}
function openGroupForm(){
  if(!me)return openAuth();
  ["cgName","cgDesc","cgImg","cgPw"].forEach(i=>{$(i).value=""});setMsg("cgMsg","");openM($("mGroup"));
}
async function submitGroup(){
  const b={name:$("cgName").value.trim(),desc:$("cgDesc").value.trim(),img:$("cgImg").value,password:$("cgPw").value};
  if(b.name.length<2)return setMsg("cgMsg",t("g.nameshort"),"bad");
  if(b.password&&b.password.length<4)return setMsg("cgMsg",t("g.pwshort"),"bad");
  const btn=document.querySelector("#mGroup .pri");btn.disabled=true;
  try{
    const g=await api("/world/groups","POST",b);g.joined=true;
    if(g.id){wGroups.unshift(g);renderGroups();closeM($("mGroup"));openRoom(g)}else{closeM($("mGroup"));loadGroups()}
  }catch(e){setMsg("cgMsg",e.message,"bad")}
  btn.disabled=false;
}
async function joinGroup(id){
  if(!me)return openAuth();
  const g=wGroups.find(x=>x.id===id);if(!g)return;
  if(g.joined)return openRoom(g);
  let pw="";
  if(g.locked){
    pw=await ask({title:g.name,text:t("g.needpw"),input:"password",ph:t("g.pw"),ok:t("g.join")});
    if(pw===null)return;
  }
  try{await api("/world/groups/"+id+"/join","POST",{password:pw});g.joined=true;g.memberCount=(g.memberCount||0)+1;renderGroups();openRoom(g)}
  catch(e){toast(e.status===403?t("g.wrongpw"):e.message)}
}
/* tin nhắn dùng chung cho nhóm và hòm thư */
function msgsHtml(ms,grp){
  let last="";
  return ms.map(m=>{
    const mine=me&&m.authorId===me.userId,hd=!mine&&grp&&m.authorId!==last;last=m.authorId;
    return `<div class="mg${mine?" me":""}">${!mine&&grp?`<span onclick="openProfile(${jsq(m.authorId||"")})" style="cursor:pointer">${avatar(m.authorName,m.authorPic)}</span>`:""}<div class="mb">${hd?`<b class="mn">${esc(m.authorName||t("anon"))}</b>`:""}${m.text?`<span class="mt">${esc(m.text)}</span>`:""}${imgsHtml(m.images)}<time>${esc(hm(m.createdAt))}</time></div></div>`;
  }).join("");
}
function paintList(el,ms,grp,emptyKey,force){
  const near=el.scrollHeight-el.scrollTop-el.clientHeight<90;
  el.innerHTML=ms.length?msgsHtml(ms,grp):`<div class="st" style="min-height:160px">${esc(t(emptyKey))}</div>`;
  if(force||near)el.scrollTop=el.scrollHeight;
}
function openRoom(g){
  roomG=g;roomMsgs=[];roomImgs=[];renderRGalImgs();
  const own=g.ownerId===(me&&me.userId)||isDev();
  $("rName").innerHTML=esc(g.name)+(g.locked?" "+svg("lock",13):"");
  $("rAv").style.cssText=bgRaw(g.img);$("rAv").textContent=g.img&&imgSrc(g.img)?"":(g.name||"?").charAt(0).toUpperCase();
  roomSub();
  $("rTools").innerHTML=(own?`<button class="ic" onclick="pwRoom()" aria-label="${esc(t("g.setpw"))}">${svg("key",18)}</button><button class="ic danger" onclick="delRoom()" aria-label="${esc(t("g.delete"))}">${svg("trash",18)}</button>`:"")+`<button class="ic" onclick="leaveRoom()" aria-label="${esc(t("g.leave"))}">${svg("logout",18)}</button>`;
  $("rList").innerHTML='<div class="st" style="min-height:160px"><div class="sp"></div></div>';$("rIn").value="";
  openM($("mRoom"));fetchRoom(true);startPoll("room",3500,()=>fetchRoom(false));
}
const roomSub=()=>{$("rSub").textContent=t("g.members",roomG.memberCount||0)};
function closeRoom(){stopPoll("room");if(!roomG)return;roomG=null;closeM($("mRoom"))}
async function fetchRoom(first){
  const g=roomG;if(!g)return;
  try{
    const after=roomMsgs.length?roomMsgs[roomMsgs.length-1].createdAt:0;
    const r=await api("/world/groups/"+encodeURIComponent(g.id)+"/messages"+(after?"?after="+after:""));
    if(roomG!==g)return;
    if(r.group)Object.assign(g,r.group);
    const ms=(r.messages||[]).filter(m=>!roomMsgs.some(x=>x.id===m.id));
    if(ms.length||first){roomMsgs=roomMsgs.concat(ms);paintList($("rList"),roomMsgs,true,"c.empty",first);roomSub()}
  }catch(e){
    if(roomG!==g)return;
    if(e.status===403){g.joined=false;closeRoom();renderGroups();return toast(e.message)}
    if(first){$("rList").innerHTML=`<div class="st" style="min-height:160px"><b>${esc(t("e.load"))}</b><button class="pri" onclick="fetchRoom(true)">${esc(t("reload"))}</button></div>`}
  }
}
const renderRGalImgs=()=>{$("rGal").innerHTML=thumbs(roomImgs,"rmRoomImg")};
function rmRoomImg(i){roomImgs.splice(i,1);renderRGalImgs()}
function addRoomImg(){if(roomImgs.length>=4)return toast(t("w.max4"));pickFile(v=>{if(roomImgs.length<4){roomImgs.push(v);renderRGalImgs()}})}
async function sendRoom(){
  const g=roomG,i=$("rIn"),text=i.value.trim();if(!g||(!text&&!roomImgs.length))return;
  const b=$("rSend");b.disabled=true;
  try{
    const m=await api("/world/groups/"+encodeURIComponent(g.id)+"/messages","POST",{text,images:roomImgs});
    if(roomG!==g)return;
    i.value="";roomImgs=[];renderRGalImgs();
    if(m&&m.id&&!roomMsgs.some(x=>x.id===m.id))roomMsgs.push(m);
    paintList($("rList"),roomMsgs,true,"c.empty",true);
  }catch(e){toast(e.message)}
  b.disabled=false;i.focus();
}
async function leaveRoom(){
  const g=roomG;if(!g||!await yes({title:t("g.leave"),text:t("g.leave.t"),ok:t("g.leave"),danger:true}))return;
  try{await api("/world/groups/"+encodeURIComponent(g.id)+"/leave","POST");g.joined=false;g.memberCount=Math.max(0,(g.memberCount||1)-1);closeRoom();renderGroups()}catch(e){toast(e.message)}
}
async function pwRoom(){
  const g=roomG;if(!g)return;
  const v=await ask({title:t("g.setpw"),text:t("g.setpw.t"),input:"password",ph:t("g.pw.none"),ok:t("save"),max:40,validate:x=>x&&x.length<4?t("g.pwshort"):""});
  if(v===null)return;
  try{await api("/world/groups/"+encodeURIComponent(g.id)+"/password","POST",{password:v});g.locked=!!v;openRoomHeadRefresh();toast(t("g.pwset"))}catch(e){toast(e.message)}
}
const openRoomHeadRefresh=()=>{if(roomG){$("rName").innerHTML=esc(roomG.name)+(roomG.locked?" "+svg("lock",13):"")}renderGroups()};
async function delRoom(){
  const g=roomG;if(!g||!await yes({title:t("g.delete"),text:t("g.delete.t"),ok:t("del"),danger:true}))return;
  try{await api("/world/groups/"+encodeURIComponent(g.id),"DELETE");wGroups=wGroups.filter(x=>x.id!==g.id);closeRoom();renderGroups();toast(t("deleted"))}catch(e){toast(e.message)}
}

/* ===== HÒM THƯ ===== */
let inboxWith="",threadMsgs=[],threadWith=null;
async function loadInbox(){
  const el=$("inboxBody");inboxWith="";region(el,"loading");
  try{
    const r=await api("/inbox");setUnread(r.unread||0);
    const th=r.threads||[];
    if(!th.length)return region(el,"empty",t("in.none"));
    region(el,"success");
    el.innerHTML=th.map(x=>`<button class="thr${x.unread?" un":""}" onclick="go('inbox/'+encodeURIComponent(${jsq(x.withId)}))">${avatar(x.withName,x.withPic)}<div><b>${esc(x.withName||x.withId)}${devTag(x.withRole)}</b><span class="mu pv">${esc(x.last||"")}</span></div><span class="mu">${x.lastAt?esc(ago(x.lastAt)):""}</span>${x.unread?`<span class="cnt">${x.unread>9?"9+":x.unread}</span>`:""}</button>`).join("");
  }catch(e){if(gone(e))return region(el,"empty",t("in.none"));region(el,"error",e,loadInbox)}
}
async function openThread(uid){
  const el=$("inboxBody");inboxWith=uid;region(el,"loading");
  try{
    const r=await api("/inbox/"+encodeURIComponent(uid));
    if(inboxWith!==uid||view!=="inbox")return;
    threadMsgs=r.messages||[];threadWith=r.with||{userId:uid,name:uid};
    region(el,"success");
    el.innerHTML=`<div class="thread"><div class="thh"><button class="ic" onclick="go('inbox')" aria-label="${esc(t("back"))}">${svg("back")}</button><div class="au lk" onclick="openProfile(${jsq(uid)})" style="flex:1">${avatar(threadWith.name,threadWith.pic)}<div><b>${esc(threadWith.name||uid)}${devTag(threadWith.role)}</b></div></div></div><div class="msgs" id="tList"></div><div class="cmp"><input id="tIn" maxlength="1000" placeholder="${esc(t("in.ph"))}" onkeydown="if(event.key==='Enter')sendThread()"><button class="pri ic" id="tSend" onclick="sendThread()" aria-label="${esc(t("send"))}">${svg("send")}</button></div></div>`;
    paintList($("tList"),threadMsgs,false,"in.empty",true);
    pollUnread();startPoll("thread",5000,pollThread);
  }catch(e){region(el,"error",e,()=>openThread(uid))}
}
async function pollThread(){
  const uid=inboxWith;if(!uid)return;
  try{
    const r=await api("/inbox/"+encodeURIComponent(uid));if(inboxWith!==uid||!$("tList"))return;
    const ms=r.messages||[];
    if(ms.length!==threadMsgs.length||(ms.length&&ms[ms.length-1].id!==threadMsgs[threadMsgs.length-1].id)){threadMsgs=ms;paintList($("tList"),threadMsgs,false,"in.empty")}
  }catch(e){}
}
async function sendThread(){
  const i=$("tIn"),text=i.value.trim();if(!text||!inboxWith)return;
  const b=$("tSend");b.disabled=true;
  try{
    const m=await api("/inbox/send","POST",{toId:inboxWith,text});
    i.value="";if(m&&m.id&&!threadMsgs.some(x=>x.id===m.id))threadMsgs.push(m);
    paintList($("tList"),threadMsgs,false,"in.empty",true);
  }catch(e){toast(e.message)}
  b.disabled=false;i.focus();
}

/* ===== BÁO CÁO → hòm thư dev ===== */
const RK=["bug","link","abuse","account","idea","other"],RS=["low","mid","high"];
let rpRef=null,rpSev="mid",rpKindV="bug";
function openReport(ref){
  if(!me)return openAuth();
  rpRef=ref||null;rpSev="mid";
  rpKindV=ref&&(ref.type==="user"||ref.type==="world")?"abuse":ref&&ref.type==="post"?"link":"bug";paintKind();
  $("rpCtx").textContent=ref?t("r.about",ref.title||ref.id):t("r.general");
  $("rpText").value="";$("rpCnt").textContent="0";paintSev();setMsg("rpMsg","");openM($("mReport"));
}
function paintKind(){$("rpKind").innerHTML=RK.map(k=>`<button type="button" class="${rpKindV===k?"on":""}" onclick="rpKindV='${k}';paintKind()">${esc(t("rk."+k))}</button>`).join("")}
function paintSev(){$("rpSev").innerHTML=RS.map(s=>`<button type="button" class="${rpSev===s?"on":""}" onclick="rpSev='${s}';paintSev()">${esc(t("rs."+s))}</button>`).join("")}
async function submitReport(){
  const text=$("rpText").value.trim();
  if(text.length<10)return setMsg("rpMsg",t("r.short"),"bad");
  const b={kind:rpKindV,severity:rpSev,text,reason:text};
  if(rpRef){b.refType=rpRef.type;b.refId=rpRef.id;if(rpRef.type==="post")b.postId=rpRef.id}
  const btn=$("rpGo");btn.disabled=true;
  try{await api("/reports","POST",b);closeM($("mReport"));toast(t("r.sent"))}catch(e){setMsg("rpMsg",e.message,"bad")}
  btn.disabled=false;
}

