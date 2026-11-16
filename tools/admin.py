#!/usr/bin/env python3
"""Công cụ quản trị chạy trên MÁY CỦA BẠN (không chạy trên Vercel).

Website trên Vercel dùng Node (firebase-admin, biến FIREBASE_SERVICE_ACCOUNT) — đoạn Python bạn gửi
không được website dùng. File này là bản Python tương đương để bạn tự thao tác nhanh bằng dòng lệnh.

Cài:    pip install firebase-admin
Chuẩn bị: tải khoá dịch vụ (Firebase → Project settings → Service accounts → Generate new private key)
          lưu thành serviceAccountKey.json (KHÔNG đưa file này lên git/hosting, KHÔNG gửi cho ai).

Dùng:
  python3 tools/admin.py --key serviceAccountKey.json wallet <uid>
  python3 tools/admin.py --key serviceAccountKey.json orders <uid>
  python3 tools/admin.py --key serviceAccountKey.json topups <uid>
  python3 tools/admin.py --key serviceAccountKey.json bank
  python3 tools/admin.py --key serviceAccountKey.json adjust <uid> <số_tiền_±> "lý do"   # cộng/trừ ví (ghi cả lịch sử)

Lưu ý: script này ghi thẳng vào Realtime Database bằng quyền Admin (bỏ qua Rules). Cẩn thận khi dùng `adjust`.
Chưa được kiểm thử với cơ sở dữ liệu thật của bạn.
"""
import argparse, json, sys, time

try:
    import firebase_admin
    from firebase_admin import credentials, db
except ImportError:
    sys.exit("Thiếu thư viện: pip install firebase-admin")

DEFAULT_URL = "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app"


def init(key, url):
    firebase_admin.initialize_app(credentials.Certificate(key), {"databaseURL": url})


def show(path):
    print(json.dumps(db.reference(path).get(), ensure_ascii=False, indent=2))


def adjust(uid, amount, reason):
    if not isinstance(amount, int) or amount == 0:
        sys.exit("số tiền phải là số nguyên khác 0")
    ref = db.reference("nox_wallet/" + uid)

    def txn(cur):
        cur = cur or {}
        bal = int(cur.get("balance", 0)) + amount
        if bal < 0:
            return cur  # không cho âm: giữ nguyên
        cur["balance"] = bal
        return cur

    res = ref.transaction(txn)
    print("Số dư mới:", res.get("balance"))
    db.reference("nox_txs/" + uid).push({
        "type": "adjust", "amount": amount, "note": reason[:200], "ts": int(time.time() * 1000), "by": "admin.py",
    })


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--url", default=DEFAULT_URL)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in ("wallet", "orders", "topups"):
        sub.add_parser(c).add_argument("uid")
    sub.add_parser("bank")
    a = sub.add_parser("adjust"); a.add_argument("uid"); a.add_argument("amount", type=int); a.add_argument("reason")
    args = ap.parse_args()
    init(args.key, args.url)
    if args.cmd == "wallet": show("nox_wallet/" + args.uid)
    elif args.cmd == "orders": show("nox_orders/" + args.uid)
    elif args.cmd == "topups": show("nox_topups/" + args.uid)
    elif args.cmd == "bank": show("nox_shopcfg/bank")
    elif args.cmd == "adjust": adjust(args.uid, args.amount, args.reason)


if __name__ == "__main__":
    main()
