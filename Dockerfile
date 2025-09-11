# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8501

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY streamlit_app.py ./
COPY shodan_client.py ./
COPY .streamlit ./.streamlit
COPY data ./data

EXPOSE 8501

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD python -c "import urllib.request, sys;\n\ntry:\n    r = urllib.request.urlopen('http://127.0.0.1:8501', timeout=2);\n    sys.exit(0 if r.status == 200 else 1)\nexcept Exception:\n    sys.exit(1)"

CMD ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]

