FROM node:22-bookworm-slim

COPY docker/certs /tmp/corp-certs

RUN set -eu; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates; \
  if [ -d /tmp/corp-certs ]; then \
    i=0; \
    for cert in /tmp/corp-certs/*.crt /tmp/corp-certs/*.pem /tmp/corp-certs/*.cer; do \
      if [ -f "$cert" ]; then \
        cp "$cert" "/usr/local/share/ca-certificates/corp-$i.crt"; \
        i=$((i + 1)); \
      fi; \
    done; \
    if [ "$i" -gt 0 ]; then update-ca-certificates; fi; \
  fi; \
  apt-get update; \
  apt-get install -y --no-install-recommends git openssh-client; \
  rm -rf /var/lib/apt/lists/* /tmp/corp-certs

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p src/workspace \
  && sed -i 's/\r$//' /app/docker/docker-entrypoint.sh \
  && chmod +x /app/docker/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3005

ENTRYPOINT ["/app/docker/docker-entrypoint.sh"]
CMD ["node", "server.js"]
