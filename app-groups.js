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
;(window.__ok = window.__ok || []).push("app-groups.js"); (window.__v = window.__v || {})["app-groups.js"] = "20261019c";
