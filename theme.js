/* Áp dụng giao diện sáng/tối giống trang chính (đọc cùng khóa "theme") trước khi vẽ để không bị nháy */
try{var s=localStorage.getItem("theme")||"light";if(s==="system")s=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";document.documentElement.dataset.theme=s}catch(e){document.documentElement.dataset.theme="light"}
