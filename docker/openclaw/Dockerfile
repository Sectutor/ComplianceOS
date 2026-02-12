FROM node:22-alpine
WORKDIR /app
ENV OPENCLAW_PORT=18789
RUN apk add --no-cache curl
RUN npm i -g openclaw@latest
EXPOSE 18789
ENTRYPOINT ["sh","-lc","openclaw gateway run --port ${OPENCLAW_PORT} --verbose"]
