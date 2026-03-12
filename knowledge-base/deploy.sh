#!/bin/bash

# 一键部署脚本 - 拉取代码、构建前端、重启服务

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署 Knowledge Base"
echo "=========================================="

# 1. 进入项目目录
cd /opt/zys/claude-code-cookbook
echo "✓ 进入项目目录"

# 2. 重置 package-lock.json（避免冲突）
git checkout -- knowledge-base/frontend/package-lock.json
echo "✓ 重置 package-lock.json"

# 3. 拉取最新代码
echo "正在拉取最新代码..."
git pull
echo "✓ 代码拉取完成"

# 4. 构建前端
echo "正在构建前端..."
cd knowledge-base/frontend
npm run build
echo "✓ 前端构建完成"

# 5. 重启 PM2 服务
echo "正在重启服务..."
pm2 restart knowledge-base
echo "✓ 服务重启完成"

# 6. 查看服务状态
echo ""
echo "=========================================="
echo "部署完成！当前服务状态："
echo "=========================================="
pm2 status knowledge-base

echo ""
echo "查看日志: pm2 logs knowledge-base"
