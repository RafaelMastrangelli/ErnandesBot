FROM node:22-bookworm-slim

COPY docker/certs/corp-bundle.pem /etc/ssl/corp/corp-bundle.pem

RUN set -eu; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates git openssh-client; \
  mkdir -p /usr/local/share/ca-certificates; \
  awk 'BEGIN{n=0} /BEGIN CERTIFICATE/{n++; file=sprintf("/usr/local/share/ca-certificates/corp-%d.crt", n)} {print > file}' /etc/ssl/corp/corp-bundle.pem; \
  update-ca-certificates; \
  rm -rf /var/lib/apt/lists/*

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/corp/corp-bundle.pem
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

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
