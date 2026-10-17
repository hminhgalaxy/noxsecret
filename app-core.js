/* ===== CẤU HÌNH ===== */
/* Cấu hình Firebase nằm ở js/firebase-config.js (tách riêng, không liên quan Google). Đăng nhập/đăng ký nằm ở login.html + register.html. */
const firebaseConfig=window.FIREBASE_CONFIG||{};
const DEV_EMAIL="hminhgalaxy@gmail.com";   /* Gmail của chủ web: tự mở Dev Panel (quyền ghi thật vẫn do Rules kiểm tra) */
let DB_URL=firebaseConfig.databaseURL; // đọc dữ liệu công khai (bài, game, mục, cấu hình) — tự dò lại đúng khu vực ở pickDb()
const API="/api"; // chỉ còn là đường dự phòng; mọi thao tác đã được xử lý bằng Firebase trong localApi()
const $=id=>document.getElementById(id);

/* ===== NGÔN NGỮ (vi / en) ===== */
const I={vi:{},en:{}};
const D=(k,v,e)=>{I.vi[k]=v;I.en[k]=e===undefined?v:e};
let lang="en";try{lang=localStorage.getItem("lang")==="vi"?"vi":"en"}catch(e){}
const t=(k,...a)=>{let s=I[lang][k];if(s===undefined)s=I.vi[k];if(s===undefined)s=k;a.forEach((v,i)=>{s=s.split("{"+i+"}").join(v)});return s};
/* Backend /api chưa có (404) hoặc DB công khai chưa cho đọc (401/403) => coi như chưa có nội dung, hiện "No post" thay vì báo lỗi */
const gone=e=>!!e&&!e.net&&(e.status===404||e.status===401||e.status===403);
const loc=()=>lang==="en"?"en-GB":"vi-VN";
function hideBoot(){const b=document.getElementById("boot");if(b&&!b.hidden){b.classList.add("off");setTimeout(()=>{b.hidden=true},300)}}
/* chung */
D("ok","Đồng ý","OK");D("cancel","Hủy","Cancel");D("save","Lưu","Save");D("close","Đóng","Close");D("back","Quay lại","Back");
D("del","Xóa","Delete");D("edit","Sửa","Edit");D("more","Tải thêm","Load more");D("reload","Tải lại","Reload");D("clear","Bỏ lọc","Clear filter");
D("hidden","Đang ẩn","Hidden");D("login","Đăng nhập","Log in");D("register","Đăng ký","Sign up");D("logout","Đăng xuất","Log out");
D("send","Gửi","Send");D("copy","Sao chép","Copy");D("copied","Đã sao chép","Copied");D("linkcopied","Đã sao chép liên kết","Link copied");
D("share","Chia sẻ","Share");D("report","Báo cáo","Report");D("open","Mở","Open");D("download","Tải xuống","Download");
D("anon","Ẩn danh","Anonymous");D("now","Vừa xong","Just now");D("m.ago","{0} phút trước","{0}m ago");D("h.ago","{0} giờ trước","{0}h ago");D("d.ago","{0} ngày trước","{0}d ago");
D("deleted","Đã xóa","Deleted");D("saved","Đã lưu","Saved");D("search","Tìm kiếm","Search");D("search.ph","Tìm bài, game, người đăng, tag…","Search posts, games, authors, tags…");
D("up.ing","Đang tải ảnh lên…","Uploading image…");D("up.ok","Đã tải ảnh lên","Image uploaded");D("img.bad","Không đọc được ảnh (định dạng không hợp lệ)","Couldn't read this image");
/* lỗi + trạng thái */
D("e.gen","Chưa thực hiện được. Hãy thử lại.","That didn't work. Please try again.");
D("e.unavail","Tính năng này chưa sẵn sàng.","This feature isn't available yet.");
D("e.server","Máy chủ đang bận. Hãy thử lại sau ít phút.","The server is busy. Try again in a few minutes.");
D("e.expired","Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.","Your session expired. Please log in again.");
D("e.400","Dữ liệu không hợp lệ","Invalid data");D("e.401","Chưa đăng nhập hoặc sai thông tin","Not logged in or wrong details");
D("e.403","Bạn không có quyền thực hiện thao tác này","You don't have permission to do this");D("e.404","Không tìm thấy","Not found");
D("e.409","Dữ liệu đã tồn tại","Already exists");D("e.413","Dữ liệu quá lớn","Too large");D("e.429","Thao tác quá nhanh, hãy thử lại sau","Too many requests, try again later");
D("e.code","Lỗi ({0})","Error ({0})");D("e.bad","Máy chủ trả về dữ liệu không đọc được. Hãy thử lại.","Unreadable response. Please try again.");
D("e.load","Chưa tải được nội dung","Content didn't load");D("e.loadsub","Nhấn tải lại để thử lần nữa.","Press reload to try again.");
D("home.title","Mới nhất","Latest");D("home.none","No post","No post");D("home.nomatch","Không tìm thấy bài phù hợp.","No matching posts.");
D("games.title","Chọn game","Choose a game");D("games.none","Chưa có game nào.","No games yet.");
D("liked.title","Bài đã thích","Liked posts");D("liked.none","Bạn chưa thả tim bài nào.","You haven't liked any posts.");
D("mine.title","Bài của tôi","My posts");D("mine.none","Bạn chưa có bài nào.","You have no posts yet.");
/* menu */
D("nav.menu","Mở menu","Open menu");D("nav.closemenu","Đóng menu","Close menu");D("nav.home","Trang chủ","Home");D("nav.games","Game","Games");
D("nav.liked","Đã thích","Liked");D("nav.mine","Bài của tôi","My posts");D("nav.post","Đăng bài","New post");D("nav.inbox","Hòm thư","Inbox");
D("nav.report","Báo cáo","Report");D("nav.settings","Cài đặt","Settings");D("pop.cats","Các mục","Sections");D("pop.sort","Sắp xếp","Sort");
D("sort.new","Mới nhất","Newest");D("sort.views","Xem nhiều","Most viewed");D("sort.likes","Nhiều tim","Most liked");D("all","Tất cả","All");D("newcat","+ Mục mới","+ New section");
/* bài */
D("c.by","Ghi chú: {0}","Note: {0}");D("v.like","Thả tim","Like");D("v.star","{0} sao","{0} stars");D("v.n","{0} đánh giá","{0} ratings");
D("posted","Đăng {0}","Posted {0}");D("edited"," · Sửa {0}"," · Edited {0}");D("created","Tạo {0}","Created {0}");
D("d.confirm","Xóa bài này?","Delete this post?");D("d.confirm.t","Bài sẽ bị xóa vĩnh viễn.","This post will be permanently deleted.");D("locked","Đã khóa","Locked");
D("reason","Lý do: {0}","Reason: {0}");D("feat","★ Nổi bật","★ Featured");D("pinned","Ghim","Pinned");
/* form đăng bài */
D("f.title","Đăng / sửa bài","Create / edit post");D("f.t","Tiêu đề *","Title *");D("f.cat","Mục *","Section *");D("f.newcat","+ Mục mới","+ New section");
D("f.nocat","— Chưa có mục (dev cần tạo) —","— No sections yet (dev must create one) —");D("f.game","Game","Game");D("f.nogame","— Không chọn —","— None —");
D("f.desc","Mô tả","Description");D("f.thumb","Ảnh thumbnail","Thumbnail");D("f.thumb.ph","URL https hoặc tải ảnh lên","https URL or upload an image");D("f.upload","Tải ảnh lên","Upload");
D("f.more","Ảnh thêm (tối đa 4)","More images (max 4)");D("f.addimg","Thêm ảnh","Add image");D("f.max4","Tối đa 4 ảnh thêm","Max 4 extra images");
D("f.code","Code / nội dung để sao chép","Code / text to copy");D("f.url","Link mở","Open link");D("f.dl","Link tải xuống","Download link");D("f.ver","Phiên bản","Version");
D("f.tags","Tag (cách nhau bằng dấu phẩy)","Tags (comma separated)");D("f.note","Ghi chú / tương thích","Note / compatibility");D("f.submit","Gửi bài","Submit");
D("f.needt","Cần nhập tiêu đề","A title is required");D("f.needcat","Chưa có mục nào để đăng. Dev cần tạo mục trong Dev Panel.","No sections to post in yet. A dev must create one in the Dev Panel.");
D("f.badurl","URL phải bắt đầu bằng http(s)://","URLs must start with http(s)://");D("f.badthumb","Ảnh thumbnail không hợp lệ","Invalid thumbnail");D("f.sending","Đang gửi…","Sending…");
D("f.sent","Đã gửi bài","Post submitted");D("f.pending","Đã gửi bài, đang chờ dev duyệt","Submitted — waiting for review");D("f.onlydev","Chỉ dev mới có thể thêm mục.","Only devs can add sections.");
/* tài khoản */
D("a.title.reg","Tạo tài khoản","Create account");D("a.name","Tên hiển thị (không có khoảng trắng)","Display name (no spaces)");D("a.name.ph","vd: skibidi_fan","e.g. skibidi_fan");
D("a.pw","Mật khẩu","Password");D("a.pw2","Nhập lại mật khẩu","Repeat password");D("a.showpw","Hiện mật khẩu","Show password");D("a.hidepw","Ẩn mật khẩu","Hide password");
D("a.profile","Hồ sơ của tôi","My profile");
D("v.name.empty","Vui lòng nhập tên hiển thị","Enter a display name");D("v.name.space","Tên không được chứa khoảng trắng","Name can't contain spaces");
D("v.name.short","Tên quá ngắn (tối thiểu 3 ký tự)","Name is too short (min 3 characters)");D("v.name.long","Tên quá dài (tối đa 24 ký tự)","Name is too long (max 24 characters)");
D("v.name.chars","Tên chỉ gồm chữ, số và dấu _","Use letters, numbers and _ only");
D("v.em.empty","Vui lòng nhập Gmail","Enter your Gmail");D("v.em.space","Gmail không được chứa khoảng trắng","Gmail can't contain spaces");
D("v.em.at","Thiếu ký tự @ (ví dụ: example@gmail.com)","Missing @ (e.g. example@gmail.com)");D("v.em.at2","Gmail chỉ được có một ký tự @","Only one @ allowed");
D("v.em.dom","Chỉ chấp nhận địa chỉ có đuôi @gmail.com","Only @gmail.com addresses are accepted");D("v.em.len","Phần trước @gmail.com phải dài 6–30 ký tự","The part before @gmail.com must be 6–30 characters");
D("v.em.chars","Gmail chỉ được dùng chữ cái, số và dấu chấm","Use letters, numbers and dots only");D("v.em.dots","Dấu chấm không được ở đầu, cuối hoặc đứng liền nhau","Dots can't be first, last or doubled");
D("v.em.ok","Gmail hợp lệ","Gmail looks good");
D("v.pw.empty","Vui lòng nhập mật khẩu","Enter a password");D("v.pw.space","Mật khẩu không được chứa khoảng trắng","Password can't contain spaces");
D("v.pw.weak","Mật khẩu quá yếu: cần ít nhất 8 ký tự, có chữ hoa và ký tự đặc biệt (! @ # $ …)","Too weak: use 8+ characters with an uppercase letter and a symbol (! @ # $ …)");
D("v.pw.again","Vui lòng nhập lại mật khẩu","Repeat the password");D("v.pw.diff","Mật khẩu nhập lại không khớp","Passwords don't match");D("v.pw.same","Mật khẩu khớp","Passwords match");
D("pw.l1","Yếu — chưa thể sử dụng","Weak — can't be used");D("pw.l2","Trung bình — chấp nhận được","Fair — acceptable");D("pw.l3","Mạnh","Strong");
D("pw.r1","Ít nhất 8 ký tự","At least 8 characters");D("pw.r2","Có chữ hoa (A–Z)","An uppercase letter (A–Z)");D("pw.r3","Có ký tự đặc biệt (! @ # $ …)","A symbol (! @ # $ …)");
D("n.checking","Đang kiểm tra tên…","Checking name…");D("n.ok","Tên hợp lệ, có thể dùng","Name is available");D("n.taken","Tên này đã có người sử dụng","This name is taken");D("n.nocheck","Tên hợp lệ (chưa kiểm tra được trùng tên)","Name looks valid (couldn't check availability)");
D("auth.invalid","Thông tin chưa hợp lệ. Hãy sửa các mục báo đỏ phía trên.","Some details are invalid. Fix the fields marked in red.");
D("auth.nametaken","Tên hiển thị đã có người sử dụng. Hãy chọn tên khác.","That name is taken. Choose another.");
D("auth.locked","Bạn đã thử sai nhiều lần. Vui lòng thử lại sau {0} giây.","Too many attempts. Try again in {0}s.");D("auth.lock30"," Đã tạm khóa đăng nhập 30 giây."," Login is paused for 30 seconds.");
D("auth.wrong","Sai Gmail hoặc mật khẩu.","Wrong Gmail or password.");D("auth.exists","Gmail hoặc tên hiển thị đã được đăng ký.","That Gmail or name is already registered.");
D("auth.wait","Đang xử lý…","Working…");D("auth.hello","Xin chào {0}","Welcome, {0}");D("auth.hello.reg","Xin chào {0} · ID {1}","Welcome, {0} · ID {1}");
D("g.fail","Không tải được nút đăng nhập Google. Hãy thử tải lại trang.","Google sign-in couldn't load. Try reloading the page.");
D("fb.noload","Không kết nối được. Kiểm tra mạng rồi tải lại trang.","Couldn't connect. Check your connection and reload the page.");
D("fb.off","Cách đăng nhập này đang tạm thời chưa dùng được.","This sign-in method is temporarily unavailable.");
D("fb.rules","Chưa thực hiện được thao tác này. Hãy thử lại sau hoặc đăng nhập lại.","That action couldn't be completed. Try again later or log in again.");
D("fb.google","Đăng nhập Google chưa thành công. Hãy thử lại.","Google sign-in didn't work. Please try again.");
D("fb.diff","Gmail này đã dùng cách đăng nhập khác. Hãy đăng nhập bằng cách bạn đã dùng lúc đầu.","This Gmail uses a different sign-in method. Log in the way you first did.");
D("fb.config","Hệ thống đăng nhập đang tạm thời chưa dùng được. Hãy thử lại sau ít phút.","Sign-in is temporarily unavailable. Please try again in a few minutes.");
D("fb.domain","Hệ thống đăng nhập đang tạm thời chưa dùng được. Hãy thử lại sau ít phút.","Sign-in is temporarily unavailable. Please try again in a few minutes.");
D("g.popup","Đăng nhập Google bằng cửa sổ riêng","Sign in with Google in a popup");
D("g.popup.closed","Cửa sổ Google đã bị đóng hoặc bị chặn. Hãy cho phép popup rồi thử lại.","The Google window was closed or blocked. Allow popups and try again.");
D("fb.recent","Hãy đăng nhập lại rồi thử lần nữa.","Please log in again and retry.");
D("g.nocred","Google không trả về thông tin đăng nhập. Hãy thử lại.","Google returned no credentials. Please try again.");D("g.verify","Đang xác thực với Google…","Verifying with Google…");
D("dv.google","Bạn đang đăng nhập bằng Google nên Dev Panel chỉ để xem. Muốn quản trị: đăng ký tài khoản bằng chính Gmail này (Gmail + mật khẩu) rồi xác minh email.","You signed in with Google, so the Dev Panel is view-only. To manage the site, sign up with this same Gmail (Gmail + password) and verify the email.");
D("dv.verify","Hãy xác minh Gmail của bạn để mở toàn bộ quyền quản trị.","Verify your Gmail to unlock full admin access.");
D("dv.send","Gửi email xác minh","Send verification email");D("dv.done","Tôi đã xác minh","I've verified");
D("dv.sent","Đã gửi email. Hãy mở hộp thư và bấm vào liên kết.","Email sent. Open your inbox and tap the link.");D("dv.ok","Đã xác minh. Quyền quản trị đã mở.","Verified. Admin access is on.");D("dv.not","Chưa thấy xác minh. Hãy bấm vào liên kết trong email rồi thử lại.","Not verified yet. Tap the link in the email, then try again.");
/* World */
D("w.tab.posts","Bài viết","Posts");D("w.tab.groups","Nhóm chat","Group chats");D("w.login","Đăng nhập để đăng bài và trò chuyện cùng mọi người.","Log in to post and chat with everyone.");
D("w.ph","Bạn đang nghĩ gì?","What's on your mind?");D("w.img","Ảnh","Image");D("w.max4","Tối đa 4 ảnh","Max 4 images");D("w.post","Đăng","Post");D("w.empty","Hãy viết gì đó hoặc thêm ảnh","Write something or add an image");
D("w.none","Chưa có bài viết","No post");D("w.replies","Trả lời","Reply");D("w.reply.ph","Viết trả lời…","Write a reply…");
D("w.reply.login","Đăng nhập để trả lời","Log in to reply");D("w.del.t","Xóa bài viết này?","Delete this post?");D("w.delr.t","Xóa trả lời này?","Delete this reply?");
D("g.hint","Tạo nhóm và trò chuyện trực tiếp.","Create a group and chat live.");D("g.new","Tạo nhóm","New group");D("g.none","Chưa có nhóm nào","No group");
D("g.joined","Đã tham gia","Joined");D("g.members","{0} thành viên","{0} members");D("g.name","Tên nhóm *","Group name *");D("g.desc","Mô tả ngắn","Short description");
D("g.img","Ảnh nhóm","Group image");D("g.img.ph","Chưa chọn ảnh","No image chosen");D("g.pw.opt","Mật khẩu nhóm (không bắt buộc)","Group password (optional)");
D("g.pw.hint","Để trống nếu muốn nhóm mở. Có mật khẩu thì ai vào cũng phải nhập.","Leave empty for an open group. Otherwise everyone must enter it to join.");
D("g.create","Tạo nhóm","Create group");D("g.nameshort","Tên nhóm cần ít nhất 2 ký tự","Group name needs at least 2 characters");D("g.pwshort","Mật khẩu cần ít nhất 4 ký tự","Password needs at least 4 characters");
D("g.needpw","Nhóm này có mật khẩu. Nhập để tham gia.","This group is password protected. Enter it to join.");D("g.pw","Mật khẩu nhóm","Group password");D("g.join","Tham gia","Join");
D("g.wrongpw","Sai mật khẩu nhóm.","Wrong group password.");D("g.leave","Rời nhóm","Leave group");D("g.leave.t","Bạn sẽ không nhận tin nhắn của nhóm này nữa.","You'll stop receiving messages from this group.");
D("g.setpw","Mật khẩu nhóm","Group password");D("g.setpw.t","Nhập mật khẩu mới, hoặc để trống để gỡ mật khẩu.","Enter a new password, or leave empty to remove it.");
D("g.pw.none","Để trống = không mật khẩu","Empty = no password");D("g.pwset","Đã cập nhật mật khẩu nhóm","Group password updated");D("g.delete","Xóa nhóm","Delete group");D("g.delete.t","Nhóm và toàn bộ tin nhắn sẽ bị xóa.","The group and all its messages will be deleted.");
D("c.ph","Nhắn tin…","Message…");D("c.empty","Chưa có tin nhắn. Hãy chào mọi người!","No messages yet. Say hi!");
/* Hòm thư */
D("in.support","Liên hệ dev","Contact dev");D("in.none","Hòm thư trống. Tin nhắn và phản hồi từ dev sẽ hiện ở đây.","Your inbox is empty. Messages and replies from devs will show up here.");
D("in.ph","Nhập tin nhắn…","Type a message…");D("in.empty","Chưa có tin nhắn nào trong cuộc trò chuyện này.","No messages in this conversation yet.");D("in.msg","Nhắn tin","Message");
/* Báo cáo */
D("r.title","Gửi báo cáo cho dev","Send a report to the devs");D("r.general","Báo cáo chung về trang web.","General report about the site.");D("r.about","Về: {0}","About: {0}");
D("r.kind","Bạn gặp vấn đề gì?","What's the problem?");D("r.sev","Tình trạng","Urgency");D("r.text","Mô tả chi tiết","Details");
D("r.text.ph","Nêu rõ chuyện gì đã xảy ra, ở đâu, và bạn cần dev hỗ trợ gì.","Say what happened, where, and what help you need.");
D("r.note","Báo cáo được gửi vào hòm thư của dev. Phản hồi sẽ đến hòm thư của bạn.","Your report goes to the devs' inbox. Replies arrive in your inbox.");
D("r.send","Gửi tới dev","Send to devs");D("r.short","Hãy mô tả ít nhất 10 ký tự","Please write at least 10 characters");D("r.sent","Đã gửi tới dev. Phản hồi sẽ đến hòm thư của bạn.","Sent. Replies will arrive in your inbox.");
D("rk.bug","Lỗi / không hoạt động","Bug / not working");D("rk.link","Link hỏng hoặc sai","Broken or wrong link");D("rk.abuse","Nội dung vi phạm","Inappropriate content");
D("rk.account","Vấn đề tài khoản","Account problem");D("rk.idea","Góp ý / đề xuất","Feedback / idea");D("rk.other","Khác","Other");
D("rs.low","Không gấp","Not urgent");D("rs.mid","Cần xem sớm","Needs attention");D("rs.high","Khẩn cấp","Urgent");
/* Hồ sơ + cài đặt */
D("p.posts","Bài đăng","Posts");D("p.likes","Lượt tim","Likes");D("p.joined","Tham gia","Joined");D("p.edit","Sửa hồ sơ","Edit profile");D("p.none","No post","No post");
D("p.nobio","Chưa có giới thiệu.","No bio yet.");D("p.notfound","Không tìm thấy người dùng này.","User not found.");
D("s.theme","Giao diện","Appearance");D("s.light","Sáng","Light");D("s.dark","Tối","Dark");D("s.system","Theo máy","System");D("s.lang","Ngôn ngữ","Language");
D("s.profile","Hồ sơ","Profile");D("s.avatar","Đổi ảnh đại diện","Change avatar");D("s.bio","Giới thiệu","Bio");D("s.bio.ph","Vài dòng về bạn…","A few words about you…");
D("s.name","Tên đăng nhập","Username");D("s.pass","Đổi mật khẩu","Change password");D("s.pass.cur","Mật khẩu hiện tại","Current password");D("s.pass.new","Mật khẩu mới","New password");D("s.pass.new2","Nhập lại mật khẩu mới","Repeat new password");
D("s.gmail","Gmail","Gmail");D("s.gmail.none","Chưa gắn Gmail.","No Gmail linked.");D("s.gmail.link","Gắn tài khoản Google để đăng nhập nhanh và khôi phục tài khoản.","Link your Google account for quick login and recovery.");D("s.gmail.done","Đã gắn Gmail","Gmail linked");
D("s.guest","Đăng nhập để chỉnh sửa hồ sơ, tên, mật khẩu và Gmail.","Log in to edit your profile, name, password and Gmail.");D("s.name.done","Đã đổi tên đăng nhập","Username updated");D("s.pass.done","Đã đổi mật khẩu","Password updated");D("s.profile.done","Đã cập nhật hồ sơ","Profile updated");
D("s.name.same","Đây đã là tên hiện tại của bạn","That's already your name");
D("s.name.hint","Tên đăng nhập chỉ đổi được 7 ngày một lần.","You can change your username once every 7 days.");
D("s.name.cool","Bạn vừa đổi tên gần đây. Có thể đổi lại sau {0}.","You changed your name recently. You can change it again after {0}.");
D("s.name.confirm","Đổi tên đăng nhập?","Change username?");D("s.name.confirm.t","Sau khi đổi, bạn phải chờ 7 ngày mới đổi được lần nữa.","After this you must wait 7 days before changing it again.");
D("s.id","ID người dùng","User ID");D("s.id.now","ID hiện tại: {0}","Current ID: {0}");
D("s.id.hint","Bạn có thể tự đặt ID tùy thích (3–20 ký tự: chữ không dấu, số, _). Chỉ đổi được 1 lần duy nhất, sau đó khóa vĩnh viễn.","Pick any ID you like (3–20 characters: letters, numbers, _). You can set it only ONCE — after that it's locked forever.");
D("s.id.ph","vd: skibidi_king","e.g. skibidi_king");D("s.id.save","Đặt ID","Set ID");
D("s.id.confirm","Đặt ID này?","Set this ID?");D("s.id.confirm.t","ID {0} sẽ bị khóa vĩnh viễn, bạn không thể đổi lại.","ID {0} will be locked permanently. You won't be able to change it again.");
D("s.id.locked","ID của bạn đã được đặt và không thể thay đổi nữa.","Your ID is set and can no longer be changed.");
D("s.id.taken","ID này đã có người sử dụng.","This ID is already taken.");D("s.id.done","Đã đặt ID","ID set");
D("v.id.empty","Vui lòng nhập ID","Enter an ID");D("v.id.short","ID quá ngắn (tối thiểu 3 ký tự)","ID is too short (min 3 characters)");D("v.id.long","ID quá dài (tối đa 20 ký tự)","ID is too long (max 20 characters)");D("v.id.chars","ID chỉ gồm chữ không dấu, số và dấu _","Use letters (A–Z), numbers and _ only");
D("s.pass.wrong","Mật khẩu hiện tại không đúng.","Current password is incorrect.");D("s.pass.same","Mật khẩu mới phải khác mật khẩu hiện tại.","New password must differ from the current one.");
D("p.unknown","Người dùng","User");
/* Báo cáo, lọc */
D("dev.reply","Trả lời","Reply");
/* Chia sẻ */
D("sh.copy","Sao chép liên kết","Copy link");D("sh.app","Chia sẻ qua ứng dụng khác","Share via another app");
D("sh.nosupport","Thiết bị hoặc trình duyệt này không hỗ trợ chia sẻ qua ứng dụng khác. Hãy sao chép liên kết.","This device or browser can't share to other apps. Copy the link instead.");
D("sh.fail","Không sao chép được liên kết. Hãy nhấn vào ô liên kết rồi chép thủ công.","Couldn't copy the link. Tap the link box and copy it manually.");
D("sh.err","Chưa chia sẻ được. Hãy thử lại.","Couldn't share. Please try again.");
D("sh.badid","Nội dung này chưa có liên kết hợp lệ.","This item doesn't have a valid link.");
D("sh.gone","Nội dung này đã bị xóa hoặc không tồn tại.","This content was deleted or doesn't exist.");
D("sh.denied","Bạn không có quyền xem nội dung này.","You don't have permission to view this content.");
D("sh.denied.login","Hãy đăng nhập để xem nội dung này.","Log in to view this content.");
D("sh.loaderr","Chưa tải được nội dung được chia sẻ.","The shared content didn't load.");
D("sh.home","Về trang chủ","Go to home");D("sh.shared","Bạn đang xem bài viết được chia sẻ.","You're viewing a shared post.");
D("sh.all","Xem tất cả bài viết","View all posts");D("sh.wtitle","Bài viết của {0} trên World","World post by {0}");
const T0=document.title,D0=document.querySelector('meta[name=description]').content;

/* ===== ICON ===== */
const P={
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1z"/>',
game:'<path d="M6 12h4M8 10v4M15 11.5h.01M18 13.5h.01"/><path d="M5.5 6h13a3.5 3.5 0 0 1 3.4 4.2l-1 5.2a2.6 2.6 0 0 1-4.4 1.4L15 15.5H9l-1.5 1.3a2.6 2.6 0 0 1-4.4-1.4l-1-5.2A3.5 3.5 0 0 1 5.5 6z"/>',
world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.200 3 14.800 0 18M12 3c-3 3.200-3 14.800 0 18"/>',
heart:'<path d="M19 14c1.490-1.460 3-3.210 3-5.500A5.500 5.500 0 0 0 16.500 3c-1.760 0-3 .5-4.500 2-1.500-1.500-2.740-2-4.500-2A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4.050 3 5.500l7 7Z"/>',
doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
gear:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.400 3.600-7 8-7s8 2.600 8 7"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
moon:'<path d="M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
up:'<path d="m6 15 6-6 6 6"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.600"/><path d="m21 16-5-5-9 9"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
users:'<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c0-3.600 2.900-6 6.500-6s6.500 2.400 6.500 6M16 4.600a3.500 3.500 0 0 1 0 6.800M18 14.500c2.200.8 3.500 2.700 3.500 5.500"/>',
back:'<path d="M15 5l-7 7 7 7"/>',
eye:'<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
eyeoff:'<path d="M3 3l18 18M10.600 5.100A10 10 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-3.200 4M6.600 6.600A17 17 0 0 0 2 12s3.600 7 10 7a10 10 0 0 0 4.400-1M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
shield:'<path d="M12 3 4 6v6c0 5 3.500 8 8 9 4.500-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
logout:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
msg:'<path d="M21 12a8 8 0 0 1-11.500 7.200L3 21l1.800-6A8 8 0 1 1 21 12z"/>',
star:'<path d="m12 3 2.800 5.800 6.200.9-4.500 4.400 1.100 6.200L12 17.300 6.400 20.300l1.100-6.200L3 9.700l6.200-.9z"/>',
hash:'<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
eyeview:'<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/>',
share:'<path d="M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
link:'<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>'
};
const svg=(n,s=18)=>`<svg class="si" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${P[n]||""}</svg>`;
function applyIcons(root){(root||document).querySelectorAll("[data-ic]").forEach(e=>{e.innerHTML=svg(e.dataset.ic,+e.dataset.s||18)})}
function applyStatic(){
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i]").forEach(e=>{e.textContent=t(e.dataset.i)});
  document.querySelectorAll("[data-ip]").forEach(e=>{e.placeholder=t(e.dataset.ip)});
  document.querySelectorAll("[data-ia]").forEach(e=>{e.setAttribute("aria-label",t(e.dataset.ia))});
}

/* ===== TIỆN ÍCH ===== */
const BASE=["SCRIPT","APK","IOS","LINK"],BN={SCRIPT:"Script",APK:"APK",IOS:"iOS",LINK:"Link"},PAGE=24;
const DEFACT={SCRIPT:["detail","copy"],APK:["detail","download","open"],IOS:["detail","open","download"],LINK:["detail","open"]};
let me=null,authReady=false,games={},cats={},siteCfg={},all=[],limit=PAGE,view="home",viewArg="",viewReady=false,homeDirty=true,curType="",curGame="",sortBy="new",editing=null,gal=[],curPosts={},myVotes={},openId=null,loadKey="",unread=0;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsq=s=>esc(JSON.stringify(String(s))); /* chuỗi JS an toàn trong thuộc tính onclick */
const safeUrl=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:""}catch{return ""}};
const imgSrc=v=>typeof v==="string"&&v.length<700000&&/^data:image\/(?:jpeg|png|webp);base64,/.test(v)?v:/^img:[\w-]{1,40}$/.test(v||"")?API+"/img/"+v.slice(4):safeUrl(v);
const bgs=u=>{const s=imgSrc(u);return s?`background-image:url(&quot;${esc(s.replace(/["'()\\\s<>]/g,c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0")))}&quot;)`:""};
const fmt=ts=>new Date(ts).toLocaleString(loc(),{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit",year:"numeric"});
const hm=ts=>new Date(ts).toLocaleTimeString(loc(),{hour:"2-digit",minute:"2-digit"});
function ago(ts){const s=Math.max(0,(Date.now()-ts)/1000);if(s<60)return t("now");if(s<3600)return t("m.ago",Math.floor(s/60));if(s<86400)return t("h.ago",Math.floor(s/3600));if(s<604800)return t("d.ago",Math.floor(s/86400));return new Date(ts).toLocaleDateString(loc())}
const avatar=(n,pic,big)=>`<span class="av${big===true?" l":big==="xl"?" xl":""}">${esc((n||"?").trim().charAt(0).toUpperCase())}${/^u:[\w-]{1,40}$/.test(pic||"")?`<img data-u="${esc(pic.slice(2))}" alt="" loading="lazy" onerror="this.remove()">`:imgSrc(pic)?`<img src="${esc(imgSrc(pic))}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">`:""}</span>`;
/* ảnh đại diện lưu trong hồ sơ được tải lười theo uid, để bài/tin nhắn không phải mang theo ảnh nặng */
const picC={};
function hydratePics(){document.querySelectorAll("img[data-u]").forEach(i=>{const id=i.dataset.u;i.removeAttribute("data-u");(picC[id]=picC[id]||dbGet("pub/users/"+encodeURIComponent(id)+"/pic").catch(()=>null)).then(v=>{const sr=v&&imgSrc(v);if(sr)i.src=sr;else i.remove()})})}
const imgsHtml=a=>{a=(a||[]).filter(i=>imgSrc(i));return a.length?`<div class="gal${a.length===1?" n1":""}">${a.map(i=>`<img class="gi" src="${esc(imgSrc(i))}" alt="" loading="lazy" onclick="viewImg(this.src)">`).join("")}</div>`:""};
const devTag=r=>r==="dev"?'<em class="tag bd">DEV</em>':"";
const idOf=u=>u&&u.handle?"@"+u.handle:(u&&u.userId)||"";
new MutationObserver(()=>hydratePics()).observe(document.documentElement,{childList:true,subtree:true});
function viewImg(src){$("bigImg").src=src;openM($("mImg"))}
function toast(m){
  const el=$("toast");el.textContent="";
  const s=document.createElement("span");s.textContent=m;
  const b=document.createElement("button");b.className="tx";b.type="button";b.setAttribute("aria-label",t("close"));b.textContent="✕";b.onclick=()=>{el.style.display="none"};
  el.append(s,b);el.style.display="flex";clearTimeout(el._t);el._t=setTimeout(()=>{el.style.display="none"},4500);
}
function setMsg(id,txt,k){const el=$(id);el.textContent=txt||"";el.className="fm"+(id==="aMsg"?" al":"")+(k?" "+k:"")}
const openM=m=>{m.classList.add("on");document.body.classList.add("lock")};
const closeM=m=>{m.classList.remove("on");document.body.classList.toggle("lock",!!document.querySelector(".modal.on"))};

/* Trạng thái vùng nội dung: loading | success | empty | error.
   Lỗi tải: tự thử lại âm thầm vài lần, sau đó hiện nút "Tải lại" — không nêu chi tiết kỹ thuật. */
function skel(kind){
  if(kind==="cards")return Array.from({length:6},()=>'<div class="card sk"><div class="th"></div><div class="cb"><i style="width:70%"></i><i></i><i style="width:45%"></i></div></div>').join("");
  if(kind==="list")return Array.from({length:3},()=>'<div class="item sk"><i style="width:55%"></i></div>').join("");
  return '<div class="st"><div class="sp"></div></div>';
}
function region(el,state,msg,retry){
  clearTimeout(el._rt);el.dataset.state=state;
  if(state==="success"){el._n=0;return}
  if(state==="empty"){el._n=0;el.innerHTML=`<div class="st"><span class="sti">${svg("doc",22)}</span><span>${esc(msg)}</span></div>`;return}
  if(state==="error"){
    console.warn("[load]",msg);
    const n=el._n=(el._n||0)+1;
    if(n<=2&&retry){el.innerHTML=skel(el.dataset.sk);el._rt=setTimeout(retry,700*n);return}
    el._n=0;
    el.innerHTML=`<div class="st"><span class="sti">${svg("doc",22)}</span><b>${esc(t("e.load"))}</b><span>${esc(t("e.loadsub"))}</span><button class="pri" data-rt>${esc(t("reload"))}</button></div>`;
    const b=el.querySelector("[data-rt]");if(b&&retry)b.onclick=()=>{b.disabled=true;retry()};
    return;
  }
  el.innerHTML=skel(el.dataset.sk);
}

/* ===== HỘP THOẠI (thay cho confirm / prompt) ===== */
let askRes=null;
function ask(o){
  return new Promise(res=>{
    askRes=res;$("askT").textContent=o.title||"";$("askD").textContent=o.text||"";
    $("askIn").innerHTML=o.input?`<div class="pw"><input id="askI" type="${o.input}" maxlength="${o.max||64}" placeholder="${esc(o.ph||"")}" autocomplete="off" value="${esc(o.value||"")}">${o.input==="password"?`<button type="button" class="eye" onclick="eye('askI',this)">${svg("eye")}</button>`:""}</div>`:"";
    $("askOk").textContent=o.ok||t("ok");$("askOk").className=o.danger?"danger-b":"pri";$("askNo").textContent=t("cancel");
    $("askErr").textContent="";openM($("mAsk"));
    const i=$("askI");if(i){setTimeout(()=>i.focus(),60);i.onkeydown=e=>{if(e.key==="Enter")$("askOk").click()}}
    $("askOk").onclick=()=>{const v=i?i.value:true;if(o.validate){const e=o.validate(v);if(e){$("askErr").textContent=e;return}}askDone(v)};
    $("askNo").onclick=()=>askDone(null);
  });
}
function askDone(v){closeM($("mAsk"));const r=askRes;askRes=null;if(r)r(v)}
const yes=async o=>(await ask(o))===true;

