FROM python:3.11-slim

RUN apt-get update && apt-get install -y socat tmux netcat-openbsd curl nodejs npm git jq && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir hermes-agent

RUN mkdir -p /app/profile/skills/grcompliance /app/skills/grcompliance /usr/local/lib/python3.11/site-packages/ui-tui

COPY profile/ /app/profile/
COPY start-gateway.sh /app/start-gateway.sh
COPY skills/ /app/skills/
COPY bridge.py /app/bridge.py
COPY custom-branding.css /app/custom-branding.css
COPY custom-branding.js /app/custom-branding.js
COPY rebrand.py /app/rebrand.py
COPY logo.png /app/logo.png

RUN chmod +x /app/start-gateway.sh

ENV HERMES_HOME=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 9090 9119
CMD ["/app/start-gateway.sh"]
