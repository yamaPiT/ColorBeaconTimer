#!/usr/bin/env bash
# Cursor クラウドエージェントの install。何度実行しても同じ結果になる。
# python コマンド、DADA の推奨 Python パッケージ、npm test 用の Node 依存と Playwright を用意する。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DEBIAN_FRONTEND=noninteractive

apt_install() {
  sudo apt-get update
  sudo apt-get install -y "$@"
}

if ! command -v python3 >/dev/null 2>&1 || ! python3 -c 'import ensurepip' >/dev/null 2>&1; then
  apt_install python3 python3-pip python3-venv || apt_install python3 python3-pip python3.12-venv
fi

VENV="${HOME}/.local/share/dada-venv"
if [[ ! -x "${VENV}/bin/python" ]]; then
  mkdir -p "$(dirname "${VENV}")"
  python3 -m venv "${VENV}"
fi

"${VENV}/bin/python" -m pip install --upgrade pip
"${VENV}/bin/python" -m pip install \
  janome \
  python-docx \
  openpyxl \
  python-pptx \
  pypdf \
  pdfplumber \
  reportlab \
  pillow \
  lxml

# venv の python は実体が /usr/bin/python3 へのリンクである。
# /usr/local/bin からそのリンクを辿ると、仮想環境のパッケージが見えなくなる。
# そのため python は、仮想環境のインタプリタを直接起動するスクリプトにする。
sudo rm -f /usr/local/bin/python
sudo tee /usr/local/bin/python >/dev/null <<EOF
#!/bin/sh
exec "${VENV}/bin/python" "\$@"
EOF
sudo chmod 755 /usr/local/bin/python
sudo ln -sfn "${VENV}/bin/pip" /usr/local/bin/pip

"${VENV}/bin/python" - <<'PY'
import janome
import docx
import openpyxl
import pptx
import pypdf
import pdfplumber
import reportlab
import PIL
import lxml
print("dada-python-ok", janome.__name__)
PY

if ! command -v npm >/dev/null 2>&1; then
  NODE_VERSION=22.23.4
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | sudo tar -xJ -C /usr/local --strip-components=1 --no-same-owner
fi

npm ci
./node_modules/.bin/playwright install --with-deps chromium
