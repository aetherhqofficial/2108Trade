#!/usr/bin/env bash
set -euo pipefail

# ── 2108Trade Development Certificate Generator ──────────────────────────
# Generates a self-signed certificate for local HTTPS development.
#
# Output:
#   nginx/certs/2108trade.local.crt  — self-signed certificate (4096-bit RSA)
#   nginx/certs/2108trade.local.key  — private key
#
# The certificate is valid for 365 days and covers localhost + 127.0.0.1.

CERT_DIR="${CERT_DIR:-nginx/certs}"
DAYS_VALID="${DAYS_VALID:-365}"
KEY_SIZE="${KEY_SIZE:-4096}"
DOMAIN="${DOMAIN:-localhost}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ── Pre-flight ────────────────────────────────────────────────────────────
if ! command -v openssl &>/dev/null; then
  log "ERROR: openssl not found. Install openssl."
  exit 1
fi

# ── Generate ──────────────────────────────────────────────────────────────
mkdir -p "$CERT_DIR"

CERT_FILE="${CERT_DIR}/2108trade.local.crt"
KEY_FILE="${CERT_DIR}/2108trade.local.key"

log "Generating self-signed certificate (${KEY_SIZE}-bit RSA, valid ${DAYS_VALID} days)..."

openssl req \
  -x509 \
  -nodes \
  -newkey "rsa:${KEY_SIZE}" \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days "$DAYS_VALID" \
  -subj "/C=US/ST=Development/L=Localhost/O=2108Trade Dev/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:*.${DOMAIN},IP:127.0.0.1" \
  2>&1

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

log "Certificate generated: $CERT_FILE"
log "Private key:          $KEY_FILE"
log ""
log "Add to your browser's trusted certificates to avoid warnings."
log "Remember: this is for development only — never use in production."
