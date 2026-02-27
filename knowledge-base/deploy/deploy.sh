#!/bin/bash

# ============================================
# HydroCoder 知识库部署脚本
# 适用于 Ubuntu/Debian 服务器
# ============================================

set -e  # 出错时停止执行

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载配置文件
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "请先创建配置文件："
    echo "  cp config.example.sh config.sh"
    echo "  nano config.sh"
    exit 1
fi

# 默认值
APP_NAME="knowledge-base"
REPO_URL="git@github.com:hydroCoderClaud/claude-code-cookbook.git"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/knowledge-base}"
DOMAIN="${DOMAIN:-localhost}"
NODE_VERSION="${NODE_VERSION:-18}"
PORT="${PORT:-3000}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 1. 系统依赖安装
# ============================================
install_dependencies() {
    log_info "安装系统依赖..."

    # 检测包管理器
    if command -v apt &> /dev/null; then
        PKG_MANAGER="apt"
        sudo apt update
        sudo apt install -y curl git nginx
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        sudo dnf install -y curl git nginx
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        sudo yum install -y curl git nginx
    else
        log_error "未找到支持的包管理器 (apt/dnf/yum)"
        exit 1
    fi

    log_info "使用包管理器: $PKG_MANAGER"

    # 安装 Node.js (如果未安装)
    if ! command -v node &> /dev/null; then
        log_info "安装 Node.js ${NODE_VERSION}..."
        if [ "$PKG_MANAGER" = "apt" ]; then
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt install -y nodejs
        else
            # RHEL/CentOS/Euler 系统
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
            sudo $PKG_MANAGER install -y nodejs
        fi
    fi

    # 安装 PM2 (如果未安装)
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        sudo npm install -g pm2
    fi

    # 启动 nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx

    log_info "Node 版本: $(node -v)"
    log_info "NPM 版本: $(npm -v)"
}

# ============================================
# 2. 克隆/更新代码
# ============================================
setup_code() {
    log_info "设置代码目录..."

    if [ -d "$DEPLOY_DIR" ]; then
        log_info "更新代码..."
        cd $DEPLOY_DIR
        git pull
    else
        log_info "克隆代码..."
        sudo mkdir -p $(dirname $DEPLOY_DIR)
        sudo chown $USER:$USER $(dirname $DEPLOY_DIR)
        git clone $REPO_URL $DEPLOY_DIR
        cd $DEPLOY_DIR
    fi

    cd $DEPLOY_DIR/knowledge-base
}

# ============================================
# 3. 后端部署
# ============================================
deploy_backend() {
    log_info "部署后端..."

    cd $DEPLOY_DIR/knowledge-base/backend

    # 安装依赖
    npm install --production

    # 创建数据目录
    mkdir -p data

    # 创建环境变量文件
    if [ ! -f .env ]; then
        log_info "创建 .env 文件..."
        cat > .env << EOF
PORT=${PORT}
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
EOF
    fi

    # 使用 PM2 启动/重启
    if pm2 list | grep -q "$APP_NAME"; then
        log_info "重启后端服务..."
        pm2 restart $APP_NAME
    else
        log_info "启动后端服务..."
        pm2 start src/app.js --name $APP_NAME
        pm2 save

        # 设置开机自启
        sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    fi

    log_info "后端服务状态:"
    pm2 status $APP_NAME
}

# ============================================
# 4. 前端打包
# ============================================
deploy_frontend() {
    log_info "打包前端..."

    cd $DEPLOY_DIR/knowledge-base/frontend

    # 安装依赖
    npm install

    # 修改 API 地址（生产环境）
    # vite.config.js 中的 proxy 只在开发时生效
    # 生产环境通过 nginx 代理

    # 打包
    npm run build

    log_info "前端打包完成: dist/"
}

# ============================================
# 5. Nginx 配置
# ============================================
setup_nginx() {
    log_info "配置 Nginx..."

    # 检测 Nginx 配置目录 (Debian 用 sites-available, RHEL/Euler 用 conf.d)
    if [ -d "/etc/nginx/sites-available" ]; then
        NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
        NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"
        USE_SITES_AVAILABLE=true
    else
        NGINX_CONF="/etc/nginx/conf.d/${APP_NAME}.conf"
        USE_SITES_AVAILABLE=false
    fi

    sudo tee $NGINX_CONF > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # 前端静态文件
    location / {
        root ${DEPLOY_DIR}/knowledge-base/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # API 代理到后端
    location /api {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

    # 启用站点 (仅 Debian 系统需要)
    if [ "$USE_SITES_AVAILABLE" = true ]; then
        sudo ln -sf $NGINX_CONF $NGINX_ENABLED
        sudo rm -f /etc/nginx/sites-enabled/default
    fi

    # 测试配置
    sudo nginx -t

    # 重载 Nginx
    sudo systemctl reload nginx

    log_info "Nginx 配置完成"
}

# ============================================
# 6. SSL 证书（可选）
# ============================================
setup_ssl() {
    log_info "配置 SSL 证书..."

    # 安装 certbot
    if command -v apt &> /dev/null; then
        sudo apt install -y certbot python3-certbot-nginx
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot python3-certbot-nginx
    fi

    # 获取证书
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

    # 自动续期
    sudo systemctl enable certbot-renew.timer 2>/dev/null || sudo systemctl enable certbot.timer 2>/dev/null || true

    log_info "SSL 证书配置完成"
}

# ============================================
# 7. 防火墙配置
# ============================================
setup_firewall() {
    log_info "配置防火墙..."

    # 检测防火墙类型
    if command -v ufw &> /dev/null; then
        sudo ufw allow ssh
        sudo ufw allow 'Nginx Full'
        sudo ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
    else
        log_warn "未检测到防火墙，跳过配置"
    fi

    log_info "防火墙配置完成"
}

# ============================================
# 主函数
# ============================================
main() {
    echo "=========================================="
    echo "  HydroCoder 知识库部署脚本"
    echo "=========================================="
    echo ""

    # root 用户也允许运行

    PS3="请选择操作: "
    options=(
        "完整部署（首次安装）"
        "仅更新代码并重启"
        "仅重启服务"
        "配置 SSL 证书"
        "查看服务状态"
        "查看日志"
        "退出"
    )

    select opt in "${options[@]}"; do
        case $opt in
            "完整部署（首次安装）")
                install_dependencies
                setup_code
                deploy_backend
                deploy_frontend
                setup_nginx
                setup_firewall
                echo ""
                log_info "=========================================="
                log_info "部署完成！"
                log_info "访问地址: http://${DOMAIN}"
                log_info "管理员账号: admin / admin123"
                log_info "=========================================="
                break
                ;;
            "仅更新代码并重启")
                setup_code
                deploy_backend
                deploy_frontend
                sudo systemctl reload nginx
                log_info "更新完成！"
                break
                ;;
            "仅重启服务")
                pm2 restart $APP_NAME
                sudo systemctl reload nginx
                log_info "服务已重启"
                break
                ;;
            "配置 SSL 证书")
                setup_ssl
                break
                ;;
            "查看服务状态")
                echo ""
                log_info "PM2 状态:"
                pm2 status
                echo ""
                log_info "Nginx 状态:"
                sudo systemctl status nginx --no-pager
                break
                ;;
            "查看日志")
                echo ""
                log_info "后端日志 (Ctrl+C 退出):"
                pm2 logs $APP_NAME --lines 50
                break
                ;;
            "退出")
                log_info "退出"
                exit 0
                ;;
            *)
                log_error "无效选项"
                ;;
        esac
    done
}

# 执行主函数
main
