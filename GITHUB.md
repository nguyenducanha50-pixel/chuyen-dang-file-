# Đưa dự án lên GitHub và dùng website lâu dài

## Trả lời ngắn

| Việc | GitHub làm được? |
| --- | --- |
| Lưu code, quản lý phiên bản, sao lưu | ✅ Có, miễn phí (kể cả repo riêng tư) |
| Chạy kiểm thử / build tự động | ✅ Có, GitHub Actions miễn phí 2.000 phút/tháng |
| **Chạy website Flask (Python) 24/7** | ❌ **Không** |
| Chạy trang HTML/CSS/JS tĩnh | ✅ Có, qua GitHub Pages |

**GitHub Pages chỉ phục vụ tệp tĩnh** — không chạy được Python, Flask, `pdf2docx`, `python-pptx`. Vì vậy website chuyển đổi PDF của bạn **không thể chạy trực tiếp trên GitHub**.

Cách đúng là: **code nằm trên GitHub → một dịch vụ hosting lấy code từ GitHub và chạy nó**. Có 4 lựa chọn:

| Hosting | Chi phí | Ghi chú |
| --- | --- | --- |
| **VPS + Docker + Caddy** | ~100–300kđ/tháng + tên miền | Ổn định nhất, không giới hạn lượt dùng → xem [DEPLOY.md](DEPLOY.md) mục A |
| **Render** | Gói Standard ~$7–25/tháng | Dễ nhất, deploy thẳng từ GitHub, đã có `render.yaml` |
| **Railway / Fly.io** | Trả theo dùng (~$5–20/tháng) | Cũng deploy thẳng từ GitHub |
| **Máy Windows + Cloudflare Tunnel** | 0đ (cần tên miền) | GitHub chỉ để lưu code → xem [DEPLOY.md](DEPLOY.md) mục C |

> Gói **Free/512 MB** của Render không đủ RAM cho `pdf2docx` khi PDF nhiều trang: web sẽ ngủ sau 15 phút và có thể bị `OOMKilled`. Cần tối thiểu **2 GB RAM**.

---

## 1. Cài Git trên Windows

Mở **PowerShell** và chạy:

```powershell
winget install --id Git.Git -e --source winget
```

Đóng và mở lại PowerShell, kiểm tra:

```powershell
git --version
```

Nếu không dùng được `winget`, tải tại <https://git-scm.com/download/win> (cứ bấm Next, giữ mặc định).

## 2. Tạo repository trống trên GitHub

1. Vào <https://github.com/new>.
2. **Repository name**: `pdf2office` (hoặc tên bạn thích).
3. Chọn **Private** nếu không muốn người khác thấy code.
4. **Không** tick *Add a README file*, **không** chọn *.gitignore*, **không** chọn license.
5. Bấm **Create repository** và copy URL, dạng `https://github.com/tenban/pdf2office.git`.

## 3. Đẩy code lên (tự động)

Trong thư mục dự án, nháy đúp **`push-github.bat`**.

Script sẽ:

1. Khởi tạo Git repository (nếu chưa có).
2. Hỏi tên và email GitHub (chỉ lần đầu).
3. Commit toàn bộ mã nguồn (`.venv` đã được `.gitignore` loại bỏ).
4. Hỏi URL repo vừa tạo và thêm `origin`.
5. Push lên nhánh `main`.

Khi cửa sổ đăng nhập GitHub mở ra, chọn **Sign in with your browser** và cấp quyền. Git Credential Manager sẽ lưu phiên đăng nhập cho các lần sau.

## 4. Đẩy code lên (thủ công)

```powershell
cd "C:\Users\ducn9\Documents\Dự án mặc định\pdf-sang-word-ppt"

git init -b main
git add -A
git commit -m "PDF2Office: chuyen doi PDF sang Word va PowerPoint"
git remote add origin https://github.com/tenban/pdf2office.git
git push -u origin main
```

Nếu GitHub hỏi mật khẩu: **mật khẩu tài khoản không dùng được**. Tạo **Personal Access Token** tại <https://github.com/settings/tokens> (Fine-grained token → quyền *Contents: Read and write* trên repo đó), rồi dán token vào ô mật khẩu.

## 5. Kiểm tra tự động trên GitHub (đã cấu hình sẵn)

Mỗi lần push, GitHub Actions chạy `.github/workflows/ci.yml`:

- Cài Python 3.11 + thư viện, chạy `tests/smoke_test.py` (PDF → DOCX, PPTX ảnh, PPTX chữ, từ chối tệp sai).
- Build thử Docker image.

Xem kết quả ở tab **Actions** của repo. Có thể gắn badge vào README:

```markdown
![CI](https://github.com/tenban/pdf2office/actions/workflows/ci.yml/badge.svg)
```

## 6. Chạy website trên Render (deploy từ GitHub)

1. Đăng ký <https://render.com> bằng tài khoản GitHub.
2. **New** → **Blueprint** → chọn repository `pdf2office` → **Connect**.
3. Render đọc `render.yaml` và tạo web service tên `pdf2office`, health check `/api/health`.
4. Nếu Render hỏi gói, chọn **Standard (2 GB RAM)**. Không chọn Free/Starter.
5. Bấm **Apply** và chờ 5–10 phút cho lần build đầu.
6. Mở domain `https://pdf2office-xxxx.onrender.com` để kiểm tra.
7. Gắn tên miền riêng: **Settings** → **Custom Domains** → thêm `pdf.tenmiencuaban.com`, rồi trỏ bản ghi `CNAME` (hoặc `A` theo hướng dẫn Render hiện ra) tại nhà cung cấp tên miền. Render tự cấp HTTPS.

Từ đây **mỗi lần `git push`**, Render tự build và deploy phiên bản mới (`autoDeploy: true`).

### Railway

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo** → chọn repo.
2. Railway tự nhận `Dockerfile`.
3. **Settings → Resources**: nâng RAM lên 2–4 GB.
4. **Settings → Networking → Generate Domain** (hoặc gắn tên miền riêng).

### Fly.io

```bash
fly launch --dockerfile Dockerfile
fly scale memory 2048
fly deploy
fly certs add pdf.tenmiencuaban.com
```

## 7. Cập nhật website sau này

```powershell
cd "C:\Users\ducn9\Documents\Dự án mặc định\pdf-sang-word-ppt"
git add -A
git commit -m "Mo ta thay doi"
git push
```

- Render/Railway: tự deploy lại sau 1–3 phút.
- VPS (cách A trong `DEPLOY.md`): `git pull` rồi `docker compose up -d --build`.

## 8. Lưu ý

- **Không commit** `.env` (đã nằm trong `.gitignore`), `.venv`, tệp PDF/DOCX sinh ra khi test.
- Repo **Private** vẫn deploy được lên Render/Railway — chỉ cần cấp quyền cho ứng dụng GitHub của họ.
- GitHub giới hạn **100 MB/tệp** và khuyên repo dưới 1 GB. Mã nguồn dự án chỉ vài trăm KB nên không lo.
- Nếu lỡ commit `.venv`, xoá khỏi Git nhưng giữ trên máy:

  ```powershell
  git rm -r --cached .venv
  git commit -m "Bo .venv khoi Git"
  git push
  ```

## 9. Xử lý sự cố

| Lỗi | Cách xử lý |
| --- | --- |
| `git` không nhận lệnh | Cài Git ở mục 1, đóng/mở lại terminal |
| `remote origin already exists` | `git remote set-url origin https://github.com/tenban/pdf2office.git` |
| `src refspec main does not match any` | Chưa có commit: chạy `git add -A` và `git commit -m "init"` |
| `failed to push some refs` | Repo trên GitHub đã có nội dung: `git pull --rebase origin main` rồi `git push` |
| `Support for password authentication was removed` | Dùng Personal Access Token hoặc Git Credential Manager (mục 4) |
| Push quá chậm / quá lớn | Kiểm tra `git count-objects -vH`; chắc chắn `.venv` không bị commit |
| Render báo `Exited with status 137` | Hết RAM: nâng gói lên 2 GB+ hoặc giảm `RENDER_DPI`, `CONVERT_SLOTS`, `MAX_PAGES` |
| Render build lỗi `libgl.so.1` | `Dockerfile` đã cài `libglib2.0-0 libgomp1`; kiểm tra bạn đang deploy đúng `Dockerfile` |
