"""Giữ Cloudflare quick tunnel chạy ngầm cho PDF2Office.

Được Task Scheduler gọi bằng pythonw.exe khi đăng nhập Windows, nên
không có cửa sổ console nào xuất hiện. Link hiện tại được ghi vào
current-link.txt và shortcut "PDF2Office Online" trên Desktop.
"""
from __future__ import annotations

import ctypes
import os
import re
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
CLOUDFLARED = Path(os.environ.get("LOCALAPPDATA", str(PROJECT_DIR))) / "PDF2Office" / "cloudflared.exe"
LOG_DIR = PROJECT_DIR / "logs"
LOG_FILE = LOG_DIR / "tunnel.log"
LINK_FILE = PROJECT_DIR / "current-link.txt"
URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
CREATE_NO_WINDOW = 0x08000000
DOWNLOAD_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"


def desktop_dir() -> Path:
    """Lấy đúng thư mục Desktop kể cả khi bị OneDrive chuyển hướng."""
    buf = ctypes.create_unicode_buffer(260)
    try:
        ctypes.windll.shell32.SHGetFolderPathW(None, 0x0010, None, 0, buf)
        if buf.value:
            return Path(buf.value)
    except Exception:
        pass
    return Path(os.path.expanduser("~")) / "Desktop"


SHORTCUT = desktop_dir() / "PDF2Office Online.url"


def log(message: str) -> None:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as fh:
            fh.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")
    except Exception:
        pass


def ensure_cloudflared() -> None:
    if CLOUDFLARED.exists():
        return
    CLOUDFLARED.parent.mkdir(parents=True, exist_ok=True)
    log("Dang tai cloudflared...")
    urllib.request.urlretrieve(DOWNLOAD_URL, CLOUDFLARED)


def wait_for_server(timeout: int = 90) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen("http://127.0.0.1:5000/api/health", timeout=2) as res:
                if res.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False


def tunnel_running() -> bool:
    try:
        out = subprocess.check_output(
            ["tasklist", "/FI", "IMAGENAME eq cloudflared.exe", "/NH"],
            creationflags=CREATE_NO_WINDOW,
            text=True,
            errors="ignore",
        )
        return "cloudflared.exe" in out.lower()
    except Exception:
        return False


def publish(url: str) -> None:
    stamp = time.strftime("%H:%M %d/%m/%Y")
    LINK_FILE.write_text(
        "\n".join(
            [
                "PDF2Office - link truy cap tu xa",
                f"Cap nhat: {stamp}",
                "",
                url,
                "",
                "Link chi hoat dong khi may tinh dang bat, co Internet",
                "va khong o che do ngu. Dung chia se link cho nguoi la.",
                "Tat chia se: chay auto-stop.bat",
                "Bat lai:     chay auto-start.bat",
            ]
        ),
        encoding="utf-8",
    )
    try:
        SHORTCUT.write_text(f"[InternetShortcut]\r\nURL={url}\r\n", encoding="ascii")
    except Exception:
        pass
    log(f"Link moi: {url}")


def start_tunnel() -> tuple[subprocess.Popen, str | None, dict[str, int | str | None]]:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        LOG_FILE.write_text("", encoding="utf-8")
    except Exception:
        pass

    proc = subprocess.Popen(
        [
            str(CLOUDFLARED),
            "tunnel",
            "--url",
            "http://127.0.0.1:5000",
            "--no-autoupdate",
            "--protocol",
            "http2",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=CREATE_NO_WINDOW,
    )
    state: dict[str, int | str | None] = {"url": None, "errors": 0}

    def pump() -> None:
        with open(LOG_FILE, "a", encoding="utf-8", errors="replace") as fh:
            assert proc.stdout is not None
            for line in proc.stdout:
                fh.write(line)
                fh.flush()
                if "Registered tunnel connection" in line:
                    state["errors"] = 0
                elif "Tunnel not found" in line or "Unauthorized" in line:
                    state["errors"] = int(state["errors"] or 0) + 1
                if not state["url"]:
                    match = URL_RE.search(line)
                    if match:
                        state["url"] = match.group(0)

    threading.Thread(target=pump, daemon=True).start()

    # Chờ link tối đa 180 giây. Nếu cloudflared vẫn chạy nhưng không có link
    # (hoặc link cũ đã bị thu hồi) thì tắt để vòng lặp tạo tunnel mới.
    deadline = time.time() + 180
    while time.time() < deadline and proc.poll() is None and not state["url"]:
        time.sleep(1)

    if not state["url"] and proc.poll() is None:
        log("Khong lay duoc link sau 180 giay, khoi dong lai tunnel.")
        proc.terminate()

    return proc, state["url"] if isinstance(state["url"], str) else None, state


def main() -> None:
    ensure_cloudflared()
    wait_for_server()

    if tunnel_running():
        log("Tunnel da chay san, khong tao them.")
        return

    while True:
        proc, url, state = start_tunnel()
        if url:
            publish(url)

        # Cloudflare có thể thu hồi quick tunnel (lỗi "Tunnel not found").
        # Khi đó phải tạo tunnel mới để có link mới.
        while proc.poll() is None:
            time.sleep(10)
            if int(state["errors"] or 0) >= 3:
                log("Cloudflare thu hoi tunnel, dang tao link moi...")
                proc.terminate()
                break

        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        time.sleep(5)


if __name__ == "__main__":
    main()
