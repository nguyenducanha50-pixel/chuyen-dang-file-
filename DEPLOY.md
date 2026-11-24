# Đưa PDF2Office lên internet để dùng lâu dài

Website hiện chạy ở `http://127.0.0.1:5000` — chỉ máy bạn mở được và tắt máy là hết. Để dùng **mọi lúc, mọi nơi, bằng tên miền riêng**, bạn cần đưa ứng dụng lên một máy chủ luôn bật.

Có 3 cách, chọn theo nhu cầu:

| Cách | Chi phí | Ưu điểm | Nhược điểm |
| --- | --- | --- | --- |
| **A. VPS + Docker + Caddy** (khuyên dùng) | ~100–300kđ/tháng + tên miền | Ổn định 24/7, toàn quyền, HTTPS tự động, không giới hạn lượt dùng | Cần làm theo hướng dẫn một lần |
| **B. Render / Railway / Fly.io** | Miễn phí đến ~$10–25/tháng | Không phải quản lý máy chủ | Gói free ngủ khi rảnh, RAM ít dễ lỗi với PDF lớn |
| **C. Máy Windows của bạn + Cloudflare Tunnel** | 0đ (cần tên miền) | Không cần VPS, dùng đúng máy đang có | Máy phải bật 24/7, mạng nhà phải ổn định |

> Không có dịch vụ nào "vĩnh viễn" theo nghĩa miễn phí mãi mãi: bạn vẫn cần gia hạn VPS/tên miền và thỉnh thoảng cập nhật. Cách A là gần nhất với "dựng một lần, chạy mãi".

---

## A. VPS + Docker + Caddy (khuyên dùng)

### A1. Chuẩn bị

- **VPS** Ubuntu 22.04/24.04, tối thiểu **2 vCPU – 4 GB RAM – 20 GB ổ cứng** (PDF lớn cần RAM; 2 GB chỉ nên dùng cho tệp nhỏ).
- **Tên miền** (ví dụ `tenmiencuaban.com`) và quyền sửa DNS.
- Biết **IP công khai** của VPS.

Gợi ý nhà cung cấp: Hetzner, Contabo, DigitalOcean, Vultr (quốc tế); Vietnix, AZDIGI, BizflyCloud, Tino (Việt Nam). Tên miền: Cloudflare, Namecheap, PA Việt Nam, Mắt Bão.

### A2. Trỏ tên miền về VPS

Trong bảng DNS, thêm bản ghi:

| Loại | Tên (Name) | Giá trị (Value) | TTL |
| --- | --- | --- | --- |
| A | `pdf` | `IP_VPS_CUA_BAN` | Auto |

Sau này website sẽ là `https://pdf.tenmiencuaban.com`. Chờ 1–5 phút để DNS cập nhật.

### A3. Cài Docker trên VPS

SSH vào VPS (`ssh root@IP_VPS`), rồi chạy:

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

### A4. Tải mã nguồn lên VPS

**Trên máy Windows** (PowerShell), nén dự án (bỏ `.venv` cho nhẹ):

```powershell
cd "C:\Users\ducn9\Documents\Dự án mặc định"
tar --exclude="pdf-sang-word-ppt/.venv" --exclude="pdf-sang-word-ppt/__pycache__" -czf pdf2office.tar.gz pdf-sang-word-ppt
scp .\pdf2office.tar.gz root@IP_VPS:/opt/
```

**Trên VPS**:

```bash
cd /opt
mkdir -p pdf2office
tar -xzf pdf2office.tar.gz -C pdf2office --strip-components=1
cd pdf2office
cp .env.example .env
nano .env
```

Sửa `.env`:

```env
DOMAIN=pdf.tenmiencuaban.com
ACME_EMAIL=email-cua-ban@gmail.com
```

Lưu bằng `Ctrl+O`, `Enter`, thoát bằng `Ctrl+X`.

### A5. Khởi động

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f caddy
```

Lần đầu mất 2–5 phút để build. Khi log Caddy hiện `certificate obtained successfully`, mở:

**https://pdf.tenmiencuaban.com**

HTTPS sẽ tự động gia hạn, container tự khởi động lại sau khi VPS reboot (`restart: unless-stopped`).

### A6. Mở tường lửa

```bash
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw allow 443/udp
ufw enable
ufw status
```

Không mở cổng `5000` ra ngoài — ứng dụng chỉ nằm sau Caddy.

### A7. Bảo vệ bằng mật khẩu (tuỳ chọn)

Nếu không muốn ai cũng dùng được:

```bash
docker compose exec caddy caddy hash-password --plaintext 'mat-khau-cua-ban'
```

Copy chuỗi hash, mở `deploy/Caddyfile`, bỏ dấu `#` ở khối `basic_auth` và thay hash:

```caddyfile
basic_auth {
    pdf $2a$14$...
}
```

Sau đó:

```bash
docker compose restart caddy
```

Trình duyệt sẽ hỏi tên đăng nhập `pdf` và mật khẩu bạn vừa đặt.

### A8. Cập nhật phiên bản mới

```bash
cd /opt/pdf2office
# tải code mới lên đè (scp/git pull), sau đó:
docker compose up -d --build
docker image prune -f
```

### A9. Lệnh quản trị thường dùng

```bash
docker compose ps                 # trạng thái
docker compose logs -f app        # log chuyển đổi
docker compose logs -f caddy      # log HTTPS
docker compose restart app        # khởi động lại app
docker compose down               # dừng
docker compose up -d              # chạy lại
```

### A10. Tuỳ chỉnh hiệu năng

Thêm vào `.env` rồi `docker compose up -d`:

```env
MAX_FILE_MB=60      # dung lượng tối đa mỗi tệp
MAX_PAGES=300       # số trang tối đa
RENDER_DPI=200      # độ nét ảnh slide (144–220)
CONVERT_SLOTS=2     # số chuyển đổi song song
WEB_CONCURRENCY=1   # số tiến trình gunicorn (1 là đủ; tăng khi RAM >= 8 GB)
```

Máy 4 GB RAM nên để `CONVERT_SLOTS=2`; 8 GB có thể tăng 3–4. Mỗi worker gunicorn tốn thêm RAM, nên chỉ tăng `WEB_CONCURRENCY` khi máy còn dư bộ nhớ.

---

## B. Render / Railway / Fly.io (không tự quản lý máy chủ)

### Render

1. Đưa thư mục dự án lên GitHub (riêng tư cũng được).
2. Vào [render.com](https://render.com) → **New** → **Blueprint** → chọn repo. Render đọc `render.yaml`.
3. Chọn gói **Standard (2 GB RAM)** — gói Free/Starter 512 MB thường **hết RAM** khi chuyển PDF nhiều trang.
4. Deploy, sau đó vào **Settings → Custom Domains** để gắn tên miền.
5. Render tự cấp HTTPS và tự deploy lại mỗi khi push code.

`render.yaml` đã cấu hình sẵn health check `/api/health`, cổng lấy từ biến `PORT`.

### Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Railway tự nhận `Dockerfile`.
3. Tăng RAM trong **Settings → Resources** lên 2–4 GB.
4. **Settings → Networking → Generate Domain**, hoặc gắn tên miền riêng.

### Fly.io

```bash
fly launch --dockerfile Dockerfile
fly scale memory 2048
fly deploy
```

Sau đó gắn tên miền bằng `fly certs add pdf.tenmiencuaban.com`.

> Lưu ý chung: dịch vụ serverless/PaaS thường giới hạn thời gian xử lý và RAM. Tệp 100–300 trang có thể bị timeout hoặc hết bộ nhớ; VPS ở cách A phù hợp hơn với khối lượng lớn.

---

## C. Máy Windows của bạn + Cloudflare Tunnel (miễn phí, không cần VPS)

Cách này đưa website đang chạy trên máy bạn ra internet qua một đường hầm bảo mật của Cloudflare, không cần mở cổng modem.

Điều kiện: tên miền đã thêm vào Cloudflare (gói Free), máy bật 24/7 và **tắt chế độ ngủ**.

### C1. Chạy ứng dụng tự động

- Tạo shortcut `start.bat` và đặt vào thư mục Startup: nhấn `Win + R`, gõ `shell:startup`, dán shortcut vào đó.
- Hoặc dùng **Task Scheduler** → *Create Task* → Trigger *At log on* → Action chạy `start.bat`.

### C2. Cài Cloudflare Tunnel

```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel login
```

Trình duyệt mở ra, chọn tên miền của bạn.

```powershell
cloudflared tunnel create pdf2office
cloudflared tunnel route dns pdf2office pdf.tenmiencuaban.com
```

Lệnh thứ nhất in ra một **UUID**. Tạo file `C:\Users\<TÊN_BẠN>\.cloudflared\config.yml`:

```yaml
tunnel: UUID_VUA_TAO
credentials-file: C:\Users\<TÊN_BẠN>\.cloudflared\UUID_VUA_TAO.json
ingress:
  - hostname: pdf.tenmiencuaban.com
    service: http://127.0.0.1:5000
  - service: http_status:404
```

Chạy thử:

```powershell
cloudflared tunnel run pdf2office
```

Mở `https://pdf.tenmiencuaban.com` để kiểm tra. Nếu ổn, cài thành dịch vụ chạy cùng Windows:

```powershell
cloudflared service install
```

Từ đây website dùng được từ bất kỳ đâu, miễn máy bạn đang bật và có mạng. Nhược điểm: tốc độ tải lên phụ thuộc mạng nhà, máy phải chạy liên tục.

---

## Lưu ý bảo mật & vận hành

- **Luôn dùng HTTPS** (Caddy/Render/Cloudflare đã tự lo). Không công khai cổng 5000 trực tiếp.
- Nếu website công khai, nên bật **basic auth** (cách A7) hoặc chỉ chia sẻ link cho người cần dùng — ai có link đều chuyển đổi được và tiêu tốn CPU của bạn.
- Ứng dụng **không lưu tệp**: mỗi yêu cầu dùng thư mục tạm riêng và xoá ngay sau khi trả kết quả.
- Cập nhật Docker/Python định kỳ: `docker compose build --pull`.
- Dung lượng đĩa: cần dư ít nhất vài GB cho tệp tạm khi chuyển PDF lớn.
- Sao lưu: chỉ cần giữ mã nguồn, `.env` và `deploy/Caddyfile`. Chứng chỉ HTTPS do Caddy tự xin lại.

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
| --- | --- |
| Caddy báo không lấy được chứng chỉ | Kiểm tra bản ghi A đã đúng IP, cổng 80/443 đã mở, DNS đã lan truyền (`nslookup pdf.tenmiencuaban.com`) |
| Trang báo `502 Bad Gateway` | App chưa chạy/không khỏe: `docker compose ps`, `docker compose logs app` |
| `413 Request Entity Too Large` | Tệp vượt giới hạn: tăng `MAX_FILE_MB` trong `.env` **và** `max_size` trong `deploy/Caddyfile` |
| `504 Gateway Timeout` | PDF quá lớn: tăng timeout trong `Caddyfile` và `--timeout` trong `Dockerfile`, hoặc giảm số trang |
| Container bị kill, log `OOMKilled` | Thiếu RAM: nâng gói VPS hoặc giảm `CONVERT_SLOTS`, `RENDER_DPI`, `MAX_PAGES` |
| Sửa code nhưng web không đổi | Chạy lại `docker compose up -d --build` |

## Kiểm tra nhanh sau khi triển khai

```bash
curl -f https://pdf.tenmiencuaban.com/api/health
```

Kết quả mong đợi:

```json
{"maxFileMb":60,"maxPages":300,"ok":true}
```
