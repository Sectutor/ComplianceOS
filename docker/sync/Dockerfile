FROM python:3.11-slim
RUN pip install --no-cache-dir --upgrade pip
WORKDIR /app
COPY sync-cisovault-grc.py /app/sync-cisovault-grc.py
RUN chmod +x /app/sync-cisovault-grc.py
CMD ["sh", "-c", "while true; do python3 /app/sync-cisovault-grc.py; echo \"Next sync in 60s...\"; sleep 60; done"]
