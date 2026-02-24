#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_PATH="${SCRIPT_DIR}/privatekey.pem"
EXT_DIR="$(cd "${SCRIPT_DIR}/../projects/webmcp/webmcp-debugger-chrome-extension" && pwd)"

if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Error: privatekey.pem not found at ${KEY_PATH}" >&2
  exit 1
fi

cd "${EXT_DIR}"
node scripts/sign.mjs "${KEY_PATH}"
