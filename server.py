#!/usr/bin/env python3
"""Server statis untuk portofolio NabilaXP.

Cara pakai:
    python3 server.py                  # http://localhost:8123
    python3 server.py --port 9000
    python3 server.py --host 0.0.0.0   # agar bisa dibuka dari HP di Wi-Fi yang sama
    PORT=9000 python3 server.py
"""
import argparse
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    """Sajikan folder site/ tanpa cache supaya perubahan langsung terlihat."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        pass  # biarkan terminal tetap bersih; aktifkan untuk debugging


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")
    if not os.path.isdir(root):
        print("Folder 'site' tidak ditemukan di sebelah server.py", file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Jalankan server portofolio NabilaXP")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8123")))
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"),
                        help="Pakai 0.0.0.0 untuk membuka akses dari perangkat lain di Wi-Fi yang sama")
    args = parser.parse_args()

    handler = partial(Handler, directory=root)
    try:
        httpd = ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as exc:
        print("Gagal membuka {}:{}: {}".format(args.host, args.port, exc), file=sys.stderr)
        sys.exit(1)

    print("NabilaXP berjalan di http://localhost:{}".format(args.port))
    if args.host == "0.0.0.0":
        print("Akses dari HP: http://<alamat-IP-Mac>:{}/ (pastikan satu Wi-Fi)".format(args.port))
    print("Tekan Ctrl+C untuk menghentikan server.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan. Sampai jumpa!")


if __name__ == "__main__":
    main()
