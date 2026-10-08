#!/bin/sh
set -eu

if [ "${SSH_TUNNEL_ENABLED:-false}" != "true" ]; then
  exec "$@"
fi

: "${SSH_TUNNEL_BASTION_HOST:?Missing SSH_TUNNEL_BASTION_HOST}"
: "${SSH_TUNNEL_PRIVATE_KEY:?Missing SSH_TUNNEL_PRIVATE_KEY}"
: "${SSH_TUNNEL_KNOWN_HOSTS:?Missing SSH_TUNNEL_KNOWN_HOSTS}"

umask 077
tunnel_dir="$(mktemp -d)"
trap 'rm -rf "$tunnel_dir"' 0
printf '%s\n' "$SSH_TUNNEL_PRIVATE_KEY" > "$tunnel_dir/key"
printf '%s\n' "$SSH_TUNNEL_KNOWN_HOSTS" > "$tunnel_dir/known_hosts"
unset SSH_TUNNEL_PRIVATE_KEY SSH_TUNNEL_KNOWN_HOSTS

node - "$tunnel_dir" <<'JS'
const { writeFileSync } = require("node:fs");
try {
  const urlEnv = process.env.SSH_TUNNEL_URL_ENV || "DATABASE_URL_CORE";
  const url = new URL(process.env[urlEnv]);
  const targetPort = url.port || (["postgres:", "postgresql:"].includes(url.protocol) ? "5432" : "");
  const localPort = process.env.SSH_TUNNEL_LOCAL_PORT || "15432";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(urlEnv) || !url.hostname || !targetPort ||
      !/^\d+$/.test(localPort) || Number(localPort) < 1 || Number(localPort) > 65535) {
    throw new Error();
  }
  writeFileSync(`${process.argv[2]}/target`, `${url.hostname}:${targetPort}`);
  url.hostname = "127.0.0.1";
  url.port = localPort;
  writeFileSync(`${process.argv[2]}/url-env`, urlEnv);
  writeFileSync(`${process.argv[2]}/url`, url.toString());
} catch {
  console.error("Invalid tunnel URL or SSH_TUNNEL_LOCAL_PORT (explicit target port required except for PostgreSQL)");
  process.exit(1);
}
JS

target="$(cat "$tunnel_dir/target")"
url_env="$(cat "$tunnel_dir/url-env")"
export "$url_env=$(cat "$tunnel_dir/url")"

ssh -fNT \
  -i "$tunnel_dir/key" \
  -p "${SSH_TUNNEL_BASTION_PORT:-61000}" \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$tunnel_dir/known_hosts" \
  -o ConnectTimeout=10 \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o IdentitiesOnly=yes \
  -L "127.0.0.1:${SSH_TUNNEL_LOCAL_PORT:-15432}:${target}" \
  "bastion@${SSH_TUNNEL_BASTION_HOST}"

rm -rf "$tunnel_dir"
exec "$@"
