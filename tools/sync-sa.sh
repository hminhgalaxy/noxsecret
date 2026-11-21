#!/bin/sh
# Tạo bản trình duyệt (ESM) của api/_lib/sa.js. Chạy sau khi sửa api/_lib/sa.js:  sh tools/sync-sa.sh
cd "$(dirname "$0")/.." || exit 1
sed -e 's#^module.exports = { \(.*\) };#export { \1 };#' -e 's#assets/js/lib/sa.js (tạo từ tệp này bằng tools/sync-sa.sh — đừng sửa tay)#api/_lib/sa.js — tệp này được tạo tự động bằng tools/sync-sa.sh, đừng sửa tay#' api/_lib/sa.js > assets/js/lib/sa.js
echo "đã tạo assets/js/lib/sa.js"
