#!/bin/sh
set -eu

SSH_MOUNT=/ssh-mount
SSH_DIR=/root/.ssh

if [ -d "$SSH_MOUNT" ]; then
  rm -rf "$SSH_DIR"
  mkdir -p "$SSH_DIR"
  cp -r "$SSH_MOUNT"/. "$SSH_DIR"/
  chmod 700 "$SSH_DIR"
  chmod 600 "$SSH_DIR"/id_* 2>/dev/null || true
  chmod 644 "$SSH_DIR"/*.pub 2>/dev/null || true

  if [ -f "$SSH_DIR/config" ]; then
    chmod 644 "$SSH_DIR/config"
    sed -i 's|/root/.ssh|/root/.ssh|g' "$SSH_DIR/config"
  fi

  if [ -f "$SSH_DIR/known_hosts" ]; then
    chmod 644 "$SSH_DIR/known_hosts"
  fi
fi

exec "$@"
