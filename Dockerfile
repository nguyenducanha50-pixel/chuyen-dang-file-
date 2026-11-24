FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Thư viện hệ thống cần cho OpenCV (pdf2docx) trên Linux.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn==23.0.0

COPY app.py ./
COPY templates ./templates
COPY static ./static

ENV HOST=0.0.0.0 \
    PORT=5000

EXPOSE 5000

# Dùng shell form để đọc được $PORT do Render/Railway cấp.
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers ${WEB_CONCURRENCY:-1} --threads 4 --timeout 900 --access-logfile - --error-logfile - app:app"]
