#!/bin/sh
set -eu

MOCKOON_IMAGE="${MOCKOON_IMAGE:-mockoon/cli:9.6.1}"
MOCKOON_IMAGE_TAR="${MOCKOON_IMAGE_TAR:-mockoon-cli-9.6.1.tar}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
API_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/package"
OUTPUT_DIR="$API_DIR/docs/mockoon"
ARCHIVE_NAME="api-engagement-latest.tar.gz"
ARCHIVE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"

if [ ! -d "$PACKAGE_DIR" ]; then
  echo "Dossier package introuvable: $PACKAGE_DIR" >&2
  exit 1
fi

if [ ! -f "$API_DIR/docs/openapi.yaml" ]; then
  echo "Spec OpenAPI introuvable: $API_DIR/docs/openapi.yaml" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$OUTPUT_DIR"
mkdir -p "$WORK_DIR/mockoon"

cp -R "$PACKAGE_DIR/." "$WORK_DIR/mockoon/"
mkdir -p "$WORK_DIR/mockoon/docs"
cp "$API_DIR/docs/openapi.yaml" "$WORK_DIR/mockoon/docs/openapi.yaml"

docker pull "$MOCKOON_IMAGE"
docker save "$MOCKOON_IMAGE" -o "$WORK_DIR/$MOCKOON_IMAGE_TAR"

tar -czf "$ARCHIVE_PATH" -C "$WORK_DIR" "$MOCKOON_IMAGE_TAR" mockoon

echo "Archive generee: $ARCHIVE_PATH"
