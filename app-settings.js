/* ===== CÀI ĐẶT ===== */
function openSettings(sec){openM($("mSet"));renderSettings();if(sec){const e=$("sec-"+sec);if(e)setTimeout(()=>e.scrollIntoView({block:"start",behavior:"smooth"}),80)}}
function seg(items,cur,fn){return `<div class="seg">${items.map(([k,l])=>`<button class="${cur===k?"on":""}" onclick="${fn}('${k}')">${esc(l)}</button>`).join("")}</div>`}
function renderSettings(){
  let h=`<div class="sec"><h3>${esc(t("s.theme"))}</h3>${seg([["light",t("s.light")],["dark",t("s.dark")],["system",t("s.system")]],themePref,"setTheme")}</div>
  <div class="sec"><h3>${esc(t("s.lang"))}</h3>${seg([["vi","Tiếng Việt"],["en","English"]],lang,"setLang")}</div>`;
  if(!me)h+=`<div class="sec"><p class="mu" style="font-size:13px">${esc(t("s.guest"))}</p><div class="row"><button class="pri" onclick="closeM($('mSet'));openAuth()">${esc(t("login"))}</button></div></div>`;
  else{
    const hasPw=me.hasPassword!==false;
    const nameLock=(me.nameChangedAt||0)+NAME_CD>srvNow(),idLock=!!(me.handleSet||me.handle);
    h+=`<div class="sec" id="sec-profile"><h3>${esc(t("s.profile"))}</h3>
      <div class="prow">${avatar(me.name,me.pic,"xl")}<div><button onclick="pickFile(setAvatar,300)">${svg("image",16)}${esc(t("s.avatar"))}</button></div></div>
      <label class="mu" style="display:block;margin:12px 0 4px" for="stBio">${esc(t("s.bio"))}</label><textarea id="stBio" maxlength="200" placeholder="${esc(t("s.bio.ph"))}">${esc(me.bio||"")}</textarea>
      <div class="row"><button class="pri" onclick="saveProfile()">${esc(t("save"))}</button></div></div>
    <div class="sec"><h3>${esc(t("s.name"))}</h3><input id="stName" maxlength="24" value="${esc(me.name)}" autocapitalize="off" spellcheck="false" ${nameLock?"disabled":""}><div class="fm${nameLock?" warn":""}" id="stNameMsg">${esc(nameLock?t("s.name.cool",new Date((me.nameChangedAt||0)+NAME_CD).toLocaleString(loc())):t("s.name.hint"))}</div><div class="row" style="margin-top:0"><button class="pri" onclick="saveName()" ${nameLock?"disabled":""}>${esc(t("save"))}</button></div></div>
    <div class="sec" id="sec-id"><h3>${esc(t("s.id"))}</h3><p class="mu" style="font-size:13px;word-break:break-all">${esc(t("s.id.now",idOf(me)))}</p>
      ${idLock?`<p class="fm ok">${esc(t("s.id.locked"))}</p>`:`<p class="mu" style="margin:4px 0 8px">${esc(t("s.id.hint"))}</p><input id="stId" maxlength="20" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="${esc(t("s.id.ph"))}"><div class="fm" id="stIdMsg"></div><div class="row" style="margin-top:0"><button class="pri" onclick="saveHandle()">${esc(t("s.id.save"))}</button></div>`}</div>
    <div class="sec"><h3>${esc(t("s.pass"))}</h3>
      ${hasPw?`<div class="pw"><input id="pwCur" type="password" maxlength="64" autocomplete="current-password" placeholder="${esc(t("s.pass.cur"))}"><button type="button" class="eye" onclick="eye('pwCur',this)">${svg("eye")}</button></div>`:""}
      <div class="pw" style="margin-top:8px"><input id="pwNew" type="password" maxlength="64" autocomplete="new-password" placeholder="${esc(t("s.pass.new"))}"><button type="button" class="eye" onclick="eye('pwNew',this)">${svg("eye")}</button></div>
      <div class="pw" style="margin-top:8px"><input id="pwNew2" type="password" maxlength="64" autocomplete="new-password" placeholder="${esc(t("s.pass.new2"))}"><button type="button" class="eye" onclick="eye('pwNew2',this)">${svg("eye")}</button></div>
      <div class="fm" id="stPwMsg"></div><div class="row" style="margin-top:0"><button class="pri" onclick="savePass()">${esc(t("save"))}</button></div></div>
    <div class="sec"><h3>Gmail</h3><p class="mu" style="font-size:13px">${me.email?esc(me.email):esc(t("s.gmail.none"))}</p>
      ${me.google?`<p class="fm ok">Google</p>`:""}
      <div class="fm" id="gLinkMsg"></div></div>`;
  }
  $("setBody").innerHTML=h;
}
function setTheme(p){applyTheme(p,true);renderSettings()}
function setAvatar(id){
  api("/me/profile","POST",{pic:id,bio:me.bio||""}).then(u=>{bustUser();Object.assign(me,u,{pic:u.pic||id});renderAuth();renderSettings();toast(t("s.profile.done"))}).catch(e=>toast(e.message));
}
async function saveProfile(){
  try{const u=await api("/me/profile","POST",{bio:$("stBio").value.trim(),pic:me.pic||""});bustUser();Object.assign(me,u);renderAuth();toast(t("s.profile.done"))}catch(e){toast(e.message)}
}
async function saveName(){
  const v=$("stName").value.trim(),e=vName(v);
  if(e)return setMsg("stNameMsg",e,"bad");
  if(v===me.name)return setMsg("stNameMsg",t("s.name.same"),"warn");
  if(!await yes({title:t("s.name.confirm"),text:t("s.name.confirm.t"),ok:t("save")}))return;
  try{const u=await api("/me/name","POST",{name:v});bustUser();Object.assign(me,u,{name:u.name||v});renderAuth();renderSettings();toast(t("s.name.done"))}
  catch(er){setMsg("stNameMsg",er.status===409?t("n.taken"):er.message,"bad")}
}
async function saveHandle(){
  const v=$("stId").value.trim().replace(/^@/,""),e=vHandle(v);
  if(e)return setMsg("stIdMsg",e,"bad");
  if(!await yes({title:t("s.id.confirm"),text:t("s.id.confirm.t",v),ok:t("s.id.save"),danger:true}))return;
  try{const u=await api("/me/handle","POST",{handle:v});Object.assign(me,u);renderAuth();renderSettings();toast(t("s.id.done"))}
  catch(er){setMsg("stIdMsg",er.message,"bad")}
}
async function savePass(){
  const cur=$("pwCur")?$("pwCur").value:"",n1=$("pwNew").value,n2=$("pwNew2").value;
  if($("pwCur")&&!cur)return setMsg("stPwMsg",t("v.pw.empty"),"bad");
  const e=pwErr(n1);if(e)return setMsg("stPwMsg",e,"bad");
  if(n1!==n2)return setMsg("stPwMsg",t("v.pw.diff"),"bad");
  if(cur&&cur===n1)return setMsg("stPwMsg",t("s.pass.same"),"bad");
  try{await api("/me/password","POST",{current:cur,password:n1});me.hasPassword=true;renderSettings();toast(t("s.pass.done"))}
  catch(er){setMsg("stPwMsg",er.status===401?t("s.pass.wrong"):er.message,"bad")}
}
;(window.__ok=window.__ok||[]).push("app-settings.js");
