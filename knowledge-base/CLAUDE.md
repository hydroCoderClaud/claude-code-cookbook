# Knowledge Base - 内部知识库系统

## 项目概述

HydroCoder 知识分享平台，支持链接收藏管理、文章发布和文件下载，具有用户权限管理、评论、标签筛选等功能。

## 技术栈

### 前端
- Vue 3 + Vite
- Pinia (状态管理)
- Vue Router
- Element Plus (UI组件库)
- md-editor-v3 (Markdown编辑器)
- @wangeditor/editor (富文本编辑器)

### 后端
- Node.js + Express
- sql.js (SQLite in-memory，持久化到文件)
- JWT (jsonwebtoken) 认证
- bcryptjs 密码加密
- multer (文件上传)
- helmet + express-rate-limit + xss (安全防护)

## 项目结构

```
knowledge-base/
├── frontend/                    # Vue 3 前端
│   ├── src/
│   │   ├── api/index.js        # API 请求封装
│   │   ├── router/index.js     # 路由配置
│   │   ├── stores/
│   │   │   ├── user.js         # 用户状态
│   │   │   └── knowledge.js    # 知识条目状态
│   │   ├── views/
│   │   │   ├── Login.vue       # 登录页
│   │   │   ├── Home.vue        # 首页/列表(含右侧下载列表)
│   │   │   ├── LinkForm.vue    # 链接表单
│   │   │   ├── ArticleEditor.vue  # 文章编辑器
│   │   │   ├── ArticleView.vue    # 文章阅读
│   │   │   ├── UserManagement.vue # 用户管理(管理员)
│   │   │   └── DownloadCenter.vue # 下载中心
│   │   ├── components/
│   │   │   └── CommentSection.vue # 评论组件
│   │   └── App.vue             # 根组件(含修改密码)
│   └── package.json
│
├── backend/                     # Node.js 后端
│   ├── src/
│   │   ├── app.js              # Express 入口
│   │   ├── db/
│   │   │   ├── init.js         # 数据库初始化
│   │   │   └── schema.sql      # 表结构
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT 验证中间件
│   │   ├── routes/
│   │   │   ├── auth.js         # 认证 API
│   │   │   ├── items.js        # 条目 CRUD
│   │   │   ├── tags.js         # 标签 API
│   │   │   ├── comments.js     # 评论 API
│   │   │   ├── users.js        # 用户管理 API
│   │   │   └── files.js        # 文件上传下载 API
│   │   └── utils/
│   │       └── sanitize.js     # XSS 过滤
│   ├── data/
│   │   ├── knowledge.db        # SQLite 数据库文件
│   │   └── uploads/            # 上传文件存储目录
│   ├── scripts/                # 迁移脚本
│   └── package.json
│
└── package.json                 # 根配置(并行启动前后端)
```

## 开发命令

```bash
# 根目录同时启动前后端
npm run dev

# 单独启动后端
cd backend && npm run dev

# 单独启动前端
cd frontend && npm run dev

# 安装所有依赖
npm run install:all
```

- 前端地址: http://localhost:6173
- 后端地址: http://localhost:3000

## 数据库表结构

- **users**: 用户表 (id, username, password, role, must_change_password, created_at)
- **items**: 知识条目 (id, type, title, url, description, content, content_type, author_id, created_at, updated_at)
- **tags**: 标签表 (id, name)
- **item_tags**: 条目-标签关联 (item_id, tag_id)
- **comments**: 评论表 (id, item_id, user_id, content, created_at)
- **files**: 文件表 (id, filename, original_name, mimetype, size, description, uploader_id, created_at)

## API 端点

### 认证
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户
- `PUT /api/auth/password` - 修改密码

### 条目
- `GET /api/items` - 列表 (支持 ?type, ?tag, ?q, ?time, ?sort, ?page, ?limit)
- `GET /api/items/:id` - 详情
- `POST /api/items` - 创建
- `PUT /api/items/:id` - 更新 (作者或管理员)
- `DELETE /api/items/:id` - 删除 (作者或管理员)

### 标签
- `GET /api/tags` - 所有标签(含使用计数)

### 评论
- `GET /api/comments/item/:itemId` - 条目评论
- `POST /api/comments` - 发表评论
- `DELETE /api/comments/:id` - 删除 (作者或管理员)

### 用户管理 (管理员)
- `GET /api/users` - 用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 修改用户
- `DELETE /api/users/:id` - 删除用户

### 文件管理
- `GET /api/files` - 文件列表 (所有用户可访问)
- `POST /api/files` - 上传文件 (仅管理员，multipart/form-data)
- `GET /api/files/:id/download` - 下载文件 (所有用户可访问)
- `DELETE /api/files/:id` - 删除文件 (仅管理员)

## 账号信息

- **默认管理员**: admin / admin123
- **新用户默认密码**: Abc@1234 (首次登录需修改)

## 密码规则

至少8位，必须包含：大写字母、小写字母、数字、特殊符号

## 权限说明

- **游客**: 可浏览内容、查看文件列表、下载文件
- **普通用户**: 可创建/编辑/删除自己的内容，浏览所有内容，评论任何内容，下载文件
- **管理员**: 额外可管理用户、编辑/删除任何内容、上传/删除文件

## 文件上传限制

- 最大文件大小: 200MB
- 禁止上传的文件类型: .exe, .bat, .cmd, .sh, .php, .jsp, .asp, .aspx
- 文件存储位置: backend/data/uploads/

## 安全措施

- XSS 过滤 (xss库)
- HTTP 安全头 (helmet)
- 请求频率限制 (express-rate-limit)
- JWT Token 认证
- 密码 bcrypt 加密
- 关闭公开注册，管理员添加用户
- 文件上传类型过滤
