#!/bin/sh
set -e

# Provide a sensible default to avoid mixed-content and allow runtime overrides.
: "${VITE_API_URL:=https://stg.ems.exasa.net/api}"
: "${VITE_GOOGLE_MAPS_API_KEY:=}"

# Render runtime env file from template
if [ -f /usr/share/nginx/html/runtime-env.js ]; then
  envsubst < /usr/share/nginx/html/runtime-env.js > /tmp/runtime-env.js && mv /tmp/runtime-env.js /usr/share/nginx/html/runtime-env.js
fi

exec nginx -g "daemon off;"
