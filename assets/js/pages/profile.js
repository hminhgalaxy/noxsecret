
import { db, TS } from "../lib/firebase.js";
import { session } from "../lib/auth.js";
import { PROFILES_NODE, PROFILE_IDS_NODE } from "../lib/config.js";
import { esc, toast } from "../lib/util.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const uid = () => session.user && session.user.uid;
const defaultHandle = () => "user_" + String(uid() || "").replace(/[^a-z0-9]/gi,"").slice(0,8).toLowerCase();
const imageData = (file, max, quality) => new Promise((resolve,reject)=>{
  if(!file || !file.type.startsWith("image/")) return reject(new Error("Vui lòng chọn tệp hình ảnh."));
  if(file.size > 12*1024*1024) return reject(new Error("Ảnh cần nhỏ hơn 12 MB."));
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{
    const scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;
    const ctx=c.getContext("2d");ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    resolve(c.toDataURL("image/jpeg",quality));
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Không đọc được ảnh."));};
  img.src=url;
});
const readProfile = async () => {
  if(!db || !uid()) throw new Error("Không thể kết nối hồ sơ lúc này.");
  const snap=await db.ref(PROFILES_NODE+"/"+uid()).once("value");
  return snap.val() || null;
};
const claimHandle = async handle => {
  const ref=db.ref(PROFILE_IDS_NODE+"/"+handle);
  const result=await ref.transaction(current=>current===null?uid():current);
  return !!(result.committed && result.snapshot.val()===uid());
};
const avatarFallback = user => user.photoURL || "";
const previewImage = (src,alt) => src ? `<img src="${esc(src)}" alt="${alt}">` : "";

export async function mount(ctx) {
  ctx.setPage({title:"Hồ sơ",sub:"Thông tin tài khoản và cách mọi người nhìn thấy bạn."});
  const user=session.user;
  if(!user) {ctx.navigate("/login",{replace:true});return;}
  let profile, avatar="", cover="", pendingAvatar=null,pendingCover=null;
  try {
    profile=await readProfile();
    if(!profile){
      const handle=defaultHandle();
      if(!await claimHandle(handle)) throw new Error("Không thể tạo mã hồ sơ. Vui lòng tải lại trang.");
      const now=TS();
      profile={displayName:user.displayName||"Thành viên",handle,avatarData:"",coverData:"",createdAt:now,displayNameChangedAt:now};
      await db.ref(PROFILES_NODE+"/"+uid()).set(profile);
    }
    avatar=profile.avatarData||avatarFallback(user);cover=profile.coverData||"";
  } catch(e) {
    ctx.el.innerHTML=`<div class="statebox err"><p>${esc(e.message||"Không tải được hồ sơ.")}</p><button class="btn btn-g" id="profileRetry">Thử lại</button></div>`;
    ctx.el.querySelector("#profileRetry")?.addEventListener("click",()=>ctx.navigate("/profile",{replace:true}));return;
  }

  ctx.el.innerHTML=`<section class="profile-page">
    <div class="profile-cover" id="coverPreview">${previewImage(cover,"Ảnh bìa")}<label class="btn btn-g cover-action" for="coverFile">Đổi ảnh bìa</label></div>
    <div class="profile-main"><div class="profile-avatar-wrap" id="avatarPreview">${avatar?`<img class="profile-avatar" src="${esc(avatar)}" alt="Ảnh đại diện">`:`<div class="profile-avatar"></div>`}</div>
      <div><div class="profile-name" id="profileName">${esc(profile.displayName||user.displayName||"Thành viên")}</div><div class="profile-id">ID: @${esc(profile.handle)}</div></div></div>
    <form class="profile-form" id="profileForm">
      <div class="fld wide"><label for="displayName">Tên hiển thị</label><input id="displayName" name="displayName" maxlength="40" value="${esc(profile.displayName||user.displayName||"")}" required>
        <p class="profile-help" id="nameRule"></p></div>
      <div class="fld"><label for="handle">ID tài khoản</label><div class="profile-handle"><span>@</span><input id="handle" name="handle" maxlength="20" value="${esc(profile.handle)}" required></div>
        <p class="profile-help" id="handleRule"></p></div>
      <div class="fld"><label>Email</label><input value="${esc(user.email||"")}" disabled></div>
      <div class="fld wide"><label>Ảnh đại diện</label><div class="profile-upload"><input id="avatarFile" type="file" accept="image/*"><span class="profile-help">Ảnh sẽ tự tối ưu trước khi lưu.</span></div></div>
      <input id="coverFile" type="file" accept="image/*" hidden>
      <div class="profile-actions wide"><button class="btn btn-p" type="submit" id="saveProfile">Lưu thay đổi</button><button class="btn btn-g" type="button" id="cancelProfile">Hủy</button></div>
      <p class="form-err wide" id="profileError" role="alert"></p>
    </form>
  </section>`;

  const form=ctx.el.querySelector("#profileForm"),error=ctx.el.querySelector("#profileError"),nameInput=form.displayName,handleInput=form.handle;
  const nameRule=ctx.el.querySelector("#nameRule"),handleRule=ctx.el.querySelector("#handleRule");
  const nameStamp=Number(profile.displayNameChangedAt)||Date.now(),nameRemaining=Math.max(0,WEEK-(Date.now()-nameStamp));
  const fmtDays=ms=>Math.ceil(ms/86400000);
  nameRule.textContent=nameRemaining>0?`Bạn có thể đổi tên sau ${fmtDays(nameRemaining)} ngày.`:"Bạn có thể đổi tên. Sau khi lưu, cần chờ 7 ngày để đổi tiếp.";
  const idUsed=!!profile.idChangedAt;
  handleInput.disabled=idUsed;
  handleRule.textContent=idUsed?"ID đã được đổi một lần và không thể thay đổi thêm.":"Bạn có thể đổi ID đúng một lần. Dùng 3–20 ký tự: chữ thường, số hoặc dấu gạch dưới.";
  const showPreview=(target,src,kind)=>{
    if(kind==="avatar") target.innerHTML=src?`<img class="profile-avatar" src="${esc(src)}" alt="Ảnh đại diện">`:`<div class="profile-avatar"></div>`;
    else target.innerHTML=src?`<img src="${esc(src)}" alt="Ảnh bìa">`:"";
  };
  ctx.el.querySelector("#avatarFile").addEventListener("change",async e=>{
    try{pendingAvatar=await imageData(e.target.files[0],640,.82);showPreview(ctx.el.querySelector("#avatarPreview"),pendingAvatar,"avatar");}
    catch(ex){error.textContent=ex.message;}
  });
  ctx.el.querySelector("#coverFile").addEventListener("change",async e=>{
    try{pendingCover=await imageData(e.target.files[0],1600,.78);showPreview(ctx.el.querySelector("#coverPreview"),pendingCover,"cover");}
    catch(ex){error.textContent=ex.message;}
  });
  nameInput.addEventListener("input",()=>ctx.el.querySelector("#profileName").textContent=nameInput.value);
  ctx.el.querySelector("#cancelProfile").addEventListener("click",()=>ctx.navigate("/profile",{replace:true}));
  form.addEventListener("submit",async e=>{
    e.preventDefault();error.textContent="";
    const nextName=nameInput.value.trim(),nextHandle=handleInput.value.trim().toLowerCase();
    if(!nextName || nextName.length>40){error.textContent="Tên hiển thị cần từ 1 đến 40 ký tự.";return;}
    if(nextName!==(profile.displayName||"") && nameRemaining>0){error.textContent=`Bạn cần chờ thêm ${fmtDays(nameRemaining)} ngày mới được đổi tên.`;return;}
    const changedHandle=nextHandle!==profile.handle;
    if(changedHandle && (idUsed || !HANDLE_RE.test(nextHandle))){error.textContent="ID không hợp lệ hoặc bạn đã sử dụng lượt đổi ID.";return;}
    const btn=ctx.el.querySelector("#saveProfile");btn.disabled=true;btn.textContent="Đang lưu…";
    try{
      if(changedHandle && !await claimHandle(nextHandle)) throw new Error("ID này đã có người sử dụng.");
      const patch={displayName:nextName,updatedAt:TS()};
      if(nextName!==(profile.displayName||"")) patch.displayNameChangedAt=TS();
      if(changedHandle){patch.handle=nextHandle;patch.idChangedAt=TS();}
      if(pendingAvatar) patch.avatarData=pendingAvatar;
      if(pendingCover) patch.coverData=pendingCover;
      await db.ref(PROFILES_NODE+"/"+uid()).update(patch);
      try{if(nextName!==user.displayName) await user.updateProfile({displayName:nextName});}catch(_){}
      toast("Đã lưu hồ sơ.");
      ctx.navigate("/profile",{replace:true});
    }catch(ex){error.textContent=ex.message||"Không thể lưu thay đổi.";}
    finally{btn.disabled=false;btn.textContent="Lưu thay đổi";}
  });
}
