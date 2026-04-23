#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
  echo "正在安装依赖..."
  npm install
fi

echo "正在启动 ZipVault..."

PORT=3001 node backend/src/index.js &
BACKEND_PID=$!

./node_modules/.bin/vite --host 0.0.0.0 --port 3000 --config frontend/vite.config.js &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

sleep 2
open "http://localhost:3000/"

echo ""
echo "ZipVault 已启动："
echo "前端：http://localhost:3000/"
echo "后端：http://localhost:3001/api"
echo ""
echo "关闭这个窗口即可停止服务。"

wait
