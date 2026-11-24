"""
Kiểm thử nhanh: tạo một PDF mẫu rồi chạy cả hai chế độ chuyển đổi qua Flask test client.
Chạy:  .venv\\Scripts\\python.exe tests\\smoke_test.py
"""

import io
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

import pymupdf as fitz  # noqa: E402
from docx import Document  # noqa: E402
from pptx import Presentation  # noqa: E402

import app as webapp  # noqa: E402


def _find_font() -> str | None:
    """Tìm font hỗ trợ tiếng Việt trên Windows, Linux (CI) hoặc macOS."""
    candidates = [
        r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    return next((path for path in candidates if os.path.exists(path)), None)


def build_sample_pdf() -> bytes:
    doc = fitz.open()
    font_path = _find_font()
    font = "vn"

    def new_page():
        page = doc.new_page(width=595, height=842)
        if font_path:
            page.insert_font(fontname=font, fontfile=font_path)
        return page

    name = font if font_path else "helv"

    page = new_page()
    page.draw_rect(fitz.Rect(0, 0, 595, 120), color=None, fill=(0.06, 0.09, 0.2))
    page.insert_text((48, 62), "BÁO CÁO CHUYỂN ĐỔI PDF", fontsize=24, fontname=name, color=(1, 1, 1))
    page.insert_text((48, 92), "Tài liệu thử nghiệm PDF2Office", fontsize=12, fontname=name, color=(0.7, 0.8, 1))
    body = (
        "Đây là đoạn văn bản tiếng Việt có đầy đủ dấu, được dùng để kiểm tra việc trích xuất "
        "nội dung sang Word và PowerPoint. Bố cục, cỡ chữ và màu sắc cần được giữ tương đối "
        "chính xác so với bản PDF gốc."
    )
    y = 160
    for line in [
        "1. Giới thiệu chung",
        body,
        "2. Kết quả chính",
        "• Tốc độ chuyển đổi nhanh, ổn định.",
        "• Giữ nguyên bố cục và hình ảnh.",
        "• Hỗ trợ tiếng Việt có dấu.",
    ]:
        page.insert_text((48, y), line[:88], fontsize=13 if line[0].isdigit() else 11, fontname=name)
        y += 26 if line[0].isdigit() else 20

    page.draw_rect(fitz.Rect(48, 380, 547, 460), color=(0.3, 0.4, 0.9), width=1.2)
    page.insert_text((60, 405), "Bảng minh hoạ: Doanh thu 2026", fontsize=12, fontname=name, color=(0.2, 0.3, 0.8))
    page.insert_text((60, 432), "Quý I: 120 triệu  |  Quý II: 180 triệu", fontsize=11, fontname=name)

    page2 = new_page()
    page2.insert_text((48, 80), "PHỤ LỤC", fontsize=20, fontname=name)
    page2.insert_text((48, 120), "Trang thứ hai để kiểm tra chia trang khi chuyển đổi.", fontsize=11, fontname=name)

    data = doc.tobytes()
    doc.close()
    return data


def check_zip(data: bytes, label: str):
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        bad = zf.testzip()
        assert bad is None, f"{label}: hỏng entry {bad}"
        return len(zf.namelist())


def main():
    pdf_bytes = build_sample_pdf()
    print(f"PDF mẫu: {len(pdf_bytes)} bytes")
    client = webapp.app.test_client()

    # 1. Trang chủ
    home = client.get("/")
    assert home.status_code == 200 and b"PDF2Office" in home.data
    print("Trang chủ: OK")

    # 2. Info
    info = client.post(
        "/api/info",
        data={"file": (io.BytesIO(pdf_bytes), "Báo cáo 2026.pdf")},
        content_type="multipart/form-data",
    )
    assert info.status_code == 200, info.data
    print("Info:", info.get_json())

    # 3. PDF -> DOCX
    res = client.post(
        "/api/convert",
        data={"file": (io.BytesIO(pdf_bytes), "Báo cáo 2026.pdf"), "target": "word"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200, res.data[:500]
    docx_bytes = res.data
    print("DOCX:", len(docx_bytes), "bytes |", res.headers.get("X-Download-Name"), "|", res.headers.get("X-Elapsed"), "s")
    check_zip(docx_bytes, "DOCX")
    document = Document(io.BytesIO(docx_bytes))
    texts = [p.text for p in document.paragraphs if p.text.strip()]
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as zf:
        doc_xml = zf.read("word/document.xml").decode("utf-8")
    print("  Số đoạn có nội dung:", len(texts))
    print("  Đoạn đầu:", (texts[0][:80] if texts else ""))
    assert "BÁO CÁO CHUYỂN ĐỔI PDF" in doc_xml, "Thiếu tiêu đề trong DOCX"
    assert "Hỗ trợ tiếng Việt có dấu" in doc_xml, "Thiếu nội dung tiếng Việt trong DOCX"

    # 4. PDF -> PPTX (giữ bố cục)
    res = client.post(
        "/api/convert",
        data={"file": (io.BytesIO(pdf_bytes), "Báo cáo 2026.pdf"), "target": "pptx", "mode": "image"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200, res.data[:500]
    pptx_bytes = res.data
    print("PPTX ảnh:", len(pptx_bytes), "bytes |", res.headers.get("X-Download-Name"))
    check_zip(pptx_bytes, "PPTX")
    prs = Presentation(io.BytesIO(pptx_bytes))
    print("  Số slide:", len(prs.slides), "| kích thước:", round(prs.slide_width / 914400, 2), "x", round(prs.slide_height / 914400, 2), "inch")
    assert len(prs.slides) == 2

    # 5. PDF -> PPTX (văn bản chỉnh sửa)
    res = client.post(
        "/api/convert",
        data={"file": (io.BytesIO(pdf_bytes), "Báo cáo 2026.pdf"), "target": "pptx", "mode": "text"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200, res.data[:500]
    pptx_text = res.data
    print("PPTX chữ:", len(pptx_text), "bytes")
    check_zip(pptx_text, "PPTX-text")
    prs2 = Presentation(io.BytesIO(pptx_text))
    slide_text = " ".join(shape.text_frame.text for shape in prs2.slides[0].shapes if shape.has_text_frame)
    print("  Chữ trên slide 1:", len(slide_text), "ký tự")
    assert "BÁO CÁO" in slide_text.upper(), "Thiếu tiêu đề trong PPTX chữ"

    # 6. Tệp không phải PDF
    res = client.post(
        "/api/convert",
        data={"file": (io.BytesIO(b"hello"), "fake.pdf"), "target": "word"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 400, res.status_code
    print("Từ chối tệp không phải PDF: OK ->", res.get_json()["error"])

    print("\nTẤT CẢ KIỂM THỬ ĐỀU ĐẠT ✓")


if __name__ == "__main__":
    main()
