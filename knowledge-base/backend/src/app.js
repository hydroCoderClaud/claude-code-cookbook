const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./db/init');
const createAuthRouter = require('./routes/auth');
const createUsersRouter = require('./routes/users');
const createItemsRouter = require('./routes/items');
const createTagsRouter = require('./routes/tags');
const createCommentsRouter = require('./routes/comments');
const createFilesRouter = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 信任代理（Nginx）
app.set('trust proxy', 1);

// 安全：HTTP 头
app.use(helmet({
    contentSecurityPolicy: false, // 如果有前端静态文件需要调整
    crossOriginEmbedderPolicy: false
}));

// 安全：CORS 配置
const corsOptions = {
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:6173', 'http://127.0.0.1:6173'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 安全：请求体大小限制
app.use(express.json({ limit: '1mb' }));

// 安全：全局请求频率限制
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 500, // 每个 IP 最多 500 次请求
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', globalLimiter);

// 安全：登录接口更严格的频率限制（防暴力破解）
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 10, // 每个 IP 最多 10 次登录尝试
    message: { error: '登录尝试过多，请15分钟后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

// 请求日志（生产环境可关闭或使用专业日志库）
if (!isProduction) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 异步初始化并启动
async function start() {
    try {
        console.log('Initializing database...');
        const db = await initDatabase();
        console.log('Database initialized.');

        // 设置路由
        app.use('/api/auth', authLimiter, createAuthRouter(db));
        app.use('/api/users', createUsersRouter(db));
        app.use('/api/items', createItemsRouter(db));
        app.use('/api/tags', createTagsRouter(db));
        app.use('/api/comments', createCommentsRouter(db));
        app.use('/api/files', createFilesRouter(db));

        // 404 处理
        app.use((req, res, next) => {
            if (req.path.startsWith('/api')) {
                res.status(404).json({ error: '接口不存在' });
            } else {
                next();
            }
        });

        // 错误处理
        app.use((err, req, res, next) => {
            console.error('Server error:', err);
            // 生产环境不暴露错误详情
            res.status(500).json({
                error: isProduction ? '服务器内部错误' : err.message
            });
        });

        // 启动服务器
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
        });

        // 优雅关闭
        process.on('SIGINT', () => {
            console.log('\nShutting down...');
            db.close();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
