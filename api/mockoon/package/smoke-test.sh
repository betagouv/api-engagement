#!/bin/sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
API_KEY="${API_KEY:-mock-api-key}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

request() {
  method="$1"
  path="$2"
  expected_status="$3"
  output_file="$tmp_dir/response.json"
  body_file="${4:-}"

  if [ -n "$body_file" ]; then
    status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "x-api-key: $API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary "@$body_file")"
  else
    status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "x-api-key: $API_KEY")"
  fi

  if [ "$status" != "$expected_status" ]; then
    echo "KO $method $path: statut $status, attendu $expected_status"
    cat "$output_file"
    exit 1
  fi

  echo "OK $method $path -> $status"
}

request_without_api_key() {
  method="$1"
  path="$2"
  expected_status="$3"
  output_file="$tmp_dir/response.json"
  body_file="${4:-}"

  if [ -n "$body_file" ]; then
    status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      --data-binary "@$body_file")"
  else
    status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path")"
  fi

  if [ "$status" != "$expected_status" ]; then
    echo "KO $method $path sans x-api-key: statut $status, attendu $expected_status"
    cat "$output_file"
    exit 1
  fi

  echo "OK $method $path sans x-api-key -> $status"
}

request_with_authorization_only() {
  method="$1"
  path="$2"
  expected_status="$3"
  output_file="$tmp_dir/response.json"

  status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
    -H "Authorization: Bearer mock-api-key")"

  if [ "$status" != "$expected_status" ]; then
    echo "KO $method $path avec Authorization seul: statut $status, attendu $expected_status"
    cat "$output_file"
    exit 1
  fi

  echo "OK $method $path avec Authorization seul -> $status"
}

request_with_empty_api_key() {
  method="$1"
  path="$2"
  expected_status="$3"
  output_file="$tmp_dir/response.json"

  status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
    -H "x-api-key;")"

  if [ "$status" != "$expected_status" ]; then
    echo "KO $method $path avec x-api-key vide: statut $status, attendu $expected_status"
    cat "$output_file"
    exit 1
  fi

  echo "OK $method $path avec x-api-key vide -> $status"
}

request_with_invalid_api_key() {
  method="$1"
  path="$2"
  expected_status="$3"
  output_file="$tmp_dir/response.json"

  status="$(curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
    -H "x-api-key: invalid-api-key")"

  if [ "$status" != "$expected_status" ]; then
    echo "KO $method $path avec x-api-key invalide: statut $status, attendu $expected_status"
    cat "$output_file"
    exit 1
  fi

  echo "OK $method $path avec x-api-key invalide -> $status"
}

assert_contains() {
  pattern="$1"
  file="$tmp_dir/response.json"
  if ! grep -q "$pattern" "$file"; then
    echo "KO contenu attendu introuvable: $pattern"
    cat "$file"
    exit 1
  fi
}

request GET "/v0/mission" 200
assert_contains '"data"'
assert_contains 'mission-paris-001'

request GET "/v0/mission/search" 200
assert_contains '"hits"'
assert_contains '"facets"'

request GET "/v0/mission/mission-paris-001" 200
assert_contains '"data"'
assert_contains 'mission-paris-001'

request_without_api_key GET "/v0/mission" 401
request_with_authorization_only GET "/v0/mission" 401
request_with_empty_api_key GET "/v0/mission" 401
request_with_invalid_api_key GET "/v0/mission" 401

request POST "/v2/mission" 201 "$SCRIPT_DIR/examples/v2-create-mission.json"
assert_contains '"ok"'
assert_contains 'partner-mission-001'
assert_contains '"places": 3'

request PUT "/v2/mission/partner-mission-001" 200 "$SCRIPT_DIR/examples/v2-update-mission.json"
assert_contains 'partner-mission-001'
assert_contains '"places": 5'

request DELETE "/v2/mission/partner-mission-001" 200
assert_contains '"deletedAt"'

request_without_api_key PUT "/v2/mission/unknown-client-id" 401 "$SCRIPT_DIR/examples/v2-update-mission.json"
request PUT "/v2/mission/unknown-client-id" 404 "$SCRIPT_DIR/examples/v2-update-mission.json"
request_without_api_key DELETE "/v2/mission/unknown-client-id" 401
request DELETE "/v2/mission/unknown-client-id" 404

echo "Smoke test termine avec succes sur $BASE_URL"
