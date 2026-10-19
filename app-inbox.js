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
;(window.__ok=window.__ok||[]).push("app-inbox.js");
