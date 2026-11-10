/* Nội dung các trang thông tin (SEO). Mỗi trang có sẵn tiếng Việt và tiếng Anh, hiển thị theo ngôn ngữ đang chọn. */
const P = (vi, en) => ({ vi, en });

export const INFO = {
  skibidiscript: {
    path: "/skibidiscript", icon: "home",
    title: P("skibidiscript là gì?", "What is skibidiscript?"),
    desc: P("skibidiscript (SKIBIDI SCRIPT WEB) là website tiện ích chia sẻ APK, script và liên kết, kiểm duyệt trước khi đăng. Địa chỉ chính thức: skibidiscript.vercel.app.", "skibidiscript (SKIBIDI SCRIPT WEB) is a utility website for sharing APKs, scripts and links, moderated before publishing. Official address: skibidiscript.vercel.app."),
    lead: P("skibidiscript, tên đầy đủ SKIBIDI SCRIPT WEB, là website tiện ích chia sẻ gói APK, script và liên kết hữu ích, đặt bảo mật lên hàng đầu.", "skibidiscript, whose full name is SKIBIDI SCRIPT WEB, is a utility website for sharing APK packages, scripts and useful links, with security as the top priority."),
    sections: [
      { h: P("Địa chỉ chính thức", "Official address"), p: [P("Website skibidiscript hoạt động tại skibidiscript.vercel.app. Hãy kiểm tra kỹ địa chỉ trước khi đăng nhập hoặc nhập thông tin; chúng tôi không bao giờ hỏi mật khẩu của bạn qua tin nhắn.", "The skibidiscript website runs at skibidiscript.vercel.app. Check the address carefully before signing in or entering information; we never ask for your password in a message.")] },
      { h: P("Bạn tìm thấy gì ở skibidiscript", "What you find on skibidiscript"), ul: [P("Gói APK, script và liên kết được sắp xếp theo danh mục rõ ràng.", "APK packages, scripts and links organized into clear categories."), P("Mọi nội dung được quản trị viên duyệt trước khi hiển thị công khai.", "All content is reviewed by an administrator before it is shown publicly."), P("Cảnh báo rõ ràng với phần mềm bên thứ ba, hack hoặc mod.", "Clear warnings for third-party software, hacks or mods."), P("Tài khoản có xác minh 2 bước, mã xác nhận qua email và nhận diện đăng nhập lạ.", "Accounts with 2-step verification, email confirmation codes and unfamiliar sign-in detection."), P("Giao diện sáng/tối, tiếng Việt và tiếng Anh, ba mức đồ họa cho cả máy yếu lẫn máy mạnh.", "Light/dark themes, Vietnamese and English, and three graphics levels for both weak and powerful devices.")] },
      { h: P("Bắt đầu nhanh", "Quick start"), p: [P("Mở Danh mục để duyệt nội dung hoặc dùng Tìm kiếm (phím tắt Ctrl+K). Muốn biết thêm, đọc trang Giới thiệu, Hướng dẫn sử dụng và Tải APK an toàn.", "Open Categories to browse content or use Search (shortcut Ctrl+K). To learn more, read About, the User guide and Downloading APKs safely.")] }
    ],
    faq: [
      [P("skibidiscript là gì?", "What is skibidiscript?"), P("skibidiscript (SKIBIDI SCRIPT WEB) là website tiện ích chia sẻ gói APK, script và liên kết hữu ích, kiểm duyệt nội dung trước khi đăng và ưu tiên bảo mật.", "skibidiscript (SKIBIDI SCRIPT WEB) is a utility website sharing useful APK packages, scripts and links, moderating content before publishing and putting security first.")],
      [P("Địa chỉ chính thức của skibidiscript là gì?", "What is the official skibidiscript address?"), P("skibidiscript.vercel.app.", "skibidiscript.vercel.app.")],
      [P("skibidiscript có miễn phí không?", "Is skibidiscript free?"), P("Bạn xem và tìm kiếm nội dung miễn phí, không cần tài khoản. Tài khoản chỉ cần cho các tính năng dành cho thành viên.", "Browsing and searching content is free and needs no account. An account is only needed for member features.")],
      [P("skibidiscript có an toàn không?", "Is skibidiscript safe?"), P("Nội dung được duyệt trước khi đăng và phần mềm bên thứ ba có cảnh báo rõ ràng. Tuy vậy bạn vẫn nên tự kiểm tra mọi tệp trước khi cài.", "Content is reviewed before publishing and third-party software carries a clear warning. You should still check every file yourself before installing.")],
      [P("Làm sao đăng nội dung lên skibidiscript?", "How do I post content on skibidiscript?"), P("Cần email đã xác minh, bật xác minh 2 bước và được quản trị viên cấp phép. Bài của bạn sẽ ở trạng thái Đang xem xét cho tới khi được duyệt.", "You need a verified email, 2-step verification turned on and permission from an administrator. Your post stays Under review until it is approved.")]
    ]
  },
  about: {
    path: "/about", icon: "home",
    title: P("Giới thiệu", "About"),
    desc: P("SKIBIDI SCRIPT WEB là website tiện ích chia sẻ APK, script và liên kết, ưu tiên bảo mật và kiểm duyệt nội dung trước khi đăng.", "SKIBIDI SCRIPT WEB is a utility website sharing APKs, scripts and links, with a focus on security and pre-publication moderation."),
    lead: P("Website tiện ích chia sẻ gói APK, script và liên kết hữu ích, đặt bảo mật và sự minh bạch lên hàng đầu.", "A utility website for sharing APK packages, scripts and useful links, putting security and transparency first."),
    sections: [
      { h: P("Chúng tôi làm gì", "What we do"), p: [P("SKIBIDI SCRIPT WEB tập hợp các gói APK, script và liên kết hữu ích vào các danh mục rõ ràng để bạn tìm nhanh và dùng yên tâm.", "SKIBIDI SCRIPT WEB gathers APK packages, scripts and useful links into clear categories so you can find them quickly and use them with confidence."), P("Mọi nội dung đều được quản trị viên xem xét trước khi hiển thị công khai. Nội dung do người dùng gửi lên cũng phải qua bước duyệt này.", "All content is reviewed by an administrator before being shown publicly. Content submitted by users goes through the same review.")] },
      { h: P("Giá trị cốt lõi", "Core values"), ul: [P("Bảo mật: tài khoản có xác minh 2 bước, mã xác nhận gửi qua email, nhận diện đăng nhập lạ.", "Security: accounts support 2-step verification, email confirmation codes and unfamiliar sign-in detection."), P("Minh bạch: phần mềm bên thứ ba có rủi ro luôn hiện cảnh báo rõ ràng trước khi bạn mở.", "Transparency: risky third-party software always shows a clear warning before you open it."), P("Tôn trọng người dùng: không bán dữ liệu, không quảng cáo theo dõi.", "Respect for users: we don't sell data and don't run tracking ads."), P("Không cổ xúy hack hay can thiệp trò chơi.", "We do not promote hacking or game tampering.")] },
      { h: P("Liên hệ", "Contact"), p: [P("Cần hỗ trợ hoặc muốn báo cáo nội dung xấu? Dùng mục Hỗ trợ và Báo cáo trong website sau khi đăng nhập; quản trị viên sẽ trả lời ngay trong mục Tin nhắn.", "Need help or want to report bad content? Use Support and Report on the website after signing in; an administrator will reply right in Messages.")] }
    ]
  },
  security: {
    path: "/security", icon: "shield",
    title: P("Bảo mật & an toàn", "Security & safety"),
    desc: P("Cách SKIBIDI SCRIPT WEB bảo vệ tài khoản và dữ liệu: xác minh 2 bước, mã xác nhận, nhận diện đăng nhập lạ, kiểm duyệt nội dung.", "How SKIBIDI SCRIPT WEB protects accounts and data: 2-step verification, confirmation codes, unfamiliar sign-in detection and content moderation."),
    lead: P("Những lớp bảo vệ bạn nhận được khi dùng website.", "The layers of protection you get when using the website."),
    sections: [
      { h: P("Bảo vệ tài khoản", "Account protection"), ul: [P("Xác minh 2 bước bằng mã gửi qua email, bật hoặc tắt trong Hồ sơ.", "2-step verification with a code sent by email, which you can turn on or off in Profile."), P("Đổi mật khẩu và quên mật khẩu đều yêu cầu mã 6 số, có hiệu lực 10 phút và chỉ dùng một lần.", "Changing or resetting a password needs a 6-digit code that is valid for 10 minutes and works once."), P("Đổi email cần mật khẩu hiện tại và xác nhận qua liên kết gửi tới địa chỉ mới.", "Changing your email needs your current password and confirmation through a link sent to the new address."), P("Đăng nhập từ thiết bị hoặc mạng lạ sẽ được hỏi thêm một mã.", "Signing in from an unfamiliar device or network asks for an extra code.")] },
      { h: P("Bảo vệ dữ liệu", "Data protection"), ul: [P("Mã xác nhận được lưu dưới dạng băm và hết hạn nhanh.", "Confirmation codes are stored hashed and expire quickly."), P("Website không lưu địa chỉ IP thô, chỉ lưu dấu băm một phần.", "The website doesn't store raw IP addresses, only a partial hash."), P("Quy tắc cơ sở dữ liệu chặn ghi trái phép; chỉ quản trị viên đã xác minh mới sửa được nội dung.", "Database rules block unauthorized writes; only a verified administrator can change content.")] },
      { h: P("Kiểm duyệt nội dung", "Content moderation"), p: [P("Không có nội dung nào hiển thị công khai nếu chưa được duyệt. Danh mục có phần mềm bên thứ ba, hack hoặc mod sẽ buộc người xem đọc cảnh báo trong 20 giây trước khi vào.", "Nothing is shown publicly until it is approved. Categories with third-party software, hacks or mods make viewers read a warning for 20 seconds before entering.")] },
      { h: P("Báo lỗ hổng bảo mật", "Reporting a vulnerability"), p: [P("Nếu bạn phát hiện lỗ hổng, hãy gửi báo cáo qua mục Hỗ trợ. Vui lòng không công khai trước khi chúng tôi kịp xử lý.", "If you find a vulnerability, send a report through Support. Please don't disclose it publicly before we have had time to fix it.")] }
    ]
  },
  guide: {
    path: "/guide", icon: "box",
    title: P("Hướng dẫn sử dụng", "User guide"),
    desc: P("Hướng dẫn dùng SKIBIDI SCRIPT WEB: tìm nội dung, tạo tài khoản, bật xác minh 2 bước, đổi mức đồ họa và gửi bài.", "A guide to using SKIBIDI SCRIPT WEB: finding content, creating an account, enabling 2-step verification, changing the graphics level and submitting posts."),
    lead: P("Làm quen với website chỉ trong vài phút.", "Get to know the website in just a few minutes."),
    sections: [
      { h: P("1. Tìm nội dung", "1. Find content"), p: [P("Mở Danh mục để xem các nhóm nội dung, hoặc dùng Tìm kiếm. Gõ có dấu hay không dấu đều được.", "Open Categories to browse groups of content, or use Search. Typing with or without accents works.")] },
      { h: P("2. Tạo tài khoản", "2. Create an account"), p: [P("Đăng ký bằng email hoặc Google. Hãy xác minh email để dùng đầy đủ tính năng như nhắn tin với quản trị viên.", "Sign up with email or Google. Verify your email to use full features such as messaging an administrator.")] },
      { h: P("3. Bảo vệ tài khoản", "3. Protect your account"), p: [P("Vào Hồ sơ → Bảo mật để bật xác minh 2 bước, thêm email khôi phục và đổi mật khẩu bằng mã.", "Go to Profile → Security to turn on 2-step verification, add a recovery email and change your password with a code.")] },
      { h: P("4. Tùy chỉnh giao diện", "4. Customize the look"), p: [P("Trong Cài đặt, chọn mức đồ họa (Tối ưu, Trung bình, Cao), chế độ sáng/tối, kính mờ, ngôn ngữ và âm thanh. Nhạc nền phát nối tiếp nhiều bài và bạn có thể bấm Bài tiếp theo.", "In Settings choose the graphics level (Optimized, Medium, High), light/dark mode, frosted glass, language and sound. Background music plays several tracks in a row and you can press Next track.")] },
      { h: P("5. Gửi bài", "5. Submit content"), p: [P("Khi đủ điều kiện (email đã xác minh, bật xác minh 2 bước, được quản trị viên cấp phép), bạn có thể gửi danh mục hoặc mục mới. Bài hiện nhãn Đang xem xét cho tới khi được duyệt.", "Once you meet the conditions (verified email, 2-step verification on, permission from an administrator) you can submit a new category or item. It shows an Under review label until it is approved.")] }
    ]
  },
  "apk-safety": {
    path: "/apk-safety", icon: "shield",
    title: P("Tải APK an toàn", "Downloading APKs safely"),
    desc: P("Những điều cần kiểm tra trước khi tải và cài một gói APK: nguồn, quyền ứng dụng, quét mã độc và cách gỡ khi nghi ngờ.", "What to check before downloading and installing an APK: the source, app permissions, malware scanning and how to remove it if in doubt."),
    lead: P("Cài APK từ ngoài kho ứng dụng có rủi ro. Hãy làm theo danh sách kiểm tra này.", "Installing an APK from outside an app store carries risk. Follow this checklist."),
    sections: [
      { h: P("Trước khi tải", "Before downloading"), ul: [P("Đọc kỹ mô tả và chỉ tải từ nguồn bạn tin tưởng.", "Read the description carefully and only download from sources you trust."), P("Ưu tiên bản có mô tả rõ ràng, tên gói khớp với ứng dụng bạn cần.", "Prefer versions with a clear description and a package name that matches the app you need."), P("Cẩn thận với mục có cảnh báo rủi ro: đó là phần mềm bên thứ ba.", "Be careful with items that show a risk warning: they are third-party software.")] },
      { h: P("Trước khi cài", "Before installing"), ul: [P("Quét tệp bằng ứng dụng bảo vệ trên máy.", "Scan the file with your device's security app."), P("Kiểm tra quyền ứng dụng yêu cầu; quyền không liên quan chức năng là dấu hiệu xấu.", "Check the permissions the app asks for; permissions unrelated to its function are a bad sign."), P("Không cài thứ bạn không hiểu rõ.", "Don't install anything you don't understand.")] },
      { h: P("Sau khi cài", "After installing"), ul: [P("Nếu máy chậm bất thường hoặc có quảng cáo lạ, hãy gỡ ứng dụng ngay.", "If your device becomes unusually slow or shows strange ads, uninstall the app right away."), P("Đổi mật khẩu các tài khoản đã đăng nhập trong ứng dụng đáng ngờ.", "Change the passwords of accounts you signed in to inside a suspicious app."), P("Báo cáo mục đó cho quản trị viên qua nút Báo cáo.", "Report that item to an administrator with the Report button.")] }
    ]
  },
  terms: {
    path: "/terms", icon: "lock",
    title: P("Điều khoản sử dụng", "Terms of use"),
    desc: P("Điều khoản sử dụng SKIBIDI SCRIPT WEB: quy tắc đăng bài, trách nhiệm của người dùng và các giới hạn của website.", "Terms of use for SKIBIDI SCRIPT WEB: posting rules, user responsibilities and the website's limits."),
    lead: P("Bằng việc dùng website, bạn đồng ý với các điều khoản dưới đây.", "By using the website you agree to the terms below."),
    sections: [
      { h: P("Sử dụng hợp lệ", "Acceptable use"), ul: [P("Không gửi mã độc, lừa đảo hoặc nội dung vi phạm pháp luật.", "Do not submit malware, scams or content that breaks the law."), P("Không cố truy cập trái phép, làm quá tải hoặc phá hoại website.", "Do not attempt unauthorized access, overload or damage the website."), P("Không dùng website để can thiệp trái phép vào trò chơi hoặc dịch vụ của người khác.", "Do not use the website to tamper with other people's games or services without permission.")] },
      { h: P("Nội dung của bên thứ ba", "Third-party content"), p: [P("Một số nội dung do bên thứ ba tạo ra. Website cố gắng kiểm duyệt nhưng không thể bảo đảm tuyệt đối và không chịu trách nhiệm về việc bạn sử dụng. Hãy tự kiểm tra trước khi cài hoặc chạy.", "Some content is made by third parties. The website tries to moderate it but cannot fully guarantee it and is not responsible for how you use it. Check it yourself before installing or running it.")] },
      { h: P("Tài khoản", "Accounts"), p: [P("Bạn chịu trách nhiệm giữ an toàn tài khoản của mình. Tài khoản vi phạm có thể bị tắt tiếng hoặc khóa.", "You are responsible for keeping your account safe. Accounts that break the rules may be muted or banned.")] },
      { h: P("Thay đổi", "Changes"), p: [P("Điều khoản có thể được cập nhật; việc tiếp tục sử dụng đồng nghĩa với việc chấp nhận bản mới.", "The terms may be updated; continuing to use the website means you accept the new version.")] }
    ]
  },
  privacy: {
    path: "/privacy", icon: "lock",
    title: P("Chính sách riêng tư", "Privacy policy"),
    desc: P("Chính sách riêng tư của SKIBIDI SCRIPT WEB: dữ liệu chúng tôi thu thập, cách bảo vệ và quyền của bạn.", "Privacy policy of SKIBIDI SCRIPT WEB: the data we collect, how we protect it and your rights."),
    lead: P("Chúng tôi chỉ thu thập những gì cần cho tài khoản của bạn.", "We only collect what your account needs."),
    sections: [
      { h: P("Dữ liệu thu thập", "Data we collect"), ul: [P("Email, tên hiển thị và ảnh đại diện (nếu bạn đặt).", "Email, display name and avatar (if you set one)."), P("Cài đặt giao diện lưu ngay trên trình duyệt của bạn.", "Appearance settings are stored in your own browser."), P("Dấu băm một phần của địa chỉ mạng để nhận diện đăng nhập lạ; không lưu IP thô.", "A partial hash of your network address to detect unfamiliar sign-ins; the raw IP is not stored."), P("Tin nhắn bạn gửi tới quản trị viên qua mục Hỗ trợ và Báo cáo.", "Messages you send to an administrator through Support and Report.")] },
      { h: P("Cách sử dụng", "How we use it"), p: [P("Dữ liệu chỉ dùng để vận hành tài khoản, bảo mật và hỗ trợ bạn. Chúng tôi không bán dữ liệu và không dùng quảng cáo theo dõi.", "Data is only used to run your account, keep it secure and support you. We don't sell data or run tracking ads.")] },
      { h: P("Dịch vụ bên thứ ba", "Third-party services"), p: [P("Website dùng Firebase (Google) cho đăng nhập và dữ liệu, Cloudflare Turnstile để chống tự động và dịch vụ gửi email để gửi mã xác nhận.", "The website uses Firebase (Google) for sign-in and data, Cloudflare Turnstile to prevent automated abuse and an email delivery service to send confirmation codes.")] },
      { h: P("Quyền của bạn", "Your rights"), p: [P("Bạn có thể xem và sửa thông tin trong Hồ sơ, và liên hệ quản trị viên qua mục Hỗ trợ để yêu cầu xóa dữ liệu.", "You can view and edit your information in Profile, and contact an administrator through Support to request deletion of your data.")] }
    ]
  }
};
export const INFO_ORDER = ["skibidiscript", "about", "guide", "apk-safety", "security", "terms", "privacy"];
