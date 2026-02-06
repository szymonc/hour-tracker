#!/bin/sh
set -e
# Resolve API container IP at runtime (Docker DNS)
API_IP=$(getent hosts api 2>/dev/null | awk '{ print $1 }')
if [ -z "$API_IP" ]; then
  echo "Warning: could not resolve 'api', using hostname"
  API_IP="api"
fi
sed -i "s/__API_IP__/$API_IP/g" /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
