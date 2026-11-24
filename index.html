"""
PDF2Office - Chuyển PDF sang Word (.docx) và PowerPoint (.pptx)

Chạy:  py app.py   (hoặc dùng start.bat / start.ps1)
Mặc định: http://127.0.0.1:5000
"""

from __future__ import annotations

import io
import logging
import os
import re
import shutil
import tempfile
import threading
import time
import traceback
import urllib.parse
import warnings
import webbrowser

warnings.filterwarnings("ignore", message="The `fitz` API is deprecated")

import pymupdf as fitz  # PyMuPDF
from flask import Flask, jsonify, render_template, request, send_file

# ---------------------------------------------------------------------------
# Cấu hình (có thể ghi đè bằng biến môi trường khi triển khai)
# ---------------------------------------------------------------------------

MAX_FILE_MB = max(1, int(os.environ.get("MAX_FILE_MB", "60")))
MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
MAX_PAGES = max(1, int(os.environ.get("MAX_PAGES", "300")))
MAX_SIDE_INCHES = 13.333  # chuẩn slide 16:9
RENDER_DPI = max(72, int(os.environ.get("RENDER_DPI", "200")))
JPEG_QUALITY = min(100, max(40, int(os.environ.get("JPEG_QUALITY", "88"))))
CONVERT_SLOTS = max(1, int(os.environ.get("CONVERT_SLOTS", "2")))

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_BYTES + (2 * 1024 * 1024)
app.json.ensure_ascii = False

# Cấu hình logging trước khi pdf2docx được import, tránh nó ghi đè root logger
# và làm log truy cập của Flask bị in trùng.
logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

# Giới hạn số lượt chuyển đổi chạy song song để không làm treo máy chủ.
_CONVERT_SLOTS = threading.BoundedSemaphore(CONVERT_SLOTS)

_FONT_SERIF = ("times", "georgia", "garamond", "cambria", "serif", "book", "minion")
_FONT_MONO = ("courier", "consolas", "mono", "code")

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


# ---------------------------------------------------------------------------
# Tiện ích
# ---------------------------------------------------------------------------

def _clean_base_name(filename: str) -> str:
    name = os.path.splitext(os.path.basename(filename or "document"))[0]
    name = re.sub(r"[\\/:*?\"<>|\r\n\t]+", " ", name).strip()
    name = re.sub(r"\s+", " ", name)
    return name[:120] or "document"


def _human_error(exc: Exception) -> str:
    msg = str(exc).strip() or exc.__class__.__name__
    return msg[:300]


def _open_pdf(path: str) -> fitz.Document:
    doc = fitz.open(path)
    if doc.needs_pass:
        doc.close()
        raise ValueError("Tệp PDF đang được bảo vệ bằng mật khẩu. Vui lòng mở khóa PDF trước khi chuyển đổi.")
    if doc.page_count == 0:
        doc.close()
        raise ValueError("Tệp PDF không có trang nào.")
    if doc.page_count > MAX_PAGES:
        pages = doc.page_count
        doc.close()
        raise ValueError(f"Tệp PDF có {pages} trang, vượt giới hạn {MAX_PAGES} trang mỗi lần chuyển đổi.")
    return doc


def _font_family(raw: str) -> str:
    name = (raw or "").lower()
    if any(k in name for k in _FONT_SERIF):
        return "Times New Roman"
    if any(k in name for k in _FONT_MONO):
        return "Courier New"
    return "Arial"


def _is_bold(font_name: str, flags: int) -> bool:
    return bool(flags & 16) or any(k in (font_name or "").lower() for k in ("bold", "black", "heavy", "semibold", "demi"))


def _is_italic(font_name: str, flags: int) -> bool:
    return bool(flags & 2) or any(k in (font_name or "").lower() for k in ("italic", "oblique"))


def _rgb(color: int) -> tuple[int, int, int]:
    return ((color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF)


def _norm_text(value: str) -> str:
    """Chuẩn hoá khoảng trắng đặc biệt để tệp Office dễ chỉnh sửa và tìm kiếm."""
    return (
        (value or "")
        .replace("\xa0", " ")
        .replace("\u200b", "")
        .replace("\ufeff", "")
    )


# ---------------------------------------------------------------------------
# PDF -> PPTX
# ---------------------------------------------------------------------------

def _slide_size_for(doc: fitz.Document, unrotated: bool = False) -> tuple[float, float, float]:
    """Trả về (rộng_inch, cao_inch, tỉ_lệ_phóng) theo trang đầu tiên."""
    rect = doc[0].mediabox if unrotated else doc[0].rect
    pw, ph = max(rect.width, 1.0) / 72.0, max(rect.height, 1.0) / 72.0
    scale = MAX_SIDE_INCHES / max(pw, ph)
    return pw * scale, ph * scale, scale


def _fit_rect(img_w: float, img_h: float, box_w: float, box_h: float) -> tuple[float, float, float, float]:
    """Căn giữa ảnh trong khung, giữ nguyên tỉ lệ. Trả về (left, top, width, height) theo inch."""
    if img_w <= 0 or img_h <= 0:
        return 0.0, 0.0, box_w, box_h
    ratio = min(box_w / img_w, box_h / img_h)
    w, h = img_w * ratio, img_h * ratio
    return (box_w - w) / 2.0, (box_h - h) / 2.0, w, h


def _ppt_image_mode(doc: fitz.Document, out_path: str, workdir: str) -> None:
    """Mỗi trang PDF thành một slide ảnh, giữ nguyên 100% bố cục."""
    from pptx import Presentation
    from pptx.util import Inches

    slide_w, slide_h, _ = _slide_size_for(doc)
    prs = Presentation()
    prs.slide_width = Inches(slide_w)
    prs.slide_height = Inches(slide_h)
    blank = prs.slide_layouts[6]

    zoom = RENDER_DPI / 72.0
    for index, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        img_path = os.path.join(workdir, f"page-{index:04d}.jpg")
        pix.save(img_path, jpg_quality=JPEG_QUALITY)

        slide = prs.slides.add_slide(blank)
        left, top, w, h = _fit_rect(pix.width, pix.height, slide_w, slide_h)
        slide.shapes.add_picture(img_path, Inches(left), Inches(top), Inches(w), Inches(h))

        text = _norm_text(page.get_text("text")).strip()
        if text:
            notes = slide.notes_slide.notes_text_frame
            notes.text = text[:4000]

    prs.save(out_path)


def _ppt_text_mode(doc: fitz.Document, out_path: str, workdir: str) -> None:
    """Mỗi trang thành slide với văn bản/hình ảnh có thể chỉnh sửa."""
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
    from pptx.util import Emu, Inches, Pt

    slide_w, slide_h, scale = _slide_size_for(doc, unrotated=True)
    slide_w_emu = Inches(slide_w)
    slide_h_emu = Inches(slide_h)
    prs = Presentation()
    prs.slide_width = slide_w_emu
    prs.slide_height = slide_h_emu
    blank = prs.slide_layouts[6]

    for index, page in enumerate(doc):
        # Toạ độ văn bản của PyMuPDF là theo trang chưa xoay, nên bỏ góc xoay
        # để khung chữ và hình ảnh khớp đúng vị trí.
        if page.rotation:
            page.set_rotation(0)

        slide = prs.slides.add_slide(blank)
        page_w = max(page.rect.width, 1.0)
        page_h = max(page.rect.height, 1.0)
        box = _fit_rect(page_w, page_h, slide_w_emu, slide_h_emu)
        off_x, off_y, draw_w, draw_h = box
        kx = draw_w / page_w
        ky = draw_h / page_h

        def px(v: float) -> int:
            return int(round(off_x + v * kx))

        def py(v: float) -> int:
            return int(round(off_y + v * ky))

        data = page.get_text("dict")
        blocks = [b for b in data.get("blocks", []) if b.get("bbox")]

        image_blocks = [b for b in blocks if b.get("type") == 1]
        text_blocks = [b for b in blocks if b.get("type") == 0]

        # 1) Hình ảnh trước để làm nền.
        for i, block in enumerate(image_blocks):
            try:
                x0, y0, x1, y1 = block["bbox"]
                w, h = max(x1 - x0, 1), max(y1 - y0, 1)
                stream = page.get_pixmap(clip=fitz.Rect(x0, y0, x1, y1), matrix=fitz.Matrix(2, 2), alpha=False)
                img_path = os.path.join(workdir, f"img-{index:04d}-{i:03d}.jpg")
                stream.save(img_path, jpg_quality=JPEG_QUALITY)
                slide.shapes.add_picture(img_path, px(x0), py(y0), px(x0 + w) - px(x0), py(y0 + h) - py(y0))
            except Exception:
                continue

        # 2) Văn bản.
        for block in text_blocks:
            spans_meta = []
            lines_text = []
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                line_text = "".join(s.get("text", "") for s in spans).strip()
                if not line_text:
                    continue
                lines_text.append(_norm_text(line_text))
                spans_meta.append(spans)
            if not spans_meta:
                continue

            all_spans = [s for line in spans_meta for s in line if s.get("text", "").strip()]
            if not all_spans:
                continue

            base_span = max(all_spans, key=lambda s: s.get("size", 0))
            size_pt = float(base_span.get("size", 11)) * scale
            size_pt = max(5.0, min(size_pt, 120.0))

            x0, y0, x1, y1 = block["bbox"]
            bw = max(x1 - x0, 4.0)
            bh = max(y1 - y0, size_pt / scale * 1.2)

            shape = slide.shapes.add_textbox(px(x0), py(y0), max(px(x0 + bw) - px(x0), 10000), max(py(y0 + bh) - py(y0), 10000))
            tf = shape.text_frame
            tf.word_wrap = True
            tf.auto_size = MSO_AUTO_SIZE.NONE
            tf.vertical_anchor = MSO_ANCHOR.TOP
            tf.margin_left = 0
            tf.margin_right = 0
            tf.margin_top = 0
            tf.margin_bottom = 0

            block_center = (x0 + x1) / 2.0
            centered = abs(block_center - page_w / 2.0) < page_w * 0.025 and bw < page_w * 0.92

            single_line = len(lines_text) <= 1
            short_lines = [ln for ln in lines_text if len(ln) <= 70]
            as_list = (not single_line) and len(short_lines) == len(lines_text) and len(lines_text) >= 2

            paragraphs = lines_text if as_list else [" ".join(lines_text)]
            for p_index, p_text in enumerate(paragraphs):
                para = tf.paragraphs[0] if p_index == 0 else tf.add_paragraph()
                para.level = 0
                para.space_before = Pt(0)
                para.space_after = Pt(2 if as_list else 0)
                para.line_spacing = 1.05
                if centered:
                    para.alignment = PP_ALIGN.CENTER

                span = all_spans[min(p_index, len(all_spans) - 1)] if as_list else base_span
                run = para.add_run()
                run.text = p_text
                font = run.font
                font.size = Pt(size_pt)
                font.name = _font_family(span.get("font", ""))
                font.bold = _is_bold(span.get("font", ""), span.get("flags", 0))
                font.italic = _is_italic(span.get("font", ""), span.get("flags", 0))
                try:
                    r, g, b = _rgb(int(span.get("color", 0)))
                    font.color.rgb = RGBColor(r, g, b)
                except Exception:
                    pass

        text = _norm_text(page.get_text("text")).strip()
        if text:
            slide.notes_slide.notes_text_frame.text = text[:4000]

    prs.save(out_path)


def convert_pdf_to_pptx(pdf_path: str, out_path: str, workdir: str, mode: str = "image") -> None:
    doc = _open_pdf(pdf_path)
    try:
        if mode == "text":
            _ppt_text_mode(doc, out_path, workdir)
        else:
            _ppt_image_mode(doc, out_path, workdir)
    finally:
        doc.close()


# ---------------------------------------------------------------------------
# PDF -> DOCX
# ---------------------------------------------------------------------------

def _docx_fallback(doc: fitz.Document, out_path: str, workdir: str) -> None:
    """Phương án dự phòng khi pdf2docx không xử lý được: dựng lại văn bản + hình ảnh."""
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Emu, Inches, Pt, RGBColor

    document = Document()
    section = document.sections[0]
    rect = doc[0].mediabox
    section.page_width = Inches(min(max(rect.width / 72.0, 5), 30))
    section.page_height = Inches(min(max(rect.height / 72.0, 5), 30))
    section.left_margin = Inches(0.6)
    section.right_margin = Inches(0.6)
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)

    body_size = 11.0
    sizes = []
    for page in doc:
        for block in page.get_text("dict").get("blocks", []):
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("text", "").strip():
                            sizes.append(float(span.get("size", 11)))
    if sizes:
        sizes.sort()
        body_size = sizes[len(sizes) // 2] or 11.0

    for p_index, page in enumerate(doc):
        if p_index > 0:
            document.add_page_break()
        if page.rotation:
            page.set_rotation(0)

        page_w = max(page.rect.width, 1.0)
        content_w = Emu(
            int(section.page_width) - int(section.left_margin) - int(section.right_margin)
        )
        content_w_in = content_w.inches

        blocks = [b for b in page.get_text("dict").get("blocks", []) if b.get("bbox")]
        blocks.sort(key=lambda b: (round(b["bbox"][1], 1), b["bbox"][0]))

        for b_i, block in enumerate(blocks):
            x0, y0, x1, y1 = block["bbox"]
            if block.get("type") == 1:
                try:
                    pix = page.get_pixmap(clip=fitz.Rect(x0, y0, x1, y1), matrix=fitz.Matrix(2, 2), alpha=False)
                    img_path = os.path.join(workdir, f"w-{p_index:04d}-{b_i:03d}.jpg")
                    pix.save(img_path, jpg_quality=JPEG_QUALITY)
                    width_in = min(max((x1 - x0) / 72.0 * (content_w_in / (page_w / 72.0)), 0.8), content_w_in)
                    document.add_picture(img_path, width=Inches(width_in))
                except Exception:
                    continue
                continue

            lines = []
            for line in block.get("lines", []):
                spans = [s for s in line.get("spans", []) if s.get("text", "").strip()]
                if not spans:
                    continue
                text = "".join(s.get("text", "") for s in spans).strip()
                if text:
                    lines.append((_norm_text(text), spans))
            if not lines:
                continue

            all_spans = [s for _, spans in lines for s in spans]
            bold_all = all(_is_bold(s.get("font", ""), s.get("flags", 0)) for s in all_spans)
            italic_all = all(_is_italic(s.get("font", ""), s.get("flags", 0)) for s in all_spans)
            main_span = max(all_spans, key=lambda s: s.get("size", 0))
            size = float(main_span.get("size", body_size))

            text = " ".join(t for t, _ in lines)
            para = document.add_paragraph()
            para.paragraph_format.space_after = Pt(4)
            para.paragraph_format.line_spacing = 1.15
            if abs((x0 + x1) / 2.0 - page_w / 2.0) < page_w * 0.03 and (x1 - x0) < page_w * 0.9:
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER

            if size >= body_size * 1.45:
                para.style = document.styles["Heading 1"]
            elif size >= body_size * 1.18:
                para.style = document.styles["Heading 2"]

            run = para.add_run(text)
            run.font.name = _font_family(main_span.get("font", ""))
            run.font.size = Pt(round(size, 1))
            run.font.bold = bold_all
            run.font.italic = italic_all
            try:
                r, g, b = _rgb(int(main_span.get("color", 0)))
                if (r, g, b) != (0, 0, 0):
                    run.font.color.rgb = RGBColor(r, g, b)
            except Exception:
                pass

    document.save(out_path)


def convert_pdf_to_word(pdf_path: str, out_path: str, workdir: str) -> None:
    doc = _open_pdf(pdf_path)
    try:
        error = None
        try:
            from pdf2docx import Converter

            cv = Converter(pdf_path)
            try:
                cv.convert(out_path)
            finally:
                cv.close()
        except Exception as exc:  # pdf2docx khá "khó tính" với một số PDF
            error = exc
            if os.path.exists(out_path):
                os.remove(out_path)

        if error is not None or not os.path.exists(out_path) or os.path.getsize(out_path) < 1024:
            _docx_fallback(doc, out_path, workdir)
    finally:
        doc.close()


# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html", max_mb=MAX_FILE_MB, max_pages=MAX_PAGES)


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "maxFileMb": MAX_FILE_MB, "maxPages": MAX_PAGES})


@app.route("/api/info", methods=["POST"])
def info():
    """Trả về số trang + khổ giấy để hiển thị trong danh sách tệp."""
    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"ok": False, "error": "Không nhận được tệp."}), 400

    tmp_path = None
    try:
        tmp_path = _save_upload(file)
        doc = _open_pdf(tmp_path)
        try:
            first = doc[0].rect
            return jsonify(
                {
                    "ok": True,
                    "pages": doc.page_count,
                    "width": round(first.width / 72, 2),
                    "height": round(first.height / 72, 2),
                }
            )
        finally:
            doc.close()
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception:
        return jsonify({"ok": False, "error": "Không đọc được tệp PDF này."}), 400
    finally:
        if tmp_path:
            _safe_remove(tmp_path)


def _save_upload(file) -> str:
    head = file.stream.read(5)
    file.stream.seek(0)
    if head != b"%PDF-":
        raise ValueError("Tệp tải lên không phải PDF hợp lệ.")

    fd, path = tempfile.mkstemp(suffix=".pdf", prefix="upload-")
    os.close(fd)
    file.save(path)
    if os.path.getsize(path) > MAX_FILE_BYTES:
        _safe_remove(path)
        raise ValueError(f"Tệp vượt quá {MAX_FILE_MB} MB.")
    return path


def _safe_remove(path: str) -> None:
    try:
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)
        elif os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


@app.route("/api/convert", methods=["POST"])
def convert():
    file = request.files.get("file")
    target = (request.form.get("target") or "word").lower()
    mode = (request.form.get("mode") or "image").lower()

    if file is None or not file.filename:
        return jsonify({"ok": False, "error": "Không nhận được tệp."}), 400
    if target not in ("word", "pptx"):
        return jsonify({"ok": False, "error": "Định dạng đích không hợp lệ."}), 400
    if mode not in ("image", "text"):
        mode = "image"

    workdir = tempfile.mkdtemp(prefix="pdf2office-")
    pdf_path = None
    started = time.time()

    try:
        pdf_path = _save_upload(file)
        base = _clean_base_name(file.filename)

        if target == "word":
            out_path = os.path.join(workdir, "output.docx")
            acquired = _CONVERT_SLOTS.acquire(timeout=180)
            if not acquired:
                return jsonify({"ok": False, "error": "Máy chủ đang bận, vui lòng thử lại sau ít phút."}), 503
            try:
                convert_pdf_to_word(pdf_path, out_path, workdir)
            finally:
                _CONVERT_SLOTS.release()
            download_name = f"{base}.docx"
            mime = DOCX_MIME
        else:
            out_path = os.path.join(workdir, "output.pptx")
            acquired = _CONVERT_SLOTS.acquire(timeout=180)
            if not acquired:
                return jsonify({"ok": False, "error": "Máy chủ đang bận, vui lòng thử lại sau ít phút."}), 503
            try:
                convert_pdf_to_pptx(pdf_path, out_path, workdir, mode)
            finally:
                _CONVERT_SLOTS.release()
            download_name = f"{base}.pptx"
            mime = PPTX_MIME

        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            raise RuntimeError("Không tạo được tệp kết quả.")

        with open(out_path, "rb") as fh:
            payload = fh.read()

        response = send_file(
            io.BytesIO(payload),
            mimetype=mime,
            as_attachment=True,
            download_name=download_name,
            max_age=0,
        )
        response.headers["X-Elapsed"] = f"{time.time() - started:.2f}"
        response.headers["X-Download-Name"] = urllib.parse.quote(download_name)
        response.headers["Cache-Control"] = "no-store"
        return response

    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except MemoryError:
        return jsonify({"ok": False, "error": "Tệp quá lớn để xử lý. Vui lòng thử PDF ít trang hơn."}), 500
    except Exception as exc:
        traceback.print_exc()
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Chuyển đổi thất bại: " + _human_error(exc),
                }
            ),
            500,
        )
    finally:
        if pdf_path:
            _safe_remove(pdf_path)
        _safe_remove(workdir)


@app.errorhandler(413)
def too_large(_):
    return jsonify({"ok": False, "error": f"Tệp vượt quá giới hạn {MAX_FILE_MB} MB."}), 413


@app.errorhandler(404)
def not_found(_):
    if request.path.startswith("/api/"):
        return jsonify({"ok": False, "error": "Không tìm thấy API."}), 404
    return render_template("index.html", max_mb=MAX_FILE_MB, max_pages=MAX_PAGES), 404


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1").strip() or "127.0.0.1"
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    url = f"http://127.0.0.1:{port}"
    print("\n  PDF2Office đang chạy tại: %s  (bind %s:%d)\n" % (url, host, port))
    if os.environ.get("PDF2OFFICE_OPEN") == "1":
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    app.run(host=host, port=port, debug=debug, threaded=True)
