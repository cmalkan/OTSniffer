# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=5000 \
    FLASK_DEBUG=0

WORKDIR /app

# Install only Flask
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

# Copy app sources
COPY app.py ./
COPY templates ./templates
COPY static ./static
COPY data ./data

EXPOSE 5000

# Healthcheck using Python stdlib (no curl)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD python - <<'PY' || exit 1
import urllib.request, sys
try:
    with urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=2) as r:
        sys.exit(0 if r.status == 200 else 1)
except Exception:
    sys.exit(1)
PY

# Use Flask’s built-in server for this demo
ENV FLASK_APP=app.py
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
