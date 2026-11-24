# PDF2Office — Chuyển PDF sang Word & PowerPoint

[![CI](https://github.com/nguyenducanha50-pixel/chuyen-dang-file-/actions/workflows/ci.yml/badge.svg)](https://github.com/nguyenducanha50-pixel/chuyen-dang-file-/actions/workflows/ci.yml)

Website nội bộ (chạy trên máy của bạn) giúp chuyển **PDF → Word (.docx)** và **PDF → PowerPoint (.pptx)** với giao diện tiếng Việt hiện đại, hỗ trợ kéo–thả nhiều tệp cùng lúc.

- **PDF → Word**: dựng lại đoạn văn, tiêu đề, bảng biểu, hình ảnh và căn lề bằng [`pdf2docx`](https://github.com/ArtifexSoftware/pdf2docx) (PyMuPDF), có cơ chế dự phòng riêng.
- **PDF → PowerPoint**: hai chế độ
  - **Giữ nguyên bố cục** (khuyên dùng): mỗi trang PDF thành một slide ảnh JPEG 200 DPI, kèm **ghi chú (speaker notes)** chứa văn bản của trang.
  - **Văn bản chỉnh sửa được**: trích xuất chữ thành từng khung văn bản, giữ cỡ chữ/màu sắc/căn lề, hình ảnh được đặt đúng vị trí.
- Kéo–thả nhiều tệp, xem trước số trang, theo dõi tiến trình, tải từng tệp hoặc tải tất cả.
- Tệp được xử lý trong thư mục tạm riêng và xoá ngay sau khi trả kết quả.

## 1. Chạy nhanh (Windows)

Yêu cầu: **Python 3.9+** (khuyến nghị 3.11) và có kết nối mạng cho lần cài đặt đầu tiên.

```bat
start.bat
```

Lần đầu, script sẽ tự tạo `.venv`, cài thư viện (1–3 phút) rồi mở trình duyệt tại <http://127.0.0.1:5000>.

Cách khác (PowerShell):

```powershell
.\start.ps1
```

> Nếu Windows chặn script, chạy: `powershell -ExecutionPolicy Bypass -File .\start.ps1`

Hoặc chạy thủ công:

```bash
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe app.py
```

Mở <http://127.0.0.1:5000>.

### Dùng lâu dài trên internet

Muốn mở website 24/7 bằng tên miền riêng (VPS + HTTPS tự động), xem hướng dẫn từng bước tại **[DEPLOY.md](DEPLOY.md)**. Đã có sẵn `Dockerfile`, `docker-compose.yml` và cấu hình Caddy để chỉ cần một lệnh `docker compose up -d --build`.

### Đưa code lên GitHub

Chạy **`push-github.bat`** sau khi đã cài Git, hoặc xem hướng dẫn chi tiết tại **[GITHUB.md](GITHUB.md)**. Lưu ý GitHub Pages **không chạy được Flask/Python** — GitHub dùng để lưu code và chạy kiểm thử tự động, còn website phải chạy trên Render/Railway/VPS (đã cấu hình sẵn `render.yaml` và `Dockerfile`).

### Chia sẻ nhanh bằng link tạm

Chạy **`share-online.bat`** (sau khi `start.bat` đang chạy) để tạo link công khai dạng `https://....trycloudflare.com` qua Cloudflare Tunnel, không cần mở cổng modem. Link chỉ sống khi máy bạn bật và cửa sổ đó còn mở; mỗi lần chạy lại sẽ ra link mới. Muốn link cố định + tự chạy cùng Windows, xem `DEPLOY.md` mục C.

> Link tạm **không có mật khẩu**: ai có link đều chuyển đổi được và dùng CPU/mạng của bạn. Chỉ chia sẻ cho người bạn tin tưởng, hoặc dựng VPS (mục A) rồi bật basic auth.

### Tự chạy cùng Windows (link luôn sẵn sàng)

Chạy **`auto-start.bat`** một lần:

```bat
auto-start.bat
```

Script tạo 2 tác vụ Windows tự chạy mỗi khi bạn đăng nhập:

| Tác vụ | Việc làm |
| --- | --- |
| `PDF2Office Server` | Chạy website ở chế độ ẩn (không hiện cửa sổ đen) |
| `PDF2Office Tunnel` | Tạo link công khai, lưu vào `current-link.txt` |

Sau đó:

- Link hiện tại nằm trong **`current-link.txt`** và shortcut **`PDF2Office Online`** trên Desktop (tự cập nhật mỗi lần link đổi).
- Máy khởi động lại → link mới, shortcut và file tự đổi theo, không cần làm gì.
- Tắt hoàn toàn: chạy **`auto-stop.bat`** (tắt cả website lẫn link công khai).
- Bật lại: chạy **`auto-start.bat`**.

> Link vẫn chỉ sống khi máy bật và có Internet. Nên chỉnh **Power & sleep → Sleep: Never** khi cắm điện để link không bị ngắt. Link không có mật khẩu — chỉ chia sẻ cho người bạn tin tưởng.

## 2. Cấu trúc dự án

```
pdf-sang-word-ppt/
├─ app.py                 # Flask server + toàn bộ logic chuyển đổi
├─ templates/index.html   # giao diện (tiếng Việt)
├─ static/style.css       # giao diện tối, responsive
├─ static/app.js          # kéo–thả, tiến trình, tải kết quả
├─ tests/smoke_test.py    # kiểm thử đầu-cuối với PDF mẫu
├─ .github/workflows/ci.yml # GitHub Actions: test + build Docker
├─ Dockerfile             # image production (gunicorn)
├─ docker-compose.yml     # app + Caddy (HTTPS tự động)
├─ deploy/Caddyfile       # reverse proxy, giới hạn 65 MB, header bảo mật
├─ render.yaml            # blueprint triển khai Render
├─ DEPLOY.md              # hướng dẫn đưa lên VPS / PaaS / Cloudflare Tunnel
├─ GITHUB.md              # hướng dẫn đẩy code lên GitHub và deploy
├─ push-github.bat        # tự động tạo repo, commit và push
├─ share-online.bat       # tạo link công khai tạm thời qua Cloudflare Tunnel
├─ auto-start.bat         # tự chạy website + link công khai khi đăng nhập Windows
├─ auto-stop.bat          # tắt website và link công khai
├─ setup-autostart.ps1    # tạo tác vụ Windows (được auto-start.bat gọi)
├─ tunnel_service.py      # giữ tunnel chạy ngầm, cập nhật current-link.txt
├─ requirements.txt
├─ start.bat / start.ps1
└─ README.md
```

## 3. Cách dùng

1. Mở trang chủ, chọn tab **PDF sang Word** hoặc **PDF sang PowerPoint**.
2. Kéo thả tệp PDF (tối đa 60 MB/tệp, 300 trang/tệp, 20 tệp mỗi lần) hoặc bấm để chọn.
3. Với PowerPoint, chọn chế độ chuyển đổi.
4. Bấm **Chuyển đổi**. Khi hoàn tất, tải tệp ở khung **Kết quả của bạn**.

> Nếu tài liệu là **bản scan** (chữ nằm trong ảnh), Word sẽ chứa hình ảnh trang gốc và PowerPoint nên dùng chế độ *Giữ nguyên bố cục*. Muốn trích xuất chữ từ bản scan cần thêm OCR (ví dụ Tesseract) — chưa được tích hợp sẵn.

## 4. API

Máy chủ chạy tại `http://127.0.0.1:5000`.

| Phương thức | Đường dẫn      | Mô tả                                             |
| ----------- | -------------- | ------------------------------------------------- |
| `GET`       | `/`            | Giao diện web                                     |
| `GET`       | `/api/health`  | Kiểm tra trạng thái, giới hạn tệp                 |
| `POST`      | `/api/info`    | Trả về số trang và khổ giấy của PDF               |
| `POST`      | `/api/convert` | Chuyển đổi, trả về tệp nhị phân để tải xuống      |

### Ví dụ `POST /api/convert`

Các trường `multipart/form-data`:

| Trường   | Giá trị                            | Ghi chú                         |
| -------- | ---------------------------------- | ------------------------------- |
| `file`   | tệp PDF                            | bắt buộc, magic `%PDF-`         |
| `target` | `word` hoặc `pptx`                 | mặc định `word`                 |
| `mode`   | `image` hoặc `text`                | chỉ dùng cho `pptx`, mặc định `image` |

PowerShell:

```powershell
curl.exe -X POST http://127.0.0.1:5000/api/convert `
  -F "file=@bao-cao.pdf" -F "target=pptx" -F "mode=image" `
  -o bao-cao.pptx
```

Python:

```python
import requests

with open("bao-cao.pdf", "rb") as fh:
    res = requests.post(
        "http://127.0.0.1:5000/api/convert",
        files={"file": ("bao-cao.pdf", fh, "application/pdf")},
        data={"target": "word"},
        timeout=300,
    )

res.raise_for_status()
open("bao-cao.docx", "wb").write(res.content)
```

Header phản hồi hữu ích: `Content-Disposition` (tên tệp), `X-Download-Name` (tên đã URL-encode), `X-Elapsed` (giây).

## 5. Tuỳ chỉnh

Các giá trị có thể tuỳ chỉnh bằng biến môi trường (không cần sửa code):

| Biến               | Mặc định | Ý nghĩa                                   |
| ------------------ | -------- | ----------------------------------------- |
| `MAX_FILE_MB`      | `60`     | Kích thước tối đa mỗi tệp                 |
| `MAX_PAGES`        | `300`    | Số trang tối đa mỗi tệp                   |
| `RENDER_DPI`       | `200`    | Độ phân giải ảnh cho slide PowerPoint     |
| `JPEG_QUALITY`     | `88`     | Chất lượng ảnh slide (40–100)             |
| `CONVERT_SLOTS`    | `2`      | Số lượt chuyển đổi song song              |
| `HOST`             | `127.0.0.1` | Địa chỉ lắng nghe (`0.0.0.0` khi chạy container) |
| `PORT`             | `5000`   | Cổng máy chủ                              |

Biến khác:

- `PDF2OFFICE_OPEN=1` — tự mở trình duyệt khi khởi động.
- `FLASK_DEBUG=1` — bật chế độ debug (chỉ dùng khi phát triển).

`MAX_SIDE_INCHES = 13.333` (cạnh dài nhất của slide) vẫn là hằng số trong `app.py`.

## 6. Kiểm thử

```bash
.venv\Scripts\python.exe tests\smoke_test.py
```

Script tạo PDF mẫu tiếng Việt rồi kiểm tra: trang chủ, `/api/info`, PDF→DOCX, PDF→PPTX (ảnh), PDF→PPTX (chữ), và việc từ chối tệp không phải PDF.

## 7. Lưu ý & giới hạn

- **PDF có mật khẩu** cần được mở khoá trước khi tải lên.
- Bố cục phức tạp (nhiều cột, bảng lồng nhau, chữ nghệ thuật) có thể sai lệch nhẹ khi sang Word; chế độ ảnh của PowerPoint luôn giữ đúng 100% hình thức.
- Chế độ **Văn bản chỉnh sửa được** ưu tiên khả năng sửa nội dung nên không bảo toàn tuyệt đối vị trí từng dòng.
- Máy chủ mặc định chỉ lắng nghe `127.0.0.1` để bảo mật. Khi triển khai công khai, hãy đặt sau reverse proxy có HTTPS (Caddy trong `docker-compose.yml`) và cân nhắc bật basic auth theo hướng dẫn ở [DEPLOY.md](DEPLOY.md).
- Mọi tệp tải lên được lưu tạm dưới thư mục temp của hệ điều hành và bị xoá trong khối `finally` ngay khi chuyển đổi xong (kể cả khi lỗi).

## 8. Công nghệ

Flask · PyMuPDF · pdf2docx · python-docx · python-pptx · HTML/CSS/JavaScript thuần (không phụ thuộc CDN) · Docker + Caddy + Gunicorn khi triển khai.
