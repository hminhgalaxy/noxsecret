/* Nội dung các trang thông tin (SEO). Mỗi trang có sẵn tiếng Việt và tiếng Anh, hiển thị theo ngôn ngữ đang chọn. */
const P = (vi, en) => ({ vi, en });

export const INFO = {
  skibidiscript: {
    path: "/skibidiscript", icon: "home",
    title: P("Skibidi Web là gì?", "What is Skibidi Web?"),
    desc: P("Skibidi Web (còn gọi là Skibidi Shop, skibidiscript) là cửa hàng số: nạp ví bằng chuyển khoản, mua và nhận hàng ngay. Địa chỉ: skibidiscript.vercel.app.", "Skibidi Web (also called Skibidi Shop or skibidiscript) is a digital shop: top up your wallet by bank transfer, buy and receive instantly. Address: skibidiscript.vercel.app."),
    lead: P("Skibidi Web, còn gọi là Skibidi Shop hay skibidiscript, là cửa hàng số: nạp tiền vào ví bằng chuyển khoản, mua hàng và nhận ngay trong đơn của bạn.", "Skibidi Web, also called Skibidi Shop or skibidiscript, is a digital shop: top up your wallet by bank transfer, buy goods and receive them right in your order."),
    sections: [
      { h: P("Địa chỉ chính thức", "Official address"), p: [P("Skibidi Web hoạt động tại skibidiscript.vercel.app. Hãy kiểm tra kỹ địa chỉ trước khi đăng nhập hoặc nhập thông tin; chúng tôi không bao giờ hỏi mật khẩu hay mã xác minh của bạn qua tin nhắn.", "Skibidi Web runs at skibidiscript.vercel.app. Check the address carefully before signing in or entering information; we never ask for your password or verification code in a message.")] },
      { h: P("Bạn làm được gì ở Skibidi Web", "What you can do on Skibidi Web"), ul: [P("Nạp tiền vào ví bằng chuyển khoản ngân hàng, quét mã QR là xong.", "Top up your wallet by bank transfer, just scan the QR code."), P("Mua hàng trong cửa hàng bằng số dư ví và nhận hàng ngay sau khi thanh toán.", "Buy from the shop with your wallet balance and receive your goods right after paying."), P("Xem lại mọi đơn hàng, mã đơn, thời gian và số tiền trong Lịch sử mua.", "See every order, its code, time and amount in your purchase history."), P("Tài khoản có xác minh 2 bước, mã xác nhận qua email và nhận diện đăng nhập lạ.", "Accounts with 2-step verification, email confirmation codes and unfamiliar sign-in detection."), P("Giao diện sáng/tối, tiếng Việt và tiếng Anh, nhiều chủ đề màu và trợ lý Skias.", "Light/dark mode, Vietnamese and English, several colour themes and the Skias helper.")] },
      { h: P("Bắt đầu nhanh", "Quick start"), p: [P("Đăng ký tài khoản, nạp tiền trong mục Ví, rồi chọn sản phẩm ở Cửa hàng. Cần giúp đỡ? Hỏi Skias ở góc màn hình hoặc đọc Hướng dẫn sử dụng.", "Register an account, top up in the Wallet, then pick a product in the Shop. Need help? Ask Skias in the corner of the screen or read the User guide.")] }
    ],
    faq: [
      [P("Skibidi Web là gì?", "What is Skibidi Web?"), P("Skibidi Web, còn gọi là Skibidi Shop hay skibidiscript, là cửa hàng số: nạp ví bằng chuyển khoản, mua và nhận hàng ngay.", "Skibidi Web, also called Skibidi Shop or skibidiscript, is a digital shop: top up your wallet by bank transfer, buy and receive instantly.")],
      [P("Địa chỉ chính thức của Skibidi Web là gì?", "What is the official Skibidi Web address?"), P("skibidiscript.vercel.app.", "skibidiscript.vercel.app.")],
      [P("Skibidi Shop có miễn phí không?", "Is Skibidi Shop free?"), P("Xem cửa hàng và tìm kiếm là miễn phí, không cần tài khoản. Mua hàng cần đăng nhập và có số dư trong ví.", "Browsing the shop and searching is free and needs no account. Buying needs a signed-in account with wallet balance.")],
      [P("Skibidi Web có an toàn không?", "Is Skibidi Web safe?"), P("Tài khoản có xác minh 2 bước và mã xác nhận qua email; nạp tiền là chuyển khoản ngân hàng qua mã QR do quản trị viên gửi. Hãy luôn kiểm tra kỹ số tiền trước khi xác nhận chuyển khoản.", "Accounts have 2-step verification and email confirmation codes; payment is a bank transfer through a QR code. Always double-check the amount before you confirm a transfer.")],
      [P("Nạp tiền vào Skibidi Web như thế nào?", "How do I top up my Skibidi Web wallet?"), P("Mở Ví, bấm Nạp tiền và nhập số tiền (tối thiểu 2.000đ). Hóa đơn sẽ được tạo; quay lại sau ít tiếng để nhận mã QR, chuyển tiền rồi gửi ảnh bill. Hóa đơn được xử lý trong ít phút sau khi bạn gửi bill.", "Open the Wallet, press Top up and enter an amount (minimum 2,000). An invoice is created; come back a few hours later to get the QR code, make the transfer and send a photo of the receipt. The invoice is processed within a few minutes after you send the receipt.")]
    ]
  },
  about: {
    path: "/about", icon: "home",
    title: P("Giới thiệu", "About"),
    desc: P("Skibidi Web (Skibidi Shop) là cửa hàng số: nạp ví bằng chuyển khoản, mua hàng và nhận ngay, ưu tiên bảo mật và minh bạch.", "Skibidi Web (Skibidi Shop) is a digital shop: top up your wallet by bank transfer, buy and receive instantly, with security and transparency first."),
    lead: P("Cửa hàng số đơn giản, nhanh và minh bạch, đặt bảo mật lên hàng đầu.", "A simple, fast and transparent digital shop that puts security first."),
    sections: [
      { h: P("Chúng tôi làm gì", "What we do"), p: [P("Skibidi Web là cửa hàng số: bạn nạp tiền vào ví bằng chuyển khoản, chọn sản phẩm và nhận hàng ngay sau khi thanh toán.", "Skibidi Web is a digital shop: you top up your wallet by bank transfer, pick a product and receive it right after paying."), P("Mỗi đơn có mã, thời gian, số tiền và trạng thái rõ ràng để bạn xem lại bất cứ lúc nào.", "Every order has a clear code, time, amount and status so you can look it up any time.")] },
      { h: P("Giá trị cốt lõi", "Core values"), ul: [P("Bảo mật: tài khoản có xác minh 2 bước, mã xác nhận gửi qua email, nhận diện đăng nhập lạ.", "Security: accounts support 2-step verification, email confirmation codes and unfamiliar sign-in detection."), P("Minh bạch: số dư và lịch sử giao dịch luôn rõ ràng, không phí ẩn.", "Transparency: your balance and transaction history are always clear, with no hidden fees."), P("Tôn trọng người dùng: không bán dữ liệu, không quảng cáo theo dõi.", "Respect for users: we don't sell data and don't run tracking ads.")] },
      { h: P("Liên hệ", "Contact"), p: [P("Cần hỗ trợ? Hỏi Skias ở góc màn hình hoặc dùng khung chat với dev sau khi đăng nhập; dev sẽ trả lời ngay trong Hộp thư.", "Need help? Ask Skias in the corner of the screen or use the chat with the dev after signing in; the dev replies right in your Inbox.")] }
    ]
  },
  security: {
    path: "/security", icon: "shield",
    title: P("Bảo mật & an toàn", "Security & safety"),
    desc: P("Cách Skibidi Web bảo vệ tài khoản và dữ liệu: xác minh 2 bước, mã xác nhận, nhận diện đăng nhập lạ, kiểm duyệt nội dung.", "How Skibidi Web protects accounts and data: 2-step verification, confirmation codes, unfamiliar sign-in detection and content moderation."),
    lead: P("Những lớp bảo vệ bạn nhận được khi dùng website.", "The layers of protection you get when using the website."),
    sections: [
      { h: P("Bảo vệ tài khoản", "Account protection"), ul: [P("Xác minh 2 bước bằng mã gửi qua email, bật hoặc tắt trong Hồ sơ.", "2-step verification with a code sent by email, which you can turn on or off in Profile."), P("Đổi mật khẩu và quên mật khẩu đều yêu cầu mã 6 số, có hiệu lực 10 phút và chỉ dùng một lần.", "Changing or resetting a password needs a 6-digit code that is valid for 10 minutes and works once."), P("Đổi email cần mật khẩu hiện tại và xác nhận qua liên kết gửi tới địa chỉ mới.", "Changing your email needs your current password and confirmation through a link sent to the new address."), P("Đăng nhập từ thiết bị hoặc mạng lạ sẽ được hỏi thêm một mã.", "Signing in from an unfamiliar device or network asks for an extra code.")] },
      { h: P("Bảo vệ dữ liệu", "Data protection"), ul: [P("Mã xác nhận được lưu an toàn (không lưu nguyên văn) và hết hạn nhanh.", "Confirmation codes are stored safely (never in plain form) and expire quickly."), P("Website không lưu địa chỉ mạng của bạn ở dạng đọc được.", "The website doesn't keep your network address in a readable form."), P("Hệ thống chặn mọi thao tác ghi trái phép; chỉ quản trị viên đã xác minh mới sửa được nội dung.", "The system blocks unauthorized changes; only a verified administrator can change content.")] },
      { h: P("Kiểm duyệt nội dung", "Content moderation"), p: [P("Không có nội dung nào hiển thị công khai nếu chưa được duyệt. Danh mục có phần mềm bên thứ ba, hack hoặc mod sẽ buộc người xem đọc cảnh báo trong 20 giây trước khi vào.", "Nothing is shown publicly until it is approved. Categories with third-party software, hacks or mods make viewers read a warning for 20 seconds before entering.")] },
      { h: P("Báo lỗ hổng bảo mật", "Reporting a vulnerability"), p: [P("Nếu bạn phát hiện lỗ hổng, hãy gửi báo cáo qua mục Hỗ trợ. Vui lòng không công khai trước khi chúng tôi kịp xử lý.", "If you find a vulnerability, send a report through Support. Please don't disclose it publicly before we have had time to fix it.")] }
    ]
  },
  guide: {
    path: "/guide", icon: "box",
    title: P("Hướng dẫn sử dụng", "User guide"),
    desc: P("Hướng dẫn dùng Skibidi Web: tạo tài khoản, nạp ví, mua hàng, xem đơn, bật xác minh 2 bước và đổi giao diện.", "A guide to using Skibidi Web: creating an account, topping up, buying, finding your orders, enabling 2-step verification and changing the look."),
    lead: P("Làm quen với cửa hàng chỉ trong vài phút.", "Get to know the shop in just a few minutes."),
    sections: [
      { h: P("1. Tạo tài khoản", "1. Create an account"), p: [P("Đăng ký bằng email hoặc Google. Hãy xác minh email để dùng ví và mua hàng.", "Sign up with email or Google. Verify your email to use the wallet and buy things.")] },
      { h: P("2. Nạp tiền vào ví", "2. Top up your wallet"), p: [P("Mở Ví, bấm Nạp tiền và nhập số tiền (từ 2.000đ đến 50.000.000đ, làm tròn nghìn). Trang hóa đơn sẽ báo hóa đơn đang được tạo; khi có mã QR, hãy chuyển đúng số tiền rồi gửi ảnh bill. Quản trị viên kiểm tra và cộng tiền vào ví của bạn, thường trong ít phút sau khi nhận bill.", "Open the Wallet, press Top up and enter an amount (from 2,000 to 50,000,000 VND, rounded to the thousand). The invoice page shows that your invoice is being created; when the QR code appears, transfer the exact amount and send a photo of the receipt. The administrator checks it and credits your wallet, usually within a few minutes after receiving the receipt.")] },
      { h: P("3. Mua hàng", "3. Buy something"), p: [P("Chọn sản phẩm trong Cửa hàng, bấm Thêm vào giỏ rồi thanh toán bằng số dư. Hàng được giao ngay và lưu trong Lịch sử mua.", "Pick a product in the Shop, press Add to cart and pay with your balance. Goods are delivered instantly and kept in your purchase history.")] },
      { h: P("4. Bảo vệ tài khoản", "4. Protect your account"), p: [P("Vào Hồ sơ → Bảo mật để bật xác minh 2 bước, thêm email khôi phục và đổi mật khẩu bằng mã.", "Go to Profile → Security to turn on 2-step verification, add a recovery email and change your password with a code.")] },
      { h: P("5. Tùy chỉnh giao diện", "5. Customize the look"), p: [P("Trong Cài đặt, chọn mức đồ họa (Tối ưu, Trung bình, Cao), chế độ sáng/tối, kính mờ, ngôn ngữ và âm thanh. Nhạc nền phát nối tiếp nhiều bài và bạn có thể bấm Bài tiếp theo.", "In Settings choose the graphics level (Optimized, Medium, High), light/dark mode, frosted glass, language and sound. Background music plays several tracks in a row and you can press Next track.")] }
    ]
  },
  terms: {
    path: "/terms", icon: "lock",
    title: P("Điều khoản sử dụng", "Terms of use"),
    desc: P("Điều khoản sử dụng Skibidi Web: quy tắc đăng bài, trách nhiệm của người dùng và các giới hạn của website.", "Terms of use for Skibidi Web: posting rules, user responsibilities and the website's limits."),
    lead: P("Bằng việc dùng website, bạn đồng ý với các điều khoản dưới đây.", "By using the website you agree to the terms below."),
    sections: [
      { h: P("Sử dụng hợp lệ", "Acceptable use"), ul: [P("Không gửi mã độc, lừa đảo hoặc nội dung vi phạm pháp luật.", "Do not submit malware, scams or content that breaks the law."), P("Không cố truy cập trái phép, làm quá tải hoặc phá hoại website.", "Do not attempt unauthorized access, overload or damage the website."), P("Không dùng website để gian lận hoặc gây hại cho người khác.", "Do not use the website to cheat or harm other people.")] },
      { h: P("Nội dung của bên thứ ba", "Third-party content"), p: [P("Một số nội dung do bên thứ ba tạo ra. Website cố gắng kiểm duyệt nhưng không thể bảo đảm tuyệt đối và không chịu trách nhiệm về việc bạn sử dụng. Hãy tự kiểm tra trước khi sử dụng.", "Some content is made by third parties. The website tries to moderate it but cannot fully guarantee it and is not responsible for how you use it. Check it yourself before using it.")] },
      { h: P("Tài khoản", "Accounts"), p: [P("Bạn chịu trách nhiệm giữ an toàn tài khoản của mình. Tài khoản vi phạm có thể bị tắt tiếng hoặc khóa.", "You are responsible for keeping your account safe. Accounts that break the rules may be muted or banned.")] },
      { h: P("Thay đổi", "Changes"), p: [P("Điều khoản có thể được cập nhật; việc tiếp tục sử dụng đồng nghĩa với việc chấp nhận bản mới.", "The terms may be updated; continuing to use the website means you accept the new version.")] }
    ]
  },
  privacy: {
    path: "/privacy", icon: "lock",
    title: P("Chính sách riêng tư", "Privacy policy"),
    desc: P("Chính sách riêng tư của Skibidi Web: dữ liệu chúng tôi thu thập, cách bảo vệ và quyền của bạn.", "Privacy policy of Skibidi Web: the data we collect, how we protect it and your rights."),
    lead: P("Chúng tôi chỉ thu thập những gì cần cho tài khoản của bạn.", "We only collect what your account needs."),
    sections: [
      { h: P("Dữ liệu thu thập", "Data we collect"), ul: [P("Email, tên hiển thị và ảnh đại diện (nếu bạn đặt).", "Email, display name and avatar (if you set one)."), P("Cài đặt giao diện lưu ngay trên trình duyệt của bạn.", "Appearance settings are stored in your own browser."), P("Một dấu nhận dạng đã làm mờ của kết nối để phát hiện đăng nhập lạ; địa chỉ thật không được lưu.", "A blurred fingerprint of your connection to spot unfamiliar sign-ins; the real address is not stored."), P("Tin nhắn bạn gửi tới quản trị viên qua mục Hỗ trợ và Báo cáo.", "Messages you send to an administrator through Support and Report.")] },
      { h: P("Cách sử dụng", "How we use it"), p: [P("Dữ liệu chỉ dùng để vận hành tài khoản, bảo mật và hỗ trợ bạn. Chúng tôi không bán dữ liệu và không dùng quảng cáo theo dõi.", "Data is only used to run your account, keep it secure and support you. We don't sell data or run tracking ads.")] },
      { h: P("Dịch vụ bên thứ ba", "Third-party services"), p: [P("Website dùng dịch vụ của Google cho đăng nhập và lưu dữ liệu, một bước kiểm tra chống tự động và một dịch vụ gửi email để gửi mã xác nhận.", "The website uses Google services for sign-in and data storage, an anti-bot check and an email service to send confirmation codes.")] },
      { h: P("Quyền của bạn", "Your rights"), p: [P("Bạn có thể xem và sửa thông tin trong Hồ sơ, và liên hệ quản trị viên qua mục Hỗ trợ để yêu cầu xóa dữ liệu.", "You can view and edit your information in Profile, and contact an administrator through Support to request deletion of your data.")] }
    ]
  }
};
export const INFO_ORDER = ["skibidiscript", "about", "guide", "security", "terms", "privacy"];
