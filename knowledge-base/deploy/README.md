# 部署指南

## 快速部署

### 1. 服务器要求

- Ubuntu 20.04 / 22.04 LTS
- 最低配置：1核 1G 内存
- 开放端口：22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. SSH 密钥配置（如使用私有仓库）

```bash
# 生成密钥（邮箱只是标识，可随意填写）
ssh-keygen -t ed25519 -C "your-email@example.com"

# 一路回车使用默认设置

# 查看公钥
cat ~/.ssh/id_ed25519.pub

# 复制输出内容，添加到 GitHub → Settings → SSH and GPG keys → New SSH key
```

### 3. 运行部署脚本

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/hydroCoderClaud/claude-code-cookbook/main/knowledge-base/deploy/deploy.sh

# 修改配置（编辑 DOMAIN 等变量）
nano deploy.sh

# 添加执行权限
chmod +x deploy.sh

# 运行
./deploy.sh
```

### 4. 选择「完整部署」

脚本会自动：
- 安装 Node.js、Nginx、PM2
- 克隆代码
- 安装依赖
- 打包前端
- 配置 Nginx
- 启动服务

## 手动部署

如果脚本不适用，可手动执行：

```bash
# 1. 安装依赖
sudo apt update
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. 克隆代码
cd /var/www
git clone git@github.com:hydroCoderClaud/claude-code-cookbook.git
cd claude-code-cookbook/knowledge-base

# 3. 后端
cd backend
npm install --production
pm2 start src/app.js --name knowledge-base
pm2 save

# 4. 前端
cd ../frontend
npm install
npm run build

# 5. 配置 Nginx（参考 deploy.sh 中的配置）
sudo nano /etc/nginx/sites-available/knowledge-base
sudo ln -s /etc/nginx/sites-available/knowledge-base /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 升级更新

```bash
# 进入项目目录
cd /你的路径/claude-code-cookbook

# 拉取最新代码
git pull

# 运行部署脚本
cd knowledge-base/deploy
./deploy.sh
# 选择 2. 仅更新代码并重启
```

数据不会丢失，数据库文件 `backend/data/knowledge.db` 不受 git 影响。

## 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs knowledge-base

# 重启服务
pm2 restart knowledge-base

# 停止服务
pm2 stop knowledge-base

# 开机自启
pm2 startup
pm2 save
```

## 账号信息

- 管理员: admin / admin123
- 新用户默认密码: Abc@1234（首次登录需修改）

## 常见问题

### 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000
# 杀死进程
sudo kill -9 <PID>
```

### Nginx 报错
```bash
# 测试配置
sudo nginx -t
# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### PM2 服务异常
```bash
# 删除并重建
pm2 delete knowledge-base
pm2 start src/app.js --name knowledge-base
```
