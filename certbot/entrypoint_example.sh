#!/bin/sh
set -e

DOMAIN="YOUR_DOMAIN"
CRED_FILE="/etc/cloudflare-creds/cloudflare.ini"

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials "${CRED_FILE}" \
    --dns-cloudflare-propagation-seconds 30 \
    -d "${DOMAIN}" -d "*.${DOMAIN}" \
    --email you@eazevedo.online \
    --agree-tos --no-eff-email --non-interactive
fi

trap exit TERM

while true; do
  certbot renew --dns-cloudflare \
    --dns-cloudflare-credentials "${CRED_FILE}" \
    --dns-cloudflare-propagation-seconds 30
  sleep 12h &
  wait $!
done
