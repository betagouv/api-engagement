#!/bin/sh
set -e

if [ -z "$API_URL" ]; then
  echo "WARNING: API_URL is not set, defaulting to http://localhost:4000"
  API_URL="http://localhost:4000"
fi

sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
