#!/bin/bash
# ============================================================
# AI模拟面试系统 - Ubuntu 服务器一键部署脚本
# 使用方法：bash deploy/setup.sh <你的公网IP>
# 示例：   bash deploy/setup.sh 123.45.67.89
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }

if [ -z "$1" ]; then
    echo "用法: bash deploy/setup.sh <你的服务器公网IP>"
    echo "示例: bash deploy/setup.sh 123.45.67.89"
    exit 1
fi

PUBLIC_IP="$1"
DOMAIN="${PUBLIC_IP}.nip.io"
PROJECT_DIR="/opt/ai-interview"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# ==========================================================
# 1. 系统更新 & 安装依赖
# ==========================================================
log "1/6  更新系统并安装依赖..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv nginx certbot python3-certbot-nginx curl wget

# ==========================================================
# 2. 创建项目目录 & 复制代码
# ==========================================================
log "2/6  部署项目代码到 ${PROJECT_DIR}..."
mkdir -p "${PROJECT_DIR}"
cp -r "${REPO_DIR}/backend"   "${PROJECT_DIR}/"
cp -r "${REPO_DIR}/frontend"  "${PROJECT_DIR}/"
cp -r "${REPO_DIR}/data"      "${PROJECT_DIR}/"
cp    "${REPO_DIR}/run.py"    "${PROJECT_DIR}/"
cp    "${REPO_DIR}/deploy/nginx.conf" "${PROJECT_DIR}/nginx.conf"

mkdir -p "${PROJECT_DIR}/logs"
mkdir -p "${PROJECT_DIR}/data/resumes"

# ==========================================================
# 3. 安装 Python 依赖
# ==========================================================
log "3/6  安装 Python 依赖..."
pip3 install --break-system-packages -r "${PROJECT_DIR}/backend/requirements.txt" -i https://pypi.tuna.tsinghua.edu.cn/simple

# ==========================================================
# 4. 配置环境变量
# ==========================================================
log "4/6  配置环境变量..."

if [ ! -f "${PROJECT_DIR}/.env" ]; then
    warn "未找到 .env 文件，请手动填写以下内容后保存到 ${PROJECT_DIR}/.env"
    echo ""
    echo "  DEEPSEEK_API_KEY=你的DeepSeek API密钥"
    echo "  JWT_SECRET_KEY=$(openssl rand -hex 32)"
    echo "  SMTP_HOST=smtp.qq.com"
    echo "  SMTP_PORT=465"
    echo "  SMTP_USER=你的QQ邮箱@qq.com"
    echo "  SMTP_PASSWORD=你的QQ邮箱SMTP授权码"
    echo "  ALLOWED_ORIGINS=https://${DOMAIN}"
    echo "  HOST=127.0.0.1"
    echo "  PORT=8000"
    echo ""
    read -p "是否现在输入配置？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "DeepSeek API Key: " DEEPSEEK_KEY
        read -p "QQ邮箱地址: " QQ_EMAIL
        read -p "QQ邮箱SMTP授权码: " QQ_PASS

        cat > "${PROJECT_DIR}/.env" << EOF
DEEPSEEK_API_KEY=${DEEPSEEK_KEY}
JWT_SECRET_KEY=$(openssl rand -hex 32)
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=${QQ_EMAIL}
SMTP_PASSWORD=${QQ_PASS}
ALLOWED_ORIGINS=https://${DOMAIN}
HOST=127.0.0.1
PORT=8000
LOG_FILE_ENABLED=true
EOF
        log ".env 文件已创建"
    else
        warn "请稍后手动编辑 ${PROJECT_DIR}/.env，然后继续后续步骤"
    fi
fi

# ==========================================================
# 5. 配置 Nginx
# ==========================================================
log "5/6  配置 Nginx..."

sed -i "s/{YOUR_IP}/${PUBLIC_IP}/g" "${PROJECT_DIR}/nginx.conf"
cp "${PROJECT_DIR}/nginx.conf" /etc/nginx/sites-available/interview
ln -sf /etc/nginx/sites-available/interview /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ==========================================================
# 6. 配置 systemd 服务并启动
# ==========================================================
log "6/6  配置后端服务..."

if [ ! -f "${PROJECT_DIR}/.env" ]; then
    err ".env 文件不存在！请先手动创建 ${PROJECT_DIR}/.env 后再运行："
    echo ""
    echo "  nano ${PROJECT_DIR}/.env"
    echo "  systemctl start interview"
    exit 1
fi

cp "${REPO_DIR}/deploy/interview.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable interview
systemctl start interview

# ==========================================================
# 检查状态
# ==========================================================
echo ""
echo "============================================"
log "部署完成！当前状态："

echo ""
echo "  访问地址："
echo "  HTTP:  http://${DOMAIN}"
echo ""

echo "  服务状态检查："
systemctl is-active nginx     >/dev/null 2>&1 && log "  Nginx:       运行中 ✓" || err "  Nginx:       未运行 ✗"
systemctl is-active interview >/dev/null 2>&1 && log "  面试后端:     运行中 ✓" || err "  面试后端:     未运行 ✗"

echo ""
echo "============================================"
warn "下一步：配置 HTTPS（否则语音功能无法使用）"
echo ""
echo "  运行以下命令获取免费 SSL 证书："
echo "  sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m your@email.com"
echo ""
echo "  获取证书后，编辑 Nginx 配置启用 HTTPS："
echo "  sudo nano /etc/nginx/sites-available/interview"
echo "  取消注释 HTTPS 部分（去掉 # 号），保存后执行："
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  之后即可通过 https://${DOMAIN} 访问，语音功能可用"
echo "============================================"
