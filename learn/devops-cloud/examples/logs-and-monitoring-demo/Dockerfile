FROM node:24-alpine
WORKDIR /app
COPY app.js .
HEALTHCHECK --interval=2s --timeout=2s --start-period=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1
USER node
CMD ["node", "app.js"]
